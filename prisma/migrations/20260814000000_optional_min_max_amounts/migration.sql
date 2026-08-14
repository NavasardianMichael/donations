-- Page-level min/max become optional. Existing rows keep their current
-- minimums (the editor switch starts on). New pages start with both unset.

ALTER TABLE "DonationPage" ALTER COLUMN "minAmountMinor" DROP NOT NULL;
ALTER TABLE "DonationPage" ALTER COLUMN "minAmountMinor" DROP DEFAULT;

ALTER TABLE "DonationPage" ALTER COLUMN "minAmountMinorUsd" DROP NOT NULL;
ALTER TABLE "DonationPage" ALTER COLUMN "minAmountMinorUsd" DROP DEFAULT;

ALTER TABLE "DonationPage" ADD COLUMN "maxAmountMinor" INTEGER;
ALTER TABLE "DonationPage" ADD COLUMN "maxAmountMinorUsd" INTEGER;
