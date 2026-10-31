ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';

CREATE TABLE "RenewalHistory" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "previousExpiryDate" TIMESTAMP(3) NOT NULL,
  "newExpiryDate" TIMESTAMP(3) NOT NULL,
  "renewalAmount" DOUBLE PRECISION NOT NULL,
  "planName" TEXT NOT NULL,
  "renewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idempotencyKey" TEXT NOT NULL,
  CONSTRAINT "RenewalHistory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RenewalHistory_idempotencyKey_key" ON "RenewalHistory"("idempotencyKey");
CREATE UNIQUE INDEX "RenewalHistory_subscriptionId_previousExpiryDate_key" ON "RenewalHistory"("subscriptionId", "previousExpiryDate");
CREATE INDEX "RenewalHistory_subscriptionId_renewedAt_idx" ON "RenewalHistory"("subscriptionId", "renewedAt");
ALTER TABLE "RenewalHistory" ADD CONSTRAINT "RenewalHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RenewalHistory" ADD CONSTRAINT "RenewalHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RenewalNotification" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "stageDays" INTEGER NOT NULL,
  "renewalDate" TIMESTAMP(3) NOT NULL,
  "renewalAmount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RenewalNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RenewalNotification_subscriptionId_renewalDate_stageDays_key" ON "RenewalNotification"("subscriptionId", "renewalDate", "stageDays");
CREATE INDEX "RenewalNotification_customerId_createdAt_idx" ON "RenewalNotification"("customerId", "createdAt");
ALTER TABLE "RenewalNotification" ADD CONSTRAINT "RenewalNotification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RenewalNotification" ADD CONSTRAINT "RenewalNotification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SubscriptionChange" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "oldPlanId" TEXT NOT NULL,
  "newPlanId" TEXT NOT NULL,
  "oldPlanName" TEXT NOT NULL,
  "newPlanName" TEXT NOT NULL,
  "oldAmount" DOUBLE PRECISION NOT NULL,
  "newAmount" DOUBLE PRECISION NOT NULL,
  "prorationAmount" DOUBLE PRECISION NOT NULL,
  "taxAmount" DOUBLE PRECISION NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionChange_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionChange_idempotencyKey_key" ON "SubscriptionChange"("idempotencyKey");
CREATE INDEX "SubscriptionChange_subscriptionId_createdAt_idx" ON "SubscriptionChange"("subscriptionId", "createdAt");
ALTER TABLE "SubscriptionChange" ADD CONSTRAINT "SubscriptionChange_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionChange" ADD CONSTRAINT "SubscriptionChange_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RenewalSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "reminderIntervals" JSONB NOT NULL DEFAULT '[30,15,7,3,0]',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenewalSettings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RevenueScenario" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "assumptions" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevenueScenario_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RevenueScenario_ownerId_updatedAt_idx" ON "RevenueScenario"("ownerId", "updatedAt");
ALTER TABLE "RevenueScenario" ADD CONSTRAINT "RevenueScenario_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerProfile" ADD COLUMN "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "creditApplied" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionChange" ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionChange" ADD COLUMN "calculation" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "RenewalNotification" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'DELIVERED';
ALTER TABLE "RenewalNotification" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RenewalNotification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "RenewalNotification" ADD COLUMN IF NOT EXISTS "actionLink" TEXT;
ALTER TABLE "RenewalNotification" ADD COLUMN IF NOT EXISTS "emailRecipient" TEXT;
ALTER TABLE "RenewalSettings" ADD COLUMN IF NOT EXISTS "downgradeTiming" TEXT NOT NULL DEFAULT 'IMMEDIATE';
