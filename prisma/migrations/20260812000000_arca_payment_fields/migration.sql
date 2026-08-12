-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('ARCA');

-- AlterEnum
ALTER TYPE "DonationStatus" ADD VALUE 'AUTHORIZING';

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "approvalCode" TEXT,
ADD COLUMN     "cardMask" TEXT,
ADD COLUMN     "failureCode" TEXT,
ADD COLUMN     "failureMessage" TEXT,
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'ARCA',
ADD COLUMN     "providerOrderId" TEXT,
ADD COLUMN     "receiptSentAt" TIMESTAMP(3),
ADD COLUMN     "registeredAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_providerOrderId_key" ON "Donation"("providerOrderId");

-- CreateIndex
CREATE INDEX "Donation_status_registeredAt_idx" ON "Donation"("status", "registeredAt");
