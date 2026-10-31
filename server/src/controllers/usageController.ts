import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function listUsage(req: Request, res: Response): Promise<void> {
  const subscriptionId = String(req.params.id);
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId }, select: { id: true } });
  if (!subscription) { res.status(404).json({ message: 'Subscription not found.' }); return; }
  res.json(await prisma.usageRecord.findMany({ where: { subscriptionId }, orderBy: { createdAt: 'desc' }, take: 250 }));
}

export async function recordUsage(req: Request, res: Response): Promise<void> {
  const subscriptionId = String(req.params.id);
  const { description, quantity, unitPrice, taxRate = 0 } = req.body;
  const q = Number(quantity), price = Number(unitPrice), tax = Number(taxRate);
  if (!String(description || '').trim() || !Number.isFinite(q) || q <= 0 || !Number.isFinite(price) || price < 0 || !Number.isFinite(tax) || tax < 0 || tax > 100) { res.status(400).json({ message: 'Provide a description, positive quantity, non-negative unit price, and tax rate from 0 to 100.' }); return; }
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId }, select: { id: true, status: true } });
  if (!subscription) { res.status(404).json({ message: 'Subscription not found.' }); return; }
  if (!['ACTIVE', 'PAUSED'].includes(subscription.status)) { res.status(400).json({ message: 'Usage can only be added to active or paused subscriptions.' }); return; }
  const record = await prisma.usageRecord.create({ data: { subscriptionId, description: String(description).trim().slice(0, 240), quantity: q, unitPrice: price, taxRate: tax, recordedBy: req.user!.id } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: 'USAGE_RECORDED', entityType: 'Subscription', entityId: subscriptionId, details: { usageRecordId: record.id, quantity: q, unitPrice: price } } });
  res.status(201).json({ message: 'Usage recorded for the next invoice.', usage: record });
}
