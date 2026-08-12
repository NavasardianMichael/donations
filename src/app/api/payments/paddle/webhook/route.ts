import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import {
  PADDLE_EVENT,
  PADDLE_STATUS,
  readTransaction,
  verifyWebhookSignature,
  type PaddleWebhookEvent,
} from "@/lib/payments/paddle";
import { prisma } from "@/lib/prisma";
import {
  notifyCreatorOfDonation,
  sendDonationReceipt,
} from "@/server/actions/receipts";

/**
 * Paddle's server-to-server notification — how an international donation is
 * actually confirmed.
 *
 * Unlike ArCa, Paddle has no status endpoint we poll on the donor's return
 * journey; the overlay closes in the browser and the truth arrives here,
 * out-of-band. That makes the signature everything: an unsigned body is an
 * anonymous stranger claiming a donation succeeded. Nothing is read out of the
 * payload until `verifyWebhookSignature` has passed.
 *
 * If a delivery is missed anyway — Paddle stops retrying eventually, and a
 * deploy can drop one mid-flight — the reconcile sweep
 * (`/api/cron/reconcile-donations`) resolves the row later from Paddle's own
 * transaction record.
 */

// `node:crypto` for the HMAC, so this cannot run on the edge runtime.
export const runtime = "nodejs";
// A webhook is never cacheable, and must never be prerendered.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // The raw BYTES, read before anything parses them. `request.json()` first
  // would consume the stream and, worse, re-serialising the parsed object
  // produces different bytes — every signature would fail.
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("paddle-signature") ?? "";

  const verification = verifyWebhookSignature(rawBody, signature);
  if (!verification.valid) {
    // Logged with the reason but not echoed to the caller: a stranger probing
    // this endpoint learns nothing about why they failed.
    console.error("Paddle webhook rejected:", verification.reason);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString("utf8")) as PaddleWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventType = event.event_type;
  const isCompleted = eventType === PADDLE_EVENT.TRANSACTION_COMPLETED;
  const isFailed =
    eventType === PADDLE_EVENT.TRANSACTION_PAYMENT_FAILED ||
    eventType === PADDLE_EVENT.TRANSACTION_CANCELED;

  // Acknowledge anything we do not subscribe to. A non-2xx would make Paddle
  // retry an event we are never going to act on.
  if (!isCompleted && !isFailed) {
    return NextResponse.json({ ignored: eventType ?? "unknown" });
  }

  if (!event.data) {
    console.error(`Paddle webhook ${eventType}: no data object`);
    return NextResponse.json({ error: "missing data" }, { status: 400 });
  }

  const transaction = readTransaction(event.data);
  const donationId = transaction.donationId;

  if (!donationId) {
    // Without `custom_data.donation_id` there is nothing to attribute this to.
    // Still a 200: retrying will not make the field appear.
    console.error(
      `Paddle webhook ${eventType}: missing custom_data.donation_id on ${event.data.id ?? "unknown"}`,
    );
    return NextResponse.json({ error: "unattributable" });
  }

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { page: { select: { slug: true } } },
  });

  if (!donation) {
    console.error(`Paddle webhook ${eventType}: donation ${donationId} not found`);
    return NextResponse.json({ error: "unknown donation" });
  }

  // Guard against a donation id from `custom_data` pointing at an ArCa row —
  // the field is signed, so this is defence against our own bugs rather than an
  // attacker, but resolving an ArCa donation from a Paddle event would corrupt
  // it either way.
  if (donation.provider !== "PADDLE") {
    console.error(
      `Paddle webhook ${eventType}: donation ${donationId} belongs to ${donation.provider}`,
    );
    return NextResponse.json({ error: "provider mismatch" });
  }

  // Already settled — a replayed or duplicated delivery. Paddle sends the same
  // event more than once by design, so this is the normal path, not an error.
  if (donation.status === "SUCCEEDED" || donation.status === "FAILED") {
    return NextResponse.json({ ok: true, alreadyResolved: donation.status });
  }

  if (isFailed) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: "FAILED",
        failureCode: eventType ?? "payment_failed",
        failureMessage: `Paddle reported ${transaction.status}`,
      },
    });
    return NextResponse.json({ ok: true, status: "FAILED" });
  }

  // `transaction.completed` fires only once Paddle has the money. Re-checking
  // the status inside the payload costs nothing and refuses to credit a
  // donation on an event whose own body disagrees with its type.
  if (transaction.status !== PADDLE_STATUS.COMPLETED) {
    console.error(
      `Paddle webhook ${eventType}: status is ${transaction.status}, not completed`,
    );
    return NextResponse.json({ ignored: "status not completed" });
  }

  await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: "SUCCEEDED",
      completedAt: new Date(),
      // Paddle never exposes a full PAN. The last four is all there is, and it
      // goes in the same column ArCa's mask uses so receipts stay one template.
      cardMask: transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : null,
      approvalCode: donation.providerOrderId,
    },
  });

  revalidatePath(`/d/${donation.page.slug}`);
  revalidatePath(`/embed/${donation.page.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/pages");

  // Best effort: a failed receipt must never undo a real payment, and must
  // never turn into a non-2xx that makes Paddle redeliver the whole event —
  // which would send the donor a second copy of everything that did work.
  const full = await prisma.donation.findUnique({
    where: { id: donation.id },
    include: { page: { include: { user: true } } },
  });
  if (full) {
    await Promise.allSettled([
      sendDonationReceipt(full),
      notifyCreatorOfDonation(full),
    ]);
  }

  return NextResponse.json({ ok: true, status: "SUCCEEDED" });
}
