import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { DiscountType, DiscountTarget } from '@prisma/client';

export async function getDiscounts(req: Request, res: Response): Promise<void> {
  try {
    const discounts = await prisma.discountRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(discounts);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching discount rules', error: error.message });
  }
}

export async function createDiscount(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      code,
      type,
      value,
      minPurchaseAmount,
      minQuantity,
      targetType,
      targetId,
      startDate,
      endDate,
      maxUsageLimit
    } = req.body;

    if (!name || !code || value === undefined) {
      res.status(400).json({ message: 'Name, code, and value are required.' });
      return;
    }

    const existing = await prisma.discountRule.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (existing) {
      res.status(409).json({ message: 'Discount code already exists.' });
      return;
    }

    const discount = await prisma.discountRule.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        type: type || DiscountType.PERCENTAGE,
        value: Number(value),
        minPurchaseAmount: Number(minPurchaseAmount || 0),
        minQuantity: Number(minQuantity || 1),
        targetType: targetType || DiscountTarget.ALL,
        targetId: targetId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        maxUsageLimit: maxUsageLimit ? Number(maxUsageLimit) : null,
        status: true
      }
    });

    res.status(201).json({ message: 'Discount rule created successfully', discount });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating discount rule', error: error.message });
  }
}

export async function updateDiscount(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { name, value, minPurchaseAmount, minQuantity, maxUsageLimit, status, startDate, endDate } = req.body;

    const updated = await prisma.discountRule.update({
      where: { id },
      data: {
        name,
        value: value !== undefined ? Number(value) : undefined,
        minPurchaseAmount: minPurchaseAmount !== undefined ? Number(minPurchaseAmount) : undefined,
        minQuantity: minQuantity !== undefined ? Number(minQuantity) : undefined,
        maxUsageLimit: maxUsageLimit !== undefined ? (maxUsageLimit ? Number(maxUsageLimit) : null) : undefined,
        status: status !== undefined ? Boolean(status) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined
      }
    });

    res.json({ message: 'Discount rule updated successfully', discount: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating discount rule', error: error.message });
  }
}

export async function deleteDiscount(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    await prisma.discountRule.delete({ where: { id } });
    res.json({ message: 'Discount rule deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting discount rule', error: error.message });
  }
}
