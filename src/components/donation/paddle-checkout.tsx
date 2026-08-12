"use client";

import { initializePaddle } from "@paddle/paddle-js";
import { useEffect, useRef, useState } from "react";

import type { PaddleEventData } from "@paddle/paddle-js";

import { Button, Card, CardContent, Heading, Spinner, Text } from "@/components/ui";

export interface PaddleCheckoutLabels {
  title: string;
  body: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
}

export interface PaddleCheckoutProps {
  /** Paddle's `txn_…`, taken from the `_ptxn` parameter Paddle appended. */
  transactionId: string;
  /** Browser-safe token. Passed as a prop, not inlined from NEXT_PUBLIC_. */
  clientToken: string;
  environment: "sandbox" | "production";
  /** Resolved server-side — never built here from untrusted input. */
  thankYouUrl: string;
  cancelUrl: string;
  labels: PaddleCheckoutLabels;
}

/**
 * Opens Paddle's overlay checkout.
 *
 * Loading Paddle.js on a page whose URL carries `?_ptxn=txn_…` is the whole
 * mechanism: Paddle detects the parameter and opens the overlay itself. That is
 * why nothing here calls `.open()`, and why the transaction must already exist
 * — it was created server-side by `createCheckoutAction`, which is also the only
 * place the secret API key is ever used.
 *
 * Neither event below is treated as proof of payment. `checkout.completed`
 * only decides where to navigate; the donation is confirmed exclusively by the
 * signed webhook at `/api/payments/paddle/webhook`. That ordering is deliberate
 * and racy on purpose — the donor usually arrives at the thank-you page before
 * Paddle's webhook lands, which is why that page renders a "still processing"
 * state rather than assuming failure.
 */
export function PaddleCheckout({
  transactionId,
  clientToken,
  environment,
  thankYouUrl,
  cancelUrl,
  labels,
}: PaddleCheckoutProps) {
  const [failed, setFailed] = useState(false);
  // `checkout.closed` also fires after a successful payment, so without this
  // the success navigation would be immediately overwritten by the cancel one.
  const completed = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function handleEvent(event: PaddleEventData) {
      if (event.name === "checkout.completed") {
        completed.current = true;
        // Full navigation, not router.push: the overlay has taken over the
        // page and a soft transition can leave its iframe mounted.
        window.location.assign(thankYouUrl);
        return;
      }
      if (event.name === "checkout.closed" && !completed.current) {
        window.location.assign(cancelUrl);
      }
    }

    initializePaddle({
      environment,
      token: clientToken,
      eventCallback: handleEvent,
    }).catch((error: unknown) => {
      console.error("[paddle] initializePaddle failed", {
        error,
        environment,
        transactionId,
      });
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [cancelUrl, clientToken, environment, thankYouUrl, transactionId]);

  if (failed) {
    return (
      <Shell title={labels.errorTitle} body={labels.errorBody}>
        <Button asChild size="lg" fullWidth className="mt-2">
          <a href={cancelUrl}>{labels.retry}</a>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell title={labels.title} body={labels.body}>
      <Spinner className="mx-auto" />
    </Shell>
  );
}

function Shell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <Card tone="warm">
        <CardContent className="space-y-4 py-10">
          <Heading level={1} size="lg">
            {title}
          </Heading>
          <Text variant="muted">{body}</Text>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
