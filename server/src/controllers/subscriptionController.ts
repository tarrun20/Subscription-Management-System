import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { SubscriptionStatus, PaymentTerms, Role } from '@prisma/client';
import { generateSequence } from '../utils/validation';
import { calculateNextDate } from '../services/billingService';

export async function getSubscriptions(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { status, customerId } = req.query;

    let filter: any = {};
    if (user.role === Role.CUSTOMER && user.customerProfileId) {
      filter.customerId = user.customerProfileId;
    } else if (customerId) {
      filter.customerId = String(customerId);
    }

    if (status) {
      filter.status = status as SubscriptionStatus;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: filter,
      include: {
        customer: {
          include: { user: { select: { name: true, email: true, phone: true } } }
        },
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true
          }
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            outstandingBalance: true,
            invoiceDate: true,
            dueDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching subscriptions', error: error.message });
  }
}

export async function getSubscriptionById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: {
          include: { user: true }
        },
        plan: {
          include: { planProducts: { include: { product: true } } }
        },
        lines: {
          include: {
            product: true,
            variant: true
          }
        },
        invoices: {
          include: { payments: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    if (req.user?.role === Role.CUSTOMER && subscription.customerId !== req.user.customerProfileId) {
      res.status(403).json({ message: 'Forbidden: You cannot access another customer’s subscription.' });
      return;
    }

    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching subscription', error: error.message });
  }
}

export async function createSubscription(req: Request, res: Response): Promise<void> {
  try {
    const {
      customerId,
      planId,
      startDate,
      paymentTerms = 'IMMEDIATE',
      lines
    } = req.body;

    if (!customerId || !planId || !lines || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ message: 'Customer ID, plan ID, and product lines are required.' });
      return;
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      res.status(404).json({ message: 'Plan not found' });
      return;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const nextBilling = calculateNextDate(start, plan.billingFrequency);
    const expiry = new Date(start);
    expiry.setFullYear(expiry.getFullYear() + 1);

    const subscriptionNumber = await generateSequence('SUB');

    let subtotal = 0;
    let taxAmount = 0;
    const subLines = [];

    for (const item of lines) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true }
      });
      if (!product) {
        res.status(400).json({ message: `Product ${item.productId} not found.` });
        return;
      }

      let unitPrice = product.salesPrice;
      if (item.variantId) {
        const v = product.variants.find(varItem => varItem.id === item.variantId);
        if (v) unitPrice += v.priceAdjustment;
      }

      const qty = Number(item.quantity) || 1;
      const discount = Number(item.discount || 0);
      const taxRate = Number(item.taxRate !== undefined ? item.taxRate : 18.0);

      const lineSub = Math.max(0, (unitPrice * qty) - discount);
      const lineTax = (lineSub * taxRate) / 100;

      subtotal += lineSub;
      taxAmount += lineTax;

      subLines.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: qty,
        unitPrice,
        taxRate,
        discount,
        lineTotal: lineSub
      });
    }

    const totalAmount = subtotal + taxAmount;

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        startDate: start,
        expiryDate: expiry,
        nextBillingDate: nextBilling,
        paymentTerms: paymentTerms as PaymentTerms,
        subtotal,
        taxAmount,
        discountAmount: 0.0,
        totalAmount,
        lines: { create: subLines }
      },
      include: {
        lines: true,
        plan: true,
        customer: { include: { user: true } }
      }
    });

    res.status(201).json({ message: 'Subscription created successfully', subscription });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating subscription', error: error.message });
  }
}

// Pause Subscription
export async function pauseSubscription(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true }
    });

    if (!sub) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    if (req.user?.role === Role.CUSTOMER && sub.customerId !== req.user.customerProfileId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    if (!sub.plan.allowPause) {
      res.status(400).json({ message: 'This plan does not permit pausing.' });
      return;
    }

    if (sub.status !== SubscriptionStatus.ACTIVE) {
      res.status(400).json({ message: `Cannot pause subscription in status ${sub.status}. Must be ACTIVE.` });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedAt: new Date()
      }
    });

    res.json({ message: 'Subscription paused successfully', subscription: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error pausing subscription', error: error.message });
  }
}

// Resume Subscription
export async function resumeSubscription(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true }
    });

    if (!sub) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    if (req.user?.role === Role.CUSTOMER && sub.customerId !== req.user.customerProfileId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    if (sub.status !== SubscriptionStatus.PAUSED) {
      res.status(400).json({ message: 'Subscription is not paused.' });
      return;
    }

    const pauseDurationMs = sub.pausedAt ? Date.now() - new Date(sub.pausedAt).getTime() : 0;
    const newExpiry = new Date(new Date(sub.expiryDate).getTime() + pauseDurationMs);
    const newNextBilling = new Date(new Date(sub.nextBillingDate).getTime() + pauseDurationMs);

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedAt: null,
        expiryDate: newExpiry,
        nextBillingDate: newNextBilling
      }
    });

    res.json({ message: 'Subscription resumed successfully', subscription: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error resuming subscription', error: error.message });
  }
}

// Renew Subscription
export async function renewSubscription(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, lines: { include: { product: true, variant: true } } }
    });

    if (!sub) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    if (req.user?.role === Role.CUSTOMER && sub.customerId !== req.user.customerProfileId) {
      res.status(403).json({ message: 'Forbidden' }); return;
    }

    if (!sub.plan.allowRenewal) {
      res.status(400).json({ message: 'This plan does not permit renewals.' });
      return;
    }

    if (sub.status === SubscriptionStatus.CLOSED || sub.status === SubscriptionStatus.DRAFT || sub.status === SubscriptionStatus.QUOTATION) {
      res.status(400).json({ message: 'This subscription is not eligible for renewal.' }); return;
    }
    if (sub.status === SubscriptionStatus.PAUSED) { res.status(400).json({ message: 'Resume the subscription before renewing.' }); return; }
    const key = String(req.headers['idempotency-key'] || req.body?.idempotencyKey || '').trim();
    if (!key) { res.status(400).json({ message: 'An idempotency key is required.' }); return; }
    const prior = await prisma.renewalHistory.findUnique({ where: { idempotencyKey: key } });
    if (prior && prior.subscriptionId !== id) { res.status(409).json({ message: 'That idempotency key was already used for a different subscription.' }); return; }
    if (prior) { const updated = await prisma.subscription.findUnique({ where: { id } }); res.json({ message: 'Subscription renewal already processed', subscription: updated, renewal: prior }); return; }
    const previousExpiry = new Date(sub.expiryDate);
    const newExpiry = calculateNextDate(previousExpiry, sub.plan.billingFrequency);
    const alreadyRenewed = await prisma.renewalHistory.findFirst({ where: { subscriptionId: id, previousExpiryDate: previousExpiry } });
    if (alreadyRenewed) { res.status(409).json({ message: 'This renewal period has already been confirmed.', renewal: alreadyRenewed }); return; }
    const invoiceNumber = await generateSequence('INV');
    const now = new Date();
    const dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + 7);
    const updated = await prisma.$transaction(async tx => {
      const customer = await tx.customerProfile.findUnique({ where: { id: sub.customerId }, select: { creditBalance: true } });
      const creditApplied = Math.round(Math.min(customer?.creditBalance || 0, sub.totalAmount) * 100) / 100;
      const outstanding = Math.max(0, Math.round((sub.totalAmount - creditApplied) * 100) / 100);
      const invoice = await tx.invoice.create({ data: { invoiceNumber, subscriptionId: id, customerId: sub.customerId, status: outstanding === 0 && creditApplied > 0 ? 'PAID' : 'CONFIRMED', invoiceDate: now, dueDate, subtotal: sub.subtotal, taxAmount: sub.taxAmount, discountAmount: sub.discountAmount, totalAmount: sub.totalAmount, creditApplied, paidAmount: creditApplied, outstandingBalance: outstanding, billingPeriodStart: previousExpiry, billingPeriodEnd: newExpiry, notes: `Confirmed renewal for ${sub.plan.name}`, lines: { create: sub.lines.map(line => ({ productId: line.productId, variantId: line.variantId, description: line.variant ? `${line.product.name} (${line.variant.variantName})` : line.product.name, quantity: line.quantity, unitPrice: line.unitPrice, taxRate: line.taxRate, discount: line.discount, lineTotal: line.lineTotal })) } } });
      if (creditApplied > 0) await tx.customerProfile.update({ where: { id: sub.customerId }, data: { creditBalance: { decrement: creditApplied } } });
      const result = await tx.subscription.update({ where: { id }, data: { expiryDate: newExpiry, nextBillingDate: newExpiry, status: SubscriptionStatus.ACTIVE } });
      const renewal = await tx.renewalHistory.create({ data: { subscriptionId: id, customerId: sub.customerId, previousExpiryDate: previousExpiry, newExpiryDate: newExpiry, renewalAmount: sub.totalAmount, planName: sub.plan.name, idempotencyKey: key } });
      await tx.auditLog.create({ data: { userId: req.user?.id, action: 'SUBSCRIPTION_RENEWED', entityType: 'Subscription', entityId: id, details: { idempotencyKey: key, invoiceNumber: invoice.invoiceNumber, previousExpiry: previousExpiry.toISOString(), newExpiry: newExpiry.toISOString() } } });
      return { ...result, renewal, invoice };
    });

    res.json({ message: 'Subscription renewed successfully', subscription: updated, renewal: updated.renewal, invoiceNumber: updated.invoice.invoiceNumber });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const key = String(req.headers['idempotency-key'] || req.body?.idempotencyKey || '').trim();
      const prior = key ? await prisma.renewalHistory.findUnique({ where: { idempotencyKey: key } }) : null;
      if (prior && prior.subscriptionId === String(req.params.id)) { res.json({ message: 'Subscription renewal already processed', renewal: prior }); return; }
      res.status(409).json({ message: 'This renewal period has already been confirmed.' }); return;
    }
    res.status(500).json({ message: 'Error renewing subscription', error: error.message });
  }
}

// Early Close Subscription
export async function closeSubscription(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true }
    });

    if (!sub) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    if (!sub.plan.allowEarlyClosure) {
      res.status(400).json({ message: 'This plan does not allow early closure.' });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CLOSED,
        earlyClosedAt: new Date()
      }
    });

    res.json({ message: 'Subscription closed successfully', subscription: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error closing subscription', error: error.message });
  }
}

// Upcoming renewals & Expired subscriptions
export async function getSubscriptionAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 86400000);

    const [upcomingRenewals, expiredSubscriptions] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiryDate: { lte: in30Days, gte: now }
        },
        include: { customer: { include: { user: true } }, plan: true }
      }),
      prisma.subscription.findMany({
        where: {
          OR: [
            { status: SubscriptionStatus.CLOSED },
            { expiryDate: { lt: now } }
          ]
        },
        include: { customer: { include: { user: true } }, plan: true }
      })
    ]);

    res.json({ upcomingRenewals, expiredSubscriptions });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching subscription analytics', error: error.message });
  }
}
