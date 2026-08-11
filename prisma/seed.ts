import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import type {
  DonationStatus,
  TrafficSource,
} from "../src/generated/prisma/enums";

/**
 * Seed data. Analytics is impossible to develop against without a realistic
 * spread of history, so this generates ~60 days of correlated pageviews and
 * donations rather than a handful of rows.
 *
 * Deterministic: a fixed-seed PRNG so re-running produces the same numbers and
 * screenshots stay comparable across machines.
 */

const DAYS = 60;
const TARGET_DONATIONS = 50;
const TARGET_PAGEVIEWS = 500;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  }),
});

/** mulberry32 — small, fast, deterministic. */
function makeRandom(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20260811);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function daysAgo(days: number, hour = 12): Date {
  const d = new Date();
  d.setUTCHours(hour, randomInt(0, 59), randomInt(0, 59), 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 5);
const platformFee = (cents: number) =>
  Math.round((cents * PLATFORM_FEE_PERCENT) / 100);

const DONOR_NAMES = [
  "Jane Smith",
  "Michael Ross",
  "Sarah Jenkins",
  "Alex River",
  "Priya Raman",
  "Tomas Kovac",
  "Nina Okafor",
  "Daniel Brooks",
  "Yuki Tanaka",
  "Marta Silva",
  "Owen Hughes",
  "Leila Haddad",
] as const;

const REFERRERS = [
  null,
  "https://www.google.com/",
  "https://t.co/",
  "https://www.instagram.com/",
  "https://news.ycombinator.com/",
  "https://alexriver.example.com/support",
] as const;

const COUNTRIES = ["US", "US", "US", "CA", "GB", "DE", "AU", "NL"] as const;

const MESSAGES = [
  "Keep up the great work!",
  "Happy to support this.",
  "In memory of my grandmother.",
  "Small amount but every bit helps.",
  null,
  null,
  null,
] as const;

async function main() {
  console.log("Resetting seed data…");

  // Order matters: dependents first, and the demo user cascades to its pages.
  await prisma.contactSubmission.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: { in: ["demo@givedirect.test", "second@givedirect.test"] },
    },
  });

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const user = await prisma.user.create({
    data: {
      name: "Alex Smith",
      email: "demo@givedirect.test",
      emailVerified: new Date(),
      passwordHash,
      bio: "Working to bring clean water to communities in need.",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    },
  });

  console.log(`Created user ${user.email} (password: Password123!)`);

  const published = await prisma.donationPage.create({
    data: {
      userId: user.id,
      slug: "clean-water-initiative",
      title: "Emergency Relief: Clean Water Initiative",
      description:
        "Every $25 delivers a month of safe drinking water to a family. We work with local partners to install and maintain filtration systems in communities where the nearest safe source is hours away.",
      status: "PUBLISHED",
      publishedAt: daysAgo(58),
      currency: "usd",
      suggestedAmounts: [1000, 2500, 5000],
      allowCustomAmount: true,
      minAmountCents: 100,
      goalAmountCents: 10_000_00,
      showProgressBar: true,
      collectDonorName: true,
      collectMessage: true,
      thankYouMessage:
        "Thank you — your gift is already on its way to a family that needs it.",
      seoTitle: "Support Clean Water Initiatives | Alex Smith",
      seoDescription:
        "Help fund filtration systems for communities without access to safe drinking water. 100% of every donation goes to fieldwork.",
      seoKeywords: "clean water, charity, donation, non-profit",
      embedEnabled: true,
      createdAt: daysAgo(59),
    },
  });

  const draft = await prisma.donationPage.create({
    data: {
      userId: user.id,
      slug: "annual-education-fundraiser-2026",
      title: "Annual Education Fundraiser 2026",
      description:
        "Scholarships, books and transport for 200 students in the coming school year.",
      status: "DRAFT",
      currency: "usd",
      suggestedAmounts: [2500, 5000, 10_000],
      goalAmountCents: 100_000_00,
      collectMessage: false,
      createdAt: daysAgo(12),
    },
  });

  const archived = await prisma.donationPage.create({
    data: {
      userId: user.id,
      slug: "community-center-build",
      title: "Help Build the New Community Center",
      description:
        "Completed in March. Thank you to the 312 supporters who made it happen.",
      status: "ARCHIVED",
      publishedAt: daysAgo(400),
      currency: "usd",
      suggestedAmounts: [1000, 2500, 5000],
      goalAmountCents: 50_000_00,
      createdAt: daysAgo(420),
    },
  });

  console.log(
    `Created pages: ${published.slug} (published), ${draft.slug} (draft), ${archived.slug} (archived)`,
  );

  // -------------------------------------------------------------------------
  // Donations — weighted toward the published page, trending upward over time.
  // -------------------------------------------------------------------------
  const donationPages = [
    { page: published, weight: 0.82 },
    { page: archived, weight: 0.18 },
  ];

  const donations: {
    pageId: string;
    amountCents: number;
    currency: string;
    platformFeeCents: number;
    netToCreatorCents: number | null;
    status: DonationStatus;
    donorName: string | null;
    donorEmail: string | null;
    message: string | null;
    isAnonymous: boolean;
    source: TrafficSource;
    createdAt: Date;
    completedAt: Date | null;
    refundedAt: Date | null;
  }[] = [];

  const AMOUNTS = [1000, 1000, 2500, 2500, 2500, 5000, 5000, 10_000, 25_000];

  for (let i = 0; i < TARGET_DONATIONS; i++) {
    // Bias recent: square the uniform draw so more donations land near today.
    const dayOffset = Math.floor(DAYS * random() * random());
    const createdAt = daysAgo(dayOffset, randomInt(7, 22));

    const roll = random();
    const target =
      roll < donationPages[0]!.weight ? donationPages[0]! : donationPages[1]!;

    const amountCents = pick(AMOUNTS);
    const isAnonymous = random() < 0.2;
    const name = isAnonymous ? null : pick(DONOR_NAMES);

    // A realistic tail of failures and refunds so the dashboard shows them.
    const statusRoll = random();
    const status: DonationStatus =
      statusRoll < 0.9
        ? "SUCCEEDED"
        : statusRoll < 0.95
          ? "PENDING"
          : statusRoll < 0.98
            ? "FAILED"
            : "REFUNDED";

    const succeeded = status === "SUCCEEDED" || status === "REFUNDED";
    const fee = platformFee(amountCents);

    donations.push({
      pageId: target.page.id,
      amountCents,
      currency: target.page.currency,
      platformFeeCents: fee,
      netToCreatorCents: succeeded ? amountCents - fee : null,
      status,
      donorName: name,
      donorEmail: name
        ? `${name.split(" ")[0]!.toLowerCase()}@example.com`
        : null,
      message: target.page.collectMessage ? pick(MESSAGES) : null,
      isAnonymous,
      source: random() < 0.25 ? "EMBED" : "DIRECT",
      createdAt,
      completedAt: succeeded ? createdAt : null,
      refundedAt:
        status === "REFUNDED"
          ? new Date(createdAt.getTime() + 3 * 86_400_000)
          : null,
    });
  }

  await prisma.donation.createMany({ data: donations });
  console.log(`Created ${donations.length} donations`);

  // -------------------------------------------------------------------------
  // Pageviews — the denominator for conversion rate.
  // -------------------------------------------------------------------------
  const pageViews: {
    pageId: string;
    visitorHash: string;
    referrer: string | null;
    country: string;
    source: TrafficSource;
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < TARGET_PAGEVIEWS; i++) {
    const dayOffset = Math.floor(DAYS * random() * random());
    const pageId = random() < 0.85 ? published.id : archived.id;

    pageViews.push({
      pageId,
      // Repeat visitors: a small pool of hashes means uniques < views.
      visitorHash: `seedvisitor_${randomInt(1, Math.floor(TARGET_PAGEVIEWS * 0.6))}`,
      referrer: pick(REFERRERS),
      country: pick(COUNTRIES),
      source: random() < 0.3 ? "EMBED" : "DIRECT",
      createdAt: daysAgo(dayOffset, randomInt(0, 23)),
    });
  }

  await prisma.pageView.createMany({ data: pageViews });
  console.log(`Created ${pageViews.length} pageviews`);

  // -------------------------------------------------------------------------
  // Daily rollups — the same aggregation the nightly cron produces, so range
  // queries over >30 days have something to read.
  // -------------------------------------------------------------------------
  type Bucket = {
    views: number;
    visitors: Set<string>;
    donationCount: number;
    amountCents: number;
  };
  const buckets = new Map<string, Bucket>();

  const bucketFor = (pageId: string, date: Date): Bucket => {
    const key = `${pageId}|${startOfUtcDay(date).toISOString()}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        views: 0,
        visitors: new Set(),
        donationCount: 0,
        amountCents: 0,
      };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  for (const view of pageViews) {
    const bucket = bucketFor(view.pageId, view.createdAt);
    bucket.views += 1;
    bucket.visitors.add(view.visitorHash);
  }

  for (const donation of donations) {
    if (donation.status !== "SUCCEEDED") continue;
    const bucket = bucketFor(donation.pageId, donation.createdAt);
    bucket.donationCount += 1;
    bucket.amountCents += donation.amountCents;
  }

  await prisma.pageDailyStat.createMany({
    data: [...buckets.entries()].map(([key, bucket]) => {
      const [pageId, iso] = key.split("|");
      return {
        pageId: pageId!,
        date: new Date(iso!),
        views: bucket.views,
        uniqueVisitors: bucket.visitors.size,
        donationCount: bucket.donationCount,
        amountCents: bucket.amountCents,
      };
    }),
  });
  console.log(`Created ${buckets.size} daily stat rows`);

  // A second account, so ownership checks have something to fail against.
  const other = await prisma.user.create({
    data: {
      name: "Sarah Jenkins",
      email: "second@givedirect.test",
      emailVerified: new Date(),
      passwordHash,
      bio: "Supporting local food banks.",
    },
  });
  await prisma.donationPage.create({
    data: {
      userId: other.id,
      slug: "local-food-bank",
      title: "Local Food Bank Drive",
      description: "Ensuring no family in our community goes hungry.",
      status: "PUBLISHED",
      publishedAt: daysAgo(20),
      goalAmountCents: 25_000_00,
      suggestedAmounts: [1000, 2500, 5000],
    },
  });
  console.log(`Created second user ${other.email} for ownership tests`);

  console.log("\nSeed complete.");
  console.log("  Sign in with demo@givedirect.test / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
