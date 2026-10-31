ALTER TABLE "SubscriptionPlan" ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN "trialEndsAt" TIMESTAMP(3);

CREATE TABLE "UsageRecord" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "recordedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "UsageRecord_subscriptionId_status_idx" ON "UsageRecord"("subscriptionId", "status");
CREATE INDEX "UsageRecord_invoiceId_idx" ON "UsageRecord"("invoiceId");
ALTER TABLE "Payment" ADD COLUMN "providerPaymentId" TEXT;
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
