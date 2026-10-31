import assert from 'node:assert/strict';
import { BillingFrequency } from '@prisma/client';
import { calculateProration, previousBillingDate } from '../src/services/prorationService';
import { calculateNextDate } from '../src/services/billingService';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const midCycle = calculateProration({ oldAmount: 1000, newAmount: 2000, periodStart: date('2026-01-01'), periodEnd: date('2026-01-31'), effectiveAt: date('2026-01-16') });
assert.equal(midCycle.totalDays, 30); assert.equal(midCycle.remainingDays, 15); assert.equal(midCycle.payableAmount, 500);
const early = calculateProration({ oldAmount: 1000, newAmount: 2000, periodStart: date('2026-01-01'), periodEnd: date('2026-01-31'), effectiveAt: date('2026-01-02') });
assert.equal(early.payableAmount, 966.67);
const late = calculateProration({ oldAmount: 2000, newAmount: 1000, periodStart: date('2026-01-01'), periodEnd: date('2026-01-31'), effectiveAt: date('2026-01-30') });
assert.equal(late.creditAmount, 33.33); assert.equal(late.payableAmount, 0);
const annual = calculateProration({ oldAmount: 0, newAmount: 365, periodStart: date('2024-02-29'), periodEnd: date('2025-02-28'), effectiveAt: date('2025-02-14') });
assert.equal(annual.totalDays, 365); assert.equal(annual.remainingDays, 14); assert.equal(annual.payableAmount, 14);
assert.equal(previousBillingDate(date('2026-03-31'), BillingFrequency.MONTHLY).toISOString(), '2026-02-28T00:00:00.000Z');
assert.equal(calculateNextDate(date('2026-01-31'), BillingFrequency.MONTHLY).toISOString(), '2026-02-28T00:00:00.000Z');
assert.equal(calculateNextDate(date('2024-02-29'), BillingFrequency.YEARLY).toISOString(), '2025-02-28T00:00:00.000Z');
console.log('Proration unit tests passed (5 cases).');
