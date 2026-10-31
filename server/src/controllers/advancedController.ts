import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Role, SubscriptionStatus, BillingFrequency } from '@prisma/client';
import { calculateNextDate } from '../services/billingService';
import { calculateProration, previousBillingDate } from '../services/prorationService';
import { generateSequence } from '../utils/validation';

const ownedFilter = (req: Request) => req.user?.role === Role.CUSTOMER ? { customerId: req.user.customerProfileId || '__missing_customer_profile__' } : {};
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100);
const money = (n: number) => cents(n) / 100;

export async function renewalTimeline(req: Request, res: Response) {
  const [subscriptions, history, notifications, changes] = await Promise.all([
    prisma.subscription.findMany({ where: ownedFilter(req), include: { plan: true, lines: { include: { product: true } }, customer: { include: { user: { select: { name: true } } } } }, orderBy: { expiryDate: 'asc' } }),
    prisma.renewalHistory.findMany({ where: ownedFilter(req), orderBy: { renewedAt: 'desc' } }),
    prisma.renewalNotification.findMany({ where: ownedFilter(req), orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.subscriptionChange.findMany({ where: ownedFilter(req), orderBy: { createdAt: 'desc' }, take: 100 })
  ]);
  const now = new Date();
  res.json({ subscriptions: subscriptions.map(s => ({ ...s, daysRemaining: Math.ceil((s.expiryDate.getTime() - now.getTime()) / 86400000), renewalEligible: s.plan.allowRenewal && s.status === SubscriptionStatus.ACTIVE })), history, notifications, changes });
}

export async function renewalSettings(req: Request, res: Response) {
  if (req.method === 'GET') {
    const setting = await prisma.renewalSettings.findUnique({ where: { id: 'default' } });
    res.json(setting || { reminderIntervals: [30, 15, 7, 3, 0] }); return;
  }
  const intervals = req.body.reminderIntervals;
  if (!Array.isArray(intervals) || intervals.some((n: unknown) => !Number.isInteger(n) || Number(n) < 0 || Number(n) > 365)) { res.status(400).json({ message: 'Intervals must be whole days between 0 and 365.' }); return; }
  const setting = await prisma.renewalSettings.upsert({ where: { id: 'default' }, create: { id: 'default', reminderIntervals: [...new Set(intervals)].sort((a: number,b: number) => b-a) }, update: { reminderIntervals: [...new Set(intervals)].sort((a: number,b: number) => b-a) } });
  res.json(setting);
}

export async function runRenewalReminders() {
  const setting = await prisma.renewalSettings.findUnique({ where: { id: 'default' } });
  const stages = (setting?.reminderIntervals as number[] | undefined) || [30,15,7,3,0];
  const today = new Date(); today.setHours(0,0,0,0);
  const until = new Date(today); until.setDate(until.getDate() + Math.max(365, ...stages));
  const subs = await prisma.subscription.findMany({ where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] }, expiryDate: { gte: today, lte: until } }, include: { plan: true } });
  let created = 0;
  for (const s of subs) {
    if (!s.plan.allowRenewal || s.status !== SubscriptionStatus.ACTIVE) continue;
    const days = Math.ceil((s.expiryDate.getTime() - today.getTime()) / 86400000);
    if (!stages.includes(days)) continue;
    const result = await prisma.renewalNotification.createMany({ data: [{ subscriptionId: s.id, customerId: s.customerId, stageDays: days, renewalDate: s.expiryDate, renewalAmount: s.totalAmount }], skipDuplicates: true });
    created += result.count;
  }
  return { created };
}

export async function simulateCustomerCost(req: Request, res: Response) {
  const { planIds, quantity = 1, discountCode } = req.body;
  if (!Array.isArray(planIds) || planIds.length < 1 || planIds.length > 8 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) { res.status(400).json({ message: 'Choose 1–8 plans and a valid quantity.' }); return; }
  const now = new Date();
  const plans = await prisma.subscriptionPlan.findMany({ where: { id: { in: planIds }, status: 'ACTIVE', OR: [{ availableFrom: null }, { availableFrom: { lte: now } }], AND: [{ OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] }] }, include: { planProducts: { include: { product: true } } } });
  if (plans.length !== new Set(planIds).size) { res.status(400).json({ message: 'One or more selected plans are unavailable.' }); return; }
  if (plans.some(p => quantity < p.minimumQuantity)) { res.status(400).json({ message: 'Quantity is below a selected plan’s minimum.' }); return; }
  let discount: any = null;
  if (discountCode) discount = await prisma.discountRule.findFirst({ where: { code: String(discountCode).toUpperCase(), status: true, OR: [{ startDate: null }, { startDate: { lte: new Date() } }], AND: [{ OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }] } });
  if (discount?.maxUsageLimit !== null && discount?.maxUsageLimit !== undefined && discount.currentUsageCount >= discount.maxUsageLimit) discount = null;
  const tax = await prisma.taxRule.findFirst({ where: { status: true, isDefault: true } });
  res.json(plans.map(p => {
    let base = cents(p.price * quantity);
    const eligibleDiscount = discount && base >= cents(discount.minPurchaseAmount) && quantity >= discount.minQuantity &&
      (discount.targetType === 'ALL' || (discount.targetType === 'PLAN' && discount.targetId === p.id) || (discount.targetType === 'PRODUCT' && p.planProducts.some(x => x.productId === discount.targetId)));
    let discountCents = eligibleDiscount ? (discount.type === 'PERCENTAGE' ? Math.round(base * discount.value / 100) : cents(discount.value)) : 0;
    discountCents = Math.min(base, discountCents);
    const taxable = base - discountCents; const taxCents = Math.round(taxable * (tax?.rate || 0) / 100);
    const cycleMonths = p.billingFrequency === BillingFrequency.YEARLY ? 12 : p.billingFrequency === BillingFrequency.MONTHLY ? 1 : p.billingFrequency === BillingFrequency.WEEKLY ? 0.23014 : 0.03285;
    const total = taxable + taxCents;
    return { id: p.id, name: p.name, billingFrequency: p.billingFrequency, products: p.planProducts.map(x => x.product.name), quantity, base: money(base), discount: money(discountCents), tax: money(taxCents), total: money(total), monthlyEquivalent: money(total / cycleMonths), annualEquivalent: money(total / cycleMonths * 12), discountApplied: !!eligibleDiscount };
  }));
}

export async function simulateRevenue(req: Request, res: Response) {
  const { assumptions = {}, name, description, save } = req.body;
  const [active, plans] = await Promise.all([
    prisma.subscription.findMany({ where: { status: SubscriptionStatus.ACTIVE }, select: { totalAmount: true, plan: { select: { billingFrequency: true } } } }),
    prisma.subscriptionPlan.findMany({ where: { status: 'ACTIVE' }, select: { billingFrequency: true } })
  ]);
  const monthlyValue = (amount: number, frequency: BillingFrequency) => frequency === BillingFrequency.YEARLY ? amount / 12 : frequency === BillingFrequency.WEEKLY ? amount * 52 / 12 : frequency === BillingFrequency.DAILY ? amount * 365 / 12 : amount;
  const baselineMrr = money(active.reduce((sum, s) => sum + cents(monthlyValue(s.totalAmount, s.plan.billingFrequency)), 0) / 100);
  const baseCount = active.length;
  const pct = (key: string) => Math.max(-100, Math.min(500, Number(assumptions[key]) || 0)) / 100;
  const churn = Math.max(0, Math.min(100, Number(assumptions.churnPercent) || 0)) / 100;
  const renewalRate = Math.max(0, Math.min(100, Number(assumptions.renewalRatePercent ?? 100))) / 100;
  const newCustomers = Math.max(0, Math.floor(Number(assumptions.newCustomers) || 0));
  const additionalSeats = Math.max(0, Math.floor(Number(assumptions.additionalSeats) || 0));
  const annualMix = Math.max(0, Math.min(100, Number(assumptions.annualMixPercent) || 0)) / 100;
  const price = 1 + pct('priceChangePercent');
  const discount = 1 - Math.max(0, Math.min(100, Number(assumptions.discountPercent) || 0)) / 100;
  const upgrade = Math.max(0, Number(assumptions.upgradePercent) || 0) / 100;
  const downgrade = Math.max(0, Number(assumptions.downgradePercent) || 0) / 100;
  const perCustomer = baseCount ? baselineMrr / baseCount : 0;
  const retained = baselineMrr * price * discount * (1 - churn) * renewalRate * (1 + (upgrade - downgrade) * 0.2);
  const acquisition = newCustomers * perCustomer * price * discount;
  const seatRevenue = baseCount ? additionalSeats * perCustomer / baseCount * price * discount : 0;
  const projectedMrr = money(retained + acquisition + seatRevenue);
  const months = (n: number) => money(Array.from({ length: n }, (_, i) => (retained + seatRevenue) * Math.pow((1 - churn) * renewalRate, i / 12) + acquisition * (i + 1) / n).reduce((a,b)=>a+b,0));
  const collectionFactor = (annualMix * 12) + ((1 - annualMix) * 1);
  const result = { baselineMrr, activeSubscriptions: baseCount, projectedMrr, projectedArr: money(projectedMrr * 12), projectedCustomers: Math.max(0, Math.round(baseCount * (1 - churn) * renewalRate + newCustomers)), mrrChange: money(projectedMrr - baselineMrr), estimatedFirstMonthCashCollection: money(projectedMrr * collectionFactor), projections: { threeMonths: months(3), sixMonths: months(6), twelveMonths: months(12) }, assumptions, sequence: ['Apply price change and campaign discount to baseline revenue and new acquisition', 'Apply expected churn, then renewal retention to the remaining baseline cohort', 'Apply net upgrade and downgrade uplift at 20% of average MRR per converted customer', 'Add acquired customers and additional seats at baseline average MRR', 'Keep MRR annualized for every billing frequency; annual mix changes estimated cash collection timing only'] };
  if (save) {
    if (!name || typeof name !== 'string') { res.status(400).json({ message: 'A scenario name is required.' }); return; }
    const scenarioId = typeof req.body.scenarioId === 'string' ? req.body.scenarioId : undefined;
    if (scenarioId) {
      const updated = await prisma.revenueScenario.updateMany({ where: { id: scenarioId, ownerId: req.user!.id }, data: { name: name.slice(0,120), description: typeof description === 'string' ? description.slice(0,1000) : null, assumptions, result } });
      if (!updated.count) { res.status(404).json({ message: 'Scenario not found.' }); return; }
      const saved = await prisma.revenueScenario.findUnique({ where: { id: scenarioId } }); res.json({ ...result, scenario: saved }); return;
    }
    const saved = await prisma.revenueScenario.create({ data: { ownerId: req.user!.id, name: name.slice(0, 120), description: typeof description === 'string' ? description.slice(0, 1000) : null, assumptions, result } });
    res.json({ ...result, scenario: saved }); return;
  }
  res.json(result);
}

export async function listScenarios(req: Request, res: Response) { res.json(await prisma.revenueScenario.findMany({ where: { ownerId: req.user!.id }, orderBy: { updatedAt: 'desc' } })); }
export async function deleteScenario(req: Request, res: Response) { const r = await prisma.revenueScenario.deleteMany({ where: { id: String(req.params.id), ownerId: req.user!.id } }); res.status(r.count ? 204 : 404).end(); }

export async function changePlan(req: Request, res: Response) {
  const subscriptionId = String(req.params.id);
  const { planId, confirm = false } = req.body;
  const idempotencyKey = String(req.headers['idempotency-key'] || req.body?.idempotencyKey || '').trim();
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true, lines: { include: { product: true, variant: true } } } });
  if (!sub) { res.status(404).json({ message: 'Subscription not found.' }); return; }
  if (req.user?.role === Role.CUSTOMER && sub.customerId !== req.user.customerProfileId) { res.status(403).json({ message: 'Forbidden.' }); return; }
  if (sub.status !== SubscriptionStatus.ACTIVE) { res.status(400).json({ message: 'Only active subscriptions can change plans.' }); return; }
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: String(planId) } });
  const now = new Date();
  if (!plan || plan.status !== 'ACTIVE' || (plan.availableFrom && plan.availableFrom > now) || (plan.availableUntil && plan.availableUntil < now)) { res.status(400).json({ message: 'The selected plan is unavailable.' }); return; }
  if (plan.id === sub.planId) { res.status(400).json({ message: 'Choose a plan different from the current plan.' }); return; }
  if (!sub.lines.length) { res.status(400).json({ message: 'This subscription has no billable lines.' }); return; }
  const qty = sub.lines.reduce((total, line) => total + line.quantity, 0);
  const planGrossCents = Math.round((plan.price * qty + Number.EPSILON) * 100);
  const totalWeight = sub.lines.reduce((total, line) => total + Math.max(0, line.lineTotal), 0) || sub.lines.length;
  const repriced = sub.lines.map((line, index) => {
    const weight = Math.max(0, line.lineTotal) || (totalWeight === sub.lines.length ? 1 : 0);
    const grossCents = index === sub.lines.length - 1 ? planGrossCents : Math.round(planGrossCents * weight / totalWeight);
    const priceCents = Math.max(0, Math.round(grossCents / line.quantity) + Math.round(line.discount * 100 / line.quantity));
    const netCents = Math.max(0, priceCents * line.quantity - Math.round(line.discount * 100));
    return { line, price: priceCents / 100, net: netCents / 100, tax: Math.round(netCents * line.taxRate / 100) / 100 };
  });
  const subtotal = Math.round(repriced.reduce((n, x) => n + x.net, 0) * 100) / 100;
  const taxAmount = Math.round(repriced.reduce((n, x) => n + x.tax, 0) * 100) / 100;
  const discountAmount = Math.round(sub.lines.reduce((n, x) => n + x.discount, 0) * 100) / 100;
  const newTotal = Math.round((subtotal + taxAmount) * 100) / 100;
  const periodStart = previousBillingDate(sub.nextBillingDate, sub.plan.billingFrequency);
  const baseCalculation = calculateProration({ oldAmount: sub.subtotal, newAmount: subtotal, periodStart, periodEnd: sub.nextBillingDate, effectiveAt: now });
  const proratedTax = Math.round((taxAmount - sub.taxAmount) * baseCalculation.remainingDays / baseCalculation.totalDays * 100) / 100;
  const adjustment = Math.round((baseCalculation.prorationAmount + proratedTax) * 100) / 100;
  const calculation = { ...baseCalculation, oldAmount: sub.totalAmount, newAmount: newTotal, difference: Math.round((newTotal - sub.totalAmount) * 100) / 100, prorationAmount: adjustment, payableAmount: Math.max(0, adjustment), creditAmount: Math.max(0, -adjustment), taxAdjustment: proratedTax };
  if (!confirm) { res.json({ subscriptionId, currentPlan: sub.plan.name, newPlan: plan.name, currentAmount: sub.totalAmount, periodStart, periodEnd: sub.nextBillingDate, ...calculation, taxAmount: proratedTax, recurringTaxAmount: taxAmount, discountAmount, currency: 'INR', requiresConfirmation: true }); return; }
  if (!idempotencyKey) { res.status(400).json({ message: 'An idempotency key is required to confirm a plan change.' }); return; }
  const prior = await prisma.subscriptionChange.findUnique({ where: { idempotencyKey } });
  if (prior && (prior.subscriptionId !== subscriptionId || prior.customerId !== sub.customerId)) { res.status(409).json({ message: 'That idempotency key was already used for another plan change.' }); return; }
  if (prior) { res.json({ message: 'Plan change already processed.', change: prior }); return; }
  const invoiceNumber = calculation.payableAmount > 0 ? await generateSequence('INV') : undefined;
  const effectiveAt = now;
  let change;
  try { change = await prisma.$transaction(async tx => {
    const current = await tx.subscription.findUnique({ where: { id: subscriptionId }, select: { planId: true, status: true } });
    if (!current || current.status !== SubscriptionStatus.ACTIVE || current.planId !== sub.planId) throw new Error('Subscription changed while this request was being confirmed. Please preview it again.');
    const duplicate = await tx.subscriptionChange.findUnique({ where: { idempotencyKey } });
    if (duplicate) {
      if (duplicate.subscriptionId !== subscriptionId || duplicate.customerId !== sub.customerId) throw new Error('That idempotency key was already used for another plan change.');
      return duplicate;
    }
    const result = await tx.subscriptionChange.create({ data: { subscriptionId, customerId: sub.customerId, oldPlanId: sub.planId, newPlanId: plan.id, oldPlanName: sub.plan.name, newPlanName: plan.name, oldAmount: sub.totalAmount, newAmount: newTotal, prorationAmount: calculation.prorationAmount, taxAmount: proratedTax, discountAmount: 0, effectiveAt, status: 'CONFIRMED', idempotencyKey, calculation: { ...calculation, periodStart: periodStart.toISOString(), periodEnd: sub.nextBillingDate.toISOString(), method: 'remaining whole days / total billing period days; base and tax adjustments rounded to cents' } } });
    for (const line of repriced) await tx.subscriptionLine.update({ where: { id: line.line.id }, data: { unitPrice: line.price, lineTotal: line.net } });
    await tx.subscription.update({ where: { id: subscriptionId }, data: { planId: plan.id, subtotal, taxAmount, discountAmount, totalAmount: newTotal, nextBillingDate: calculateNextDate(now, plan.billingFrequency) } });
    if (calculation.payableAmount > 0 && invoiceNumber) {
      const invoiceTax = proratedTax;
      const proratedSubtotal = baseCalculation.prorationAmount;
      const dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + 7);
      await tx.invoice.create({ data: { invoiceNumber, subscriptionId, customerId: sub.customerId, status: 'CONFIRMED', invoiceDate: now, dueDate, subtotal: proratedSubtotal, taxAmount: invoiceTax, discountAmount: 0, totalAmount: calculation.payableAmount, paidAmount: 0, outstandingBalance: calculation.payableAmount, billingPeriodStart: now, billingPeriodEnd: sub.nextBillingDate, notes: `Prorated plan change ${sub.plan.name} to ${plan.name}`, lines: { create: repriced.map(x => { const lineTotal = Math.round((x.net - x.line.lineTotal) * calculation.remainingDays / calculation.totalDays * 100) / 100; return { productId: x.line.productId, variantId: x.line.variantId, description: `Prorated adjustment · ${x.line.product.name}`, quantity: x.line.quantity, unitPrice: lineTotal / x.line.quantity, taxRate: x.line.taxRate, discount: 0, lineTotal }; }) } } });
    } else if (calculation.creditAmount > 0) {
      await tx.customerProfile.update({ where: { id: sub.customerId }, data: { creditBalance: { increment: calculation.creditAmount } } });
    }
    await tx.auditLog.create({ data: { userId: req.user!.id, action: 'SUBSCRIPTION_PLAN_CHANGED', entityType: 'Subscription', entityId: subscriptionId, details: { changeId: result.id, oldPlan: sub.plan.name, newPlan: plan.name, prorationAmount: calculation.prorationAmount } } });
    return result;
  }); } catch (error: any) {
    if (error.code === 'P2002') {
      const duplicate = await prisma.subscriptionChange.findUnique({ where: { idempotencyKey } });
      if (duplicate && duplicate.subscriptionId === subscriptionId && duplicate.customerId === sub.customerId) { res.json({ message: 'Plan change already processed.', change: duplicate }); return; }
      res.status(409).json({ message: 'This request conflicts with another plan change. Please preview again.' }); return;
    }
    res.status(409).json({ message: error.message || 'Unable to confirm plan change.' }); return;
  }
  res.json({ message: 'Plan change confirmed.', change, invoiceNumber, creditIssued: calculation.creditAmount });
}
