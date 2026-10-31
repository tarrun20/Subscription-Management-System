import { BillingFrequency } from '@prisma/client';

const toCents = (amount: number) => Math.round((amount + Number.EPSILON) * 100);
const fromCents = (amount: number) => amount / 100;

export function previousBillingDate(nextDate: Date, frequency: BillingFrequency): Date {
  const date = new Date(nextDate);
  if (frequency === BillingFrequency.DAILY) date.setDate(date.getDate() - 1);
  if (frequency === BillingFrequency.WEEKLY) date.setDate(date.getDate() - 7);
  if (frequency === BillingFrequency.MONTHLY || frequency === BillingFrequency.YEARLY) {
    const day = date.getDate();
    const wasMonthEnd = day === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() - (frequency === BillingFrequency.MONTHLY ? 1 : 12));
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(wasMonthEnd ? lastDay : Math.min(day, lastDay));
  }
  return date;
}

export function calculateProration(input: { oldAmount: number; newAmount: number; periodStart: Date; periodEnd: Date; effectiveAt: Date }) {
  const totalDays = Math.max(1, Math.ceil((input.periodEnd.getTime() - input.periodStart.getTime()) / 86400000));
  const remainingDays = Math.max(0, Math.min(totalDays, Math.ceil((input.periodEnd.getTime() - input.effectiveAt.getTime()) / 86400000)));
  const differenceCents = toCents(input.newAmount) - toCents(input.oldAmount);
  const prorationCents = Math.round(differenceCents * remainingDays / totalDays);
  return { oldAmount: fromCents(toCents(input.oldAmount)), newAmount: fromCents(toCents(input.newAmount)), difference: fromCents(differenceCents), totalDays, remainingDays, prorationAmount: fromCents(prorationCents), creditAmount: fromCents(Math.max(0, -prorationCents)), payableAmount: fromCents(Math.max(0, prorationCents)) };
}
