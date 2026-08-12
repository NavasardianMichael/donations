-- Paddle as a second payment provider, for international cards.
--
-- Written by hand rather than generated, because `Donation.pageAmountMinor` is
-- required and the table already has rows: the column is added nullable,
-- backfilled from `amountMinor` (every existing donation is already in its
-- page's currency), and only then marked NOT NULL.

-- AlterEnum
-- Safe alongside the statements below: Postgres 12+ allows ADD VALUE inside a
-- transaction as long as the new value is not USED in the same transaction.
ALTER TYPE "PaymentProvider" ADD VALUE 'PADDLE';

-- AlterTable: the international (USD) amount ladder, authored by the creator
-- alongside the AMD one. Paddle cannot settle in AMD.
ALTER TABLE "DonationPage" ADD COLUMN     "suggestedAmountsUsd" INTEGER[] DEFAULT ARRAY[500, 2500, 5000]::INTEGER[],
ADD COLUMN     "minAmountMinorUsd" INTEGER NOT NULL DEFAULT 100;

-- AlterTable: the page-currency equivalent every aggregate sums.
ALTER TABLE "Donation" ADD COLUMN     "pageAmountMinor" INTEGER;

UPDATE "Donation" SET "pageAmountMinor" = "amountMinor" WHERE "pageAmountMinor" IS NULL;

ALTER TABLE "Donation" ALTER COLUMN "pageAmountMinor" SET NOT NULL;

-- DropIndex: a gateway id is only unique WITHIN its gateway. Two providers'
-- id spaces are unrelated, so a global unique asserted something untrue.
DROP INDEX "Donation_providerOrderId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Donation_provider_providerOrderId_key" ON "Donation"("provider", "providerOrderId");

-- DropIndex: the reconcile sweep is per-provider now, so provider leads.
DROP INDEX "Donation_status_registeredAt_idx";

-- CreateIndex
CREATE INDEX "Donation_provider_status_registeredAt_idx" ON "Donation"("provider", "status", "registeredAt");
