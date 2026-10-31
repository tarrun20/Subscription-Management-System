import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { emailService } from './emailService';

const REMINDER_STAGES = [1, 7, 14];

export async function runDunningReminders() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const invoices = await prisma.invoice.findMany({
    where: { status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] }, outstandingBalance: { gt: 0 }, dueDate: { lt: today } },
    include: { customer: { include: { user: { select: { id: true, name: true, email: true } } } } }
  });
  let sent = 0;
  for (const invoice of invoices) {
    const daysOverdue = Math.floor((today.getTime() - new Date(invoice.dueDate).setHours(0, 0, 0, 0)) / 86400000);
    const eligibleStages = REMINDER_STAGES.filter(n => daysOverdue >= n);
    const stage = eligibleStages[eligibleStages.length - 1];
    if (!stage) continue;
    const action = `DUNNING_REMINDER_${stage}D`;
    const prior = await prisma.auditLog.findFirst({ where: { entityType: 'Invoice', entityId: invoice.id, action } });
    if (prior) continue;
    const delivery = await emailService.sendPaymentReminder({ to: invoice.customer.user.email, customerName: invoice.customer.user.name, invoiceNumber: invoice.invoiceNumber, dueDate: invoice.dueDate, balance: invoice.outstandingBalance, daysOverdue });
    await prisma.auditLog.create({ data: { userId: invoice.customer.user.id, action, entityType: 'Invoice', entityId: invoice.id, details: { stageDays: stage, deliveryStatus: delivery.deliveryStatus, error: delivery.error || null } } });
    if (delivery.success) sent++;
  }
  return { invoicesChecked: invoices.length, remindersSent: sent };
}
