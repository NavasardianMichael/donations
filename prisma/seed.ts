import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import type {
  DonationStatus,
  PaymentProvider,
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
/** Minor units in, minor units out. Mirrors src/lib/fees.ts. */
const platformFee = (minor: number) =>
  Math.round((minor * PLATFORM_FEE_PERCENT) / 100);

/** Drams -> minor units (luma). */
const AMD = (drams: number) => drams * 100;

const DONOR_NAMES = [
  "Անի Հակոբյան",
  "Դավիթ Սարգսյան",
  "Մարիամ Գրիգորյան",
  "Արամ Պետրոսյան",
  "Նարե Մկրտչյան",
  "Գոռ Ավետիսյան",
  "Լիլիթ Խաչատրյան",
  "Տիգրան Հովհաննիսյան",
  "Սոնա Մարտիրոսյան",
  "Վահե Ղազարյան",
  "Անահիտ Բաղդասարյան",
  "Հայկ Ստեփանյան",
] as const;

const REFERRERS = [
  null,
  "https://www.google.com/",
  "https://t.co/",
  "https://www.instagram.com/",
  "https://t.me/",
  "https://news.am/",
] as const;

// Armenia first, then the diaspora hubs.
const COUNTRIES = ["AM", "AM", "AM", "AM", "RU", "US", "FR", "GE"] as const;

const MESSAGES = [
  "Շարունակեք ձեր հրաշալի գործը։",
  "Ուրախ եմ աջակցել։",
  "Ի հիշատակ տատիկիս։",
  "Փոքր գումար է, բայց ամեն ներդրում կարևոր է։",
  "Հաջողություն ձեզ։",
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
      email: { in: ["demo@nvirir.test", "second@nvirir.test"] },
    },
  });

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const user = await prisma.user.create({
    data: {
      name: "Անի Հակոբյան",
      email: "demo@nvirir.test",
      emailVerified: new Date(),
      passwordHash,
      bio: "Աշխատում ենք մաքուր խմելու ջուր հասցնել սահմանամերձ գյուղեր։",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    },
  });

  console.log(`Created user ${user.email} (password: Password123!)`);

  const published = await prisma.donationPage.create({
    data: {
      userId: user.id,
      slug: "makur-jur",
      title: "Մաքուր ջուր սահմանամերձ գյուղերին",
      description:
        "Յուրաքանչյուր 5 000 դրամը մեկ ամսվա մաքուր խմելու ջուր է ապահովում մեկ ընտանիքի համար։ Տեղական գործընկերների հետ տեղադրում և սպասարկում ենք ջրի զտիչներ այն գյուղերում, որտեղ մոտակա անվտանգ աղբյուրը ժամերի հեռավորության վրա է։",
      status: "PUBLISHED",
      publishedAt: daysAgo(58),
      currency: "amd",
      suggestedAmounts: [AMD(1_000), AMD(5_000), AMD(10_000)],
      // The international ladder the creator authored to pair with the above.
      // Paddle cannot charge AMD, so these are not converted — they are chosen.
      suggestedAmountsUsd: [2_50, 12_50, 25_00],
      allowCustomAmount: true,
      minAmountMinor: AMD(100),
      minAmountMinorUsd: 1_00,
      goalAmountMinor: AMD(5_000_000),
      showProgressBar: true,
      collectDonorName: true,
      collectMessage: true,
      thankYouMessage:
        "Շնորհակալություն։ Ձեր նվիրատվությունն արդեն ճանապարհին է դեպի այն ընտանիքը, որին այն պետք է։",
      seoTitle: "Աջակցեք մաքուր ջրի նախաձեռնությանը",
      seoDescription:
        "Օգնեք ֆինանսավորել ջրի զտիչներ այն համայնքներում, որտեղ մաքուր խմելու ջուր չկա։ Յուրաքանչյուր նվիրատվություն ուղղվում է դաշտային աշխատանքին։",
      seoKeywords:
        "մաքուր ջուր, բարեգործություն, նվիրատվություն, հանգանակություն",
      embedEnabled: true,
      createdAt: daysAgo(59),
    },
  });

  const draft = await prisma.donationPage.create({
    data: {
      userId: user.id,
      slug: "krtutyan-himnadram-2026",
      title: "Կրթական հիմնադրամ 2026",
      description:
        "Կրթաթոշակներ, դասագրքեր և տրանսպորտ 200 աշակերտի համար՝ առաջիկա ուսումնական տարվա ընթացքում։",
      status: "DRAFT",
      currency: "amd",
      suggestedAmounts: [AMD(5_000), AMD(10_000), AMD(25_000)],
      suggestedAmountsUsd: [12_50, 25_00, 60_00],
      goalAmountMinor: AMD(20_000_000),
      collectMessage: false,
      createdAt: daysAgo(12),
    },
  });

  const archived = await prisma.donationPage.create({
    data: {
      userId: user.id,
      slug: "hamaynkayin-kentron",
      title: "Նոր համայնքային կենտրոն",
      description:
        "Ավարտվել է մարտին։ Շնորհակալություն 312 աջակիցներին, ովքեր դա հնարավոր դարձրին։",
      status: "ARCHIVED",
      publishedAt: daysAgo(400),
      currency: "amd",
      suggestedAmounts: [AMD(1_000), AMD(5_000), AMD(10_000)],
      suggestedAmountsUsd: [2_50, 12_50, 25_00],
      goalAmountMinor: AMD(10_000_000),
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
    amountMinor: number;
    currency: string;
    pageAmountMinor: number;
    platformFeeMinor: number;
    netToCreatorMinor: number | null;
    status: DonationStatus;
    provider: PaymentProvider;
    donorName: string | null;
    donorEmail: string | null;
    message: string | null;
    isAnonymous: boolean;
    source: TrafficSource;
    createdAt: Date;
    completedAt: Date | null;
    refundedAt: Date | null;
  }[] = [];

  // Realistic Armenian donation sizes, weighted toward the smaller presets.
  const AMOUNTS = [
    AMD(1_000),
    AMD(1_000),
    AMD(2_000),
    AMD(5_000),
    AMD(5_000),
    AMD(5_000),
    AMD(10_000),
    AMD(10_000),
    AMD(25_000),
    AMD(50_000),
  ];

  /**
   * International donations, as [USD cents, AMD equivalent in luma].
   *
   * Paired rather than converted, because that is exactly how the app works: the
   * creator authors both ladders and the pairing IS the rate. Seeding a mix of
   * providers is what proves the dashboard totals are not adding cents to luma.
   */
  const USD_AMOUNTS: [usd: number, amd: number][] = [
    [5_00, AMD(2_000)],
    [10_00, AMD(4_000)],
    [25_00, AMD(10_000)],
    [50_00, AMD(20_000)],
    [100_00, AMD(40_000)],
  ];

  for (let i = 0; i < TARGET_DONATIONS; i++) {
    // Bias recent: square the uniform draw so more donations land near today.
    const dayOffset = Math.floor(DAYS * random() * random());
    const createdAt = daysAgo(dayOffset, randomInt(7, 22));

    const roll = random();
    const target =
      roll < donationPages[0]!.weight ? donationPages[0]! : donationPages[1]!;

    // Roughly one in six donors gives from abroad, through Paddle in USD.
    const isInternational = random() < 0.16;
    const international = pick(USD_AMOUNTS);
    const amountMinor = isInternational ? international[0] : pick(AMOUNTS);
    // What the donation is worth in the page's own currency — the only figure
    // any total may sum. See Donation.pageAmountMinor.
    const pageAmountMinor = isInternational ? international[1] : amountMinor;

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
    const fee = platformFee(amountMinor);

    donations.push({
      pageId: target.page.id,
      amountMinor,
      // Paddle settles USD; ArCa settles the page's own currency.
      currency: isInternational ? "usd" : target.page.currency,
      pageAmountMinor,
      platformFeeMinor: fee,
      netToCreatorMinor: succeeded ? amountMinor - fee : null,
      status,
      provider: isInternational ? "PADDLE" : "ARCA",
      donorName: name,
      // Armenian names are not valid ASCII local-parts; index instead.
      donorEmail: name ? `donor${i}@example.am` : null,
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
    amountMinor: number;
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
        amountMinor: 0,
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
    // Page-currency equivalents, matching what the nightly rollup cron sums.
    bucket.amountMinor += donation.pageAmountMinor;
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
        amountMinor: bucket.amountMinor,
      };
    }),
  });
  console.log(`Created ${buckets.size} daily stat rows`);

  // A second account, so ownership checks have something to fail against.
  const other = await prisma.user.create({
    data: {
      name: "Դավիթ Սարգսյան",
      email: "second@nvirir.test",
      emailVerified: new Date(),
      passwordHash,
      bio: "Աջակցում ենք տեղական սննդի բանկերին։",
    },
  });
  await prisma.donationPage.create({
    data: {
      userId: other.id,
      slug: "sndi-bank",
      title: "Սննդի բանկի հանգանակություն",
      description: "Ապահովում ենք, որ մեր համայնքում ոչ մի ընտանիք սոված չմնա։",
      status: "PUBLISHED",
      publishedAt: daysAgo(20),
      goalAmountMinor: AMD(3_000_000),
      suggestedAmounts: [AMD(1_000), AMD(3_000), AMD(5_000)],
      suggestedAmountsUsd: [2_50, 7_50, 12_50],
    },
  });
  console.log(`Created second user ${other.email} for ownership tests`);

  console.log("\nSeed complete.");
  console.log("  Sign in with demo@nvirir.test / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
