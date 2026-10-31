import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

const csvCell = (value: unknown) => {
  const raw = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function exportLedger(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const customerId = user.role === Role.CUSTOMER ? user.customerProfileId : (req.query.customerId ? String(req.query.customerId) : undefined);
  if (user.role === Role.CUSTOMER && !customerId) { res.status(403).json({ message: 'Customer profile not found.' }); return; }
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({ where: customerId ? { customerId } : {}, include: { customer: { include: { user: { select: { name: true, email: true } } } } }, orderBy: { invoiceDate: 'desc' } }),
    prisma.payment.findMany({ where: customerId ? { customerId } : {}, include: { invoice: { select: { invoiceNumber: true } }, customer: { include: { user: { select: { name: true, email: true } } } } }, orderBy: { paymentDate: 'desc' } })
  ]);
  const lines = [['Type','Reference','Customer','Email','Date','Due Date','Amount','Paid','Balance','Status','Method','Transaction Ref'].map(csvCell).join(',')];
  for (const i of invoices) lines.push(['Invoice',i.invoiceNumber,i.customer.user.name,i.customer.user.email,i.invoiceDate.toISOString(),i.dueDate.toISOString(),i.totalAmount,i.paidAmount,i.outstandingBalance,i.status,'',''].map(csvCell).join(','));
  for (const p of payments) lines.push(['Payment',p.paymentNumber,p.customer.user.name,p.customer.user.email,p.paymentDate.toISOString(),'',p.amount,p.amount,0,'RECORDED',p.paymentMethod,p.transactionRef].map(csvCell).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="brightloop-ledger.csv"');
  res.send(lines.join('\r\n'));
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const take = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const logs = await prisma.auditLog.findMany({ where: req.query.entityType ? { entityType: String(req.query.entityType) } : {}, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take });
  res.json(logs);
}
