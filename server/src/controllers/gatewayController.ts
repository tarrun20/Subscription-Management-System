import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { generateSequence } from '../utils/validation';

export async function createCheckoutOrder(req: Request, res: Response): Promise<void> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) { res.status(503).json({ message: 'Online payment is not configured. Contact billing support.' }); return; }
  const invoice = await prisma.invoice.findUnique({ where: { id: String(req.params.invoiceId) } });
  if (!invoice) { res.status(404).json({ message: 'Invoice not found.' }); return; }
  if (req.user?.role === 'CUSTOMER' && invoice.customerId !== req.user.customerProfileId) { res.status(403).json({ message: 'Forbidden' }); return; }
  if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED || invoice.outstandingBalance <= 0) { res.status(400).json({ message: 'This invoice cannot accept a payment.' }); return; }
  const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.round(invoice.outstandingBalance * 100), currency: 'INR', receipt: invoice.invoiceNumber, notes: { invoiceId: invoice.id } }) });
  const order: any = await response.json().catch(() => ({}));
  if (!response.ok) { res.status(502).json({ message: order.error?.description || 'Payment provider could not create an order.' }); return; }
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: 'PAYMENT_CHECKOUT_CREATED', entityType: 'Invoice', entityId: invoice.id, details: { orderId: order.id } } });
  res.status(201).json({ keyId, order, invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, outstandingBalance: invoice.outstandingBalance } });
}

async function recordGatewayPayment(invoiceId: string, paymentId: string, amountPaise: number) {
  const prior = await prisma.payment.findUnique({ where: { providerPaymentId: paymentId } });
  if (prior) return prior;
  return prisma.$transaction(async tx => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.status === InvoiceStatus.CANCELLED) throw new Error('Invoice not payable');
    const amount = amountPaise / 100;
    if (amount > invoice.outstandingBalance + 0.01) throw new Error('Captured payment exceeds invoice balance');
    const payment = await tx.payment.create({ data: { paymentNumber: await generateSequence('PAY'), invoiceId, customerId: invoice.customerId, amount, paymentMethod: PaymentMethod.CARD, transactionRef: paymentId, providerPaymentId: paymentId, notes: 'Razorpay captured payment' } });
    const balance = Math.max(0, invoice.outstandingBalance - amount);
    await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: invoice.paidAmount + amount, outstandingBalance: balance, status: balance <= 0.01 ? InvoiceStatus.PAID : invoice.status } });
    return payment;
  });
}

export async function verifyCheckoutPayment(req: Request, res: Response): Promise<void> {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) { res.status(503).json({ message: 'Online payment is not configured.' }); return; }
  const { invoiceId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  const audit = await prisma.auditLog.findFirst({ where: { action: 'PAYMENT_CHECKOUT_CREATED', entityId: String(invoiceId), details: { path: ['orderId'], equals: String(orderId) } }, orderBy: { createdAt: 'desc' } });
  if (!audit) { res.status(400).json({ message: 'Checkout order was not found.' }); return; }
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(String(signature), 'hex'); } catch { supplied = Buffer.alloc(0); }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) { res.status(400).json({ message: 'Payment verification failed.' }); return; }
  if (!audit.entityId) { res.status(400).json({ message: 'Checkout invoice reference is missing.' }); return; }
  const invoice = await prisma.invoice.findUnique({ where: { id: audit.entityId } });
  if (!invoice || (req.user?.role === 'CUSTOMER' && invoice.customerId !== req.user.customerProfileId)) { res.status(403).json({ message: 'Forbidden' }); return; }
  const providerPayment = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(String(paymentId))}`, { headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${secret}`).toString('base64')}` } });
  const paymentData: any = await providerPayment.json().catch(() => ({}));
  if (!providerPayment.ok || paymentData.status !== 'captured' || paymentData.order_id !== orderId) { res.status(400).json({ message: 'Payment has not been captured.' }); return; }
  const payment = await recordGatewayPayment(audit.entityId, String(paymentId), Number(paymentData.amount));
  res.json({ message: 'Payment verified and applied.', payment });
}

export async function razorpayWebhook(req: Request, res: Response): Promise<void> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) { res.status(503).send('Webhook not configured'); return; }
  const signature = String(req.headers['x-razorpay-signature'] || '');
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, 'hex'); } catch { supplied = Buffer.alloc(0); }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) { res.status(400).send('Invalid signature'); return; }
  const event = JSON.parse(raw.toString('utf8'));
  if (event.event === 'payment.captured') {
    const entity = event.payload?.payment?.entity;
    const orderId = entity?.order_id;
    const audit = orderId ? await prisma.auditLog.findFirst({ where: { action: 'PAYMENT_CHECKOUT_CREATED', details: { path: ['orderId'], equals: orderId } }, orderBy: { createdAt: 'desc' } }) : null;
    if (audit?.entityId && entity?.id) await recordGatewayPayment(audit.entityId, entity.id, Number(entity.amount));
  }
  res.json({ received: true });
}
