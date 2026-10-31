import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { BillingFrequency } from '@prisma/client';

export async function getPlans(req: Request, res: Response): Promise<void> {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        planProducts: {
          include: {
            product: {
              include: { variants: true }
            }
          }
        },
        _count: {
          select: { subscriptions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching plans', error: error.message });
  }
}

export async function getPlanById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        planProducts: {
          include: {
            product: {
              include: { variants: true }
            }
          }
        }
      }
    });

    if (!plan) {
      res.status(404).json({ message: 'Subscription plan not found' });
      return;
    }
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching plan', error: error.message });
  }
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      description,
      price,
      billingFrequency,
      minimumQuantity,
      trialDays = 0,
      availableFrom,
      availableUntil,
      autoCloseOnExpiry,
      allowEarlyClosure,
      allowPause,
      allowRenewal,
      productIds
    } = req.body;

    if (!name || price === undefined || !billingFrequency) {
      res.status(400).json({ message: 'Name, price, and billing frequency are required.' });
      return;
    }

    if (price < 0) {
      res.status(400).json({ message: 'Price cannot be negative.' });
      return;
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price: Number(price),
        billingFrequency: billingFrequency as BillingFrequency,
        minimumQuantity: Number(minimumQuantity || 1),
        trialDays: Math.max(0, Math.floor(Number(trialDays) || 0)),
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
        autoCloseOnExpiry: Boolean(autoCloseOnExpiry),
        allowEarlyClosure: allowEarlyClosure !== undefined ? Boolean(allowEarlyClosure) : true,
        allowPause: allowPause !== undefined ? Boolean(allowPause) : true,
        allowRenewal: allowRenewal !== undefined ? Boolean(allowRenewal) : true,
        planProducts: productIds && Array.isArray(productIds) ? {
          create: productIds.map((pId: string) => ({
            productId: pId,
            isIncludedDefault: true
          }))
        } : undefined
      },
      include: {
        planProducts: {
          include: { product: true }
        }
      }
    });

    res.status(201).json({ message: 'Plan created successfully', plan });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating plan', error: error.message });
  }
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const {
      name,
      description,
      price,
      billingFrequency,
      minimumQuantity,
      trialDays,
      availableFrom,
      availableUntil,
      autoCloseOnExpiry,
      allowEarlyClosure,
      allowPause,
      allowRenewal,
      status,
      productIds
    } = req.body;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Plan not found' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (productIds && Array.isArray(productIds)) {
        await tx.planProduct.deleteMany({ where: { planId: id } });
        await tx.planProduct.createMany({
          data: productIds.map((pId: string) => ({
            planId: id,
            productId: pId,
            isIncludedDefault: true
          }))
        });
      }

      return tx.subscriptionPlan.update({
        where: { id },
        data: {
          name: name ?? existing.name,
          description: description !== undefined ? description : existing.description,
          price: price !== undefined ? Number(price) : existing.price,
          billingFrequency: billingFrequency ?? existing.billingFrequency,
          minimumQuantity: minimumQuantity !== undefined ? Number(minimumQuantity) : existing.minimumQuantity,
          trialDays: trialDays !== undefined ? Math.max(0, Math.floor(Number(trialDays) || 0)) : existing.trialDays,
          availableFrom: availableFrom !== undefined ? (availableFrom ? new Date(availableFrom) : null) : existing.availableFrom,
          availableUntil: availableUntil !== undefined ? (availableUntil ? new Date(availableUntil) : null) : existing.availableUntil,
          autoCloseOnExpiry: autoCloseOnExpiry !== undefined ? Boolean(autoCloseOnExpiry) : existing.autoCloseOnExpiry,
          allowEarlyClosure: allowEarlyClosure !== undefined ? Boolean(allowEarlyClosure) : existing.allowEarlyClosure,
          allowPause: allowPause !== undefined ? Boolean(allowPause) : existing.allowPause,
          allowRenewal: allowRenewal !== undefined ? Boolean(allowRenewal) : existing.allowRenewal,
          status: status ?? existing.status
        },
        include: {
          planProducts: {
            include: { product: true }
          }
        }
      });
    });

    res.json({ message: 'Plan updated successfully', plan: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating plan', error: error.message });
  }
}

export async function deletePlan(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    await prisma.subscriptionPlan.delete({ where: { id } });
    res.json({ message: 'Plan deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting plan', error: error.message });
  }
}
