-- AlterTable
ALTER TABLE "DonationPage" ADD COLUMN "embedAllowAnyOrigin" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DonationPage" ADD COLUMN "embedAllowedOrigins" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
