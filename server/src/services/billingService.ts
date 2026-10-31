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
    case BillingFrequency.YEARLY: {
      const day = d.getDate();
      const wasMonthEnd = day === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + (frequency === BillingFrequency.MONTHLY ? 1 : 12));
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(wasMonthEnd ? lastDay : Math.min(day, lastDay));
      break;
    }
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
      },
      usageRecords: { where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } }
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

    const usageBaseProductId = sub.lines[0]?.productId;
    if (usageBaseProductId) for (const usage of sub.usageRecords) {
      const lineSubtotal = Math.round(usage.quantity * usage.unitPrice * 100) / 100;
      const lineTax = Math.round(lineSubtotal * usage.taxRate) / 100;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      invoiceLinesData.push({ productId: usageBaseProductId, variantId: null, description: `Usage: ${usage.description}`, quantity: usage.quantity, unitPrice: usage.unitPrice, taxRate: usage.taxRate, discount: 0, lineTotal: lineSubtotal });
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
      const customerCredit = await tx.customerProfile.findUnique({ where: { id: sub.customerId }, select: { creditBalance: true } });
      const creditApplied = Math.round(Math.min(customerCredit?.creditBalance || 0, totalAmount) * 100) / 100;
      const payableAmount = Math.max(0, Math.round((totalAmount - creditApplied) * 100) / 100);
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          subscriptionId: sub.id,
          customerId: sub.customerId,
          status: payableAmount === 0 && creditApplied > 0 ? InvoiceStatus.PAID : InvoiceStatus.CONFIRMED,
          invoiceDate: periodStart,
          dueDate,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          creditApplied,
          paidAmount: creditApplied,
          outstandingBalance: payableAmount,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          notes: `Automated recurring invoice for cycle ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
          lines: {
            create: invoiceLinesData
          }
        }
      });

      if (creditApplied > 0) {
        await tx.customerProfile.update({ where: { id: sub.customerId }, data: { creditBalance: { decrement: creditApplied } } });
      }

      if (sub.usageRecords.length) await tx.usageRecord.updateMany({ where: { id: { in: sub.usageRecords.map(u => u.id) }, status: 'PENDING' }, data: { invoiceId: invoice.id, status: 'BILLED' } });

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
