import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function getTaxes(req: Request, res: Response): Promise<void> {
  try {
    const taxes = await prisma.taxRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(taxes);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching tax rules', error: error.message });
  }
}

export async function createTax(req: Request, res: Response): Promise<void> {
  try {
    const { name, rate, isDefault, status } = req.body;

    if (!name || rate === undefined) {
      res.status(400).json({ message: 'Tax name and rate are required.' });
      return;
    }

    if (isDefault) {
      await prisma.taxRule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const tax = await prisma.taxRule.create({
      data: {
        name,
        rate: Number(rate),
        isDefault: Boolean(isDefault),
        status: status !== undefined ? Boolean(status) : true
      }
    });

    res.status(201).json({ message: 'Tax rule created successfully', tax });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating tax rule', error: error.message });
  }
}

export async function updateTax(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { name, rate, isDefault, status } = req.body;

    if (isDefault) {
      await prisma.taxRule.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false }
      });
    }

    const tax = await prisma.taxRule.update({
      where: { id },
      data: {
        name,
        rate: rate !== undefined ? Number(rate) : undefined,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
        status: status !== undefined ? Boolean(status) : undefined
      }
    });

    res.json({ message: 'Tax rule updated successfully', tax });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating tax rule', error: error.message });
  }
}

export async function deleteTax(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    await prisma.taxRule.delete({ where: { id } });
    res.json({ message: 'Tax rule deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting tax rule', error: error.message });
  }
}
