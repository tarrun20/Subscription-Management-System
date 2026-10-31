import { prisma } from '../config/prisma';
import { BillingFrequency, InvoiceStatus, SubscriptionStatus, DiscountType } from '@prisma/client';
import { generateSequence } from '../utils/validation';

export function calculateNextDate(startDate: Date, frequency: BillingFrequency): Date {
  const d = new Date(startDate);
  switch (frequency) {
    case BillingFrequency.DAILY:
      d.setDate(d.getDate() + 1);
      break;
    case BillingFrequency.WEEKLY:
      d.setDate(d.getDate() + 7);
      break;
    case BillingFrequency.MONTHLY:
      d.setMonth(d.getMonth() + 1);
      break;
    case BillingFrequency.YEARLY:
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export async function runAutomatedBilling(): Promise<{
  processedCount: number;
  generatedInvoices: string[];
  skippedCount: number;
  closedSubscriptions: string[];
}> {
  const now = new Date();
  const generatedInvoices: string[] = [];
  const closedSubscriptions: string[] = [];
  let skippedCount = 0;

  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: { lte: now }
    },
    include: {
      plan: true,
      lines: {
        include: {
          product: true,
          variant: true
        }
      },
      customer: {
        include: { user: true }
      }
    }
  });

  for (const sub of dueSubscriptions) {
    if (sub.expiryDate <= now && sub.plan.autoCloseOnExpiry) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.CLOSED }
      });
      closedSubscriptions.push(sub.subscriptionNumber);
      continue;
    }

    const periodStart = new Date(sub.nextBillingDate);
    const periodEnd = calculateNextDate(periodStart, sub.plan.billingFrequency);

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        subscriptionId: sub.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd
      }
    });

    if (existingInvoice) {
      skippedCount++;
      if (sub.nextBillingDate <= now) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { nextBillingDate: periodEnd }
        });
      }
      continue;
    }

    let subtotal = 0;
    let taxAmount = 0;
    const invoiceLinesData: Array<{
      productId: string;
      variantId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount: number;
      lineTotal: number;
    }> = [];

    for (const line of sub.lines) {
      const lineSubtotal = line.quantity * line.unitPrice;
      const lineTax = (lineSubtotal * line.taxRate) / 100;
      subtotal += lineSubtotal;
      taxAmount += lineTax;

      const desc = line.variant
        ? `${line.product.name} (${line.variant.variantName})`
        : line.product.name;

      invoiceLinesData.push({
        productId: line.productId,
        variantId: line.variantId,
        description: desc,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        discount: line.discount,
        lineTotal: lineSubtotal
      });
    }

    let discountAmount = 0;
    const activeDiscounts = await prisma.discountRule.findMany({
      where: {
        status: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      }
    });

    for (const disc of activeDiscounts) {
      if (disc.maxUsageLimit && disc.currentUsageCount >= disc.maxUsageLimit) {
        continue;
      }
      if (subtotal < disc.minPurchaseAmount) {
        continue;
      }

      let isApplicable = false;
      if (disc.targetType === 'ALL') {
        isApplicable = true;
      } else if (disc.targetType === 'PLAN' && disc.targetId === sub.planId) {
        isApplicable = true;
      } else if (disc.targetType === 'PRODUCT') {
        isApplicable = sub.lines.some(l => l.productId === disc.targetId);
      }

      if (isApplicable) {
        if (disc.type === DiscountType.PERCENTAGE) {
          discountAmount += (subtotal * disc.value) / 100;
        } else {
          discountAmount += disc.value;
        }

        await prisma.discountRule.update({
          where: { id: disc.id },
          data: { currentUsageCount: { increment: 1 } }
        });
        break;
      }
    }

    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);
    const invoiceNumber = await generateSequence('INV');

    const dueDate = new Date(periodStart);
    if (sub.paymentTerms === 'NET_15') {
      dueDate.setDate(dueDate.getDate() + 15);
    } else if (sub.paymentTerms === 'NET_30') {
      dueDate.setDate(dueDate.getDate() + 30);
    } else if (sub.paymentTerms === 'NET_60') {
      dueDate.setDate(dueDate.getDate() + 60);
    } else {
      dueDate.setDate(dueDate.getDate() + 7);
    }

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          subscriptionId: sub.id,
          customerId: sub.customerId,
          status: InvoiceStatus.CONFIRMED,
          invoiceDate: periodStart,
          dueDate,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          paidAmount: 0.0,
          outstandingBalance: totalAmount,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          notes: `Automated recurring invoice for cycle ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
          lines: {
            create: invoiceLinesData
          }
        }
      });

      await tx.subscription.update({
        where: { id: sub.id },
        data: { nextBillingDate: periodEnd }
      });

      generatedInvoices.push(invoice.invoiceNumber);
    });
  }

  return {
    processedCount: dueSubscriptions.length,
    generatedInvoices,
    skippedCount,
    closedSubscriptions
  };
}
