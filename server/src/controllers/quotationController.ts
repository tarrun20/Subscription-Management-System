import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { QuotationStatus, SubscriptionStatus, PaymentTerms, Role } from '@prisma/client';
import { generateSequence } from '../utils/validation';
import { calculateNextDate } from '../services/billingService';

// Quotation Templates
export async function getTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { name, planId, validityDays, notes } = req.body;
    if (!name) {
      res.status(400).json({ message: 'Template name is required.' });
      return;
    }
    const template = await prisma.quotationTemplate.create({
      data: {
        name,
        planId: planId || null,
        validityDays: Number(validityDays || 30),
        notes
      },
      include: { plan: true }
    });
    res.status(201).json({ message: 'Template created successfully', template });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating template', error: error.message });
  }
}

// Quotations
export async function getQuotations(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const filter = user.role === Role.CUSTOMER && user.customerProfileId
      ? { customerId: user.customerProfileId }
      : {};

    const quotations = await prisma.quotation.findMany({
      where: filter,
      include: {
        customer: {
          include: { user: { select: { name: true, email: true, phone: true } } }
        },
        plan: true,
        template: true,
        lines: {
          include: {
            product: true,
            variant: true
          }
        },
        subscription: {
          select: { id: true, subscriptionNumber: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotations);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching quotations', error: error.message });
  }
}

export async function getQuotationById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: {
          include: { user: true }
        },
        plan: true,
        template: true,
        lines: {
          include: {
            product: true,
            variant: true
          }
        },
        subscription: true
      }
    });

    if (!quotation) {
      res.status(404).json({ message: 'Quotation not found' });
      return;
    }

    if (req.user?.role === Role.CUSTOMER && quotation.customerId !== req.user.customerProfileId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    res.json(quotation);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching quotation', error: error.message });
  }
}

export async function createQuotation(req: Request, res: Response): Promise<void> {
  try {
    const {
      customerId,
      planId,
      templateId,
      validityDays = 30,
      notes,
      lines
    } = req.body;

    if (!customerId || !lines || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ message: 'Customer ID and at least one product line are required.' });
      return;
    }

    const quotationNumber = await generateSequence('QUO');
    const validUntil = new Date(Date.now() + Number(validityDays) * 86400000);

    let subtotal = 0;
    let taxAmount = 0;
    const quotationLines = [];

    for (const item of lines) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true }
      });

      if (!product) {
        res.status(400).json({ message: `Product ID ${item.productId} not found.` });
        return;
      }

      let unitPrice = product.salesPrice;
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (variant) {
          unitPrice += variant.priceAdjustment;
        }
      }

      const qty = Number(item.quantity) || 1;
      const discount = Number(item.discount || 0);
      const taxRate = Number(item.taxRate !== undefined ? item.taxRate : 18.0);

      const lineSub = Math.max(0, (unitPrice * qty) - discount);
      const lineTax = (lineSub * taxRate) / 100;

      subtotal += lineSub;
      taxAmount += lineTax;

      quotationLines.push({
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

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId,
        planId: planId || null,
        templateId: templateId || null,
        status: QuotationStatus.DRAFT,
        validUntil,
        subtotal,
        taxAmount,
        discountAmount: 0.0,
        totalAmount,
        notes,
        lines: {
          create: quotationLines
        }
      },
      include: {
        lines: true,
        customer: { include: { user: true } },
        plan: true
      }
    });

    res.status(201).json({ message: 'Quotation created successfully', quotation });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating quotation', error: error.message });
  }
}

export async function updateQuotationStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status }
    });

    res.json({ message: `Quotation status updated to ${status}`, quotation });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating quotation status', error: error.message });
  }
}

export async function convertToSubscription(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { paymentTerms = 'IMMEDIATE', startDate } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        lines: true,
        plan: true,
        customer: true,
        subscription: true
      }
    });

    if (!quotation) {
      res.status(404).json({ message: 'Quotation not found' });
      return;
    }

    if (quotation.subscription) {
      res.status(400).json({
        message: 'This quotation has already been converted to subscription',
        subscriptionId: quotation.subscription.id
      });
      return;
    }

    if (!quotation.planId || !quotation.plan) {
      res.status(400).json({ message: 'Quotation must have an associated subscription plan to convert.' });
      return;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const trialEnds = quotation.plan.trialDays > 0 ? new Date(start.getTime() + quotation.plan.trialDays * 86400000) : null;
    const nextBilling = trialEnds || calculateNextDate(start, quotation.plan.billingFrequency);
    const expiry = new Date(trialEnds || start);
    expiry.setFullYear(expiry.getFullYear() + 1);

    const subscriptionNumber = await generateSequence('SUB');

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: quotation.customerId,
          planId: quotation.planId!,
          quotationId: quotation.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: start,
          expiryDate: expiry,
          nextBillingDate: nextBilling,
          trialEndsAt: trialEnds,
          paymentTerms: paymentTerms as PaymentTerms,
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          discountAmount: quotation.discountAmount,
          totalAmount: quotation.totalAmount,
          lines: {
            create: quotation.lines.map((l: any) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxRate: l.taxRate,
              discount: l.discount,
              lineTotal: l.lineTotal
            }))
          }
        },
        include: {
          lines: true,
          plan: true,
          customer: { include: { user: true } }
        }
      });

      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: QuotationStatus.CONVERTED }
      });

      return sub;
    });

    res.status(201).json({
      message: 'Quotation successfully converted to active subscription',
      subscription
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error converting quotation to subscription', error: error.message });
  }
}
