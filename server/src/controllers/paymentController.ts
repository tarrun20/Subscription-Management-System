import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PaymentMethod, InvoiceStatus, Role } from '@prisma/client';
import { generateSequence } from '../utils/validation';

export async function getPayments(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const filter = user.role === Role.CUSTOMER && user.customerProfileId
      ? { customerId: user.customerProfileId }
      : {};

    const payments = await prisma.payment.findMany({
      where: filter,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            outstandingBalance: true,
            status: true
          }
        },
        customer: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  try {
    const { invoiceId, amount, paymentMethod = 'BANK_TRANSFER', paymentDate, transactionRef, notes } = req.body;

    if (!invoiceId || amount === undefined || Number(amount) <= 0) {
      res.status(400).json({ message: 'Valid invoiceId and positive payment amount are required.' });
      return;
    }

    const payAmount = Number(amount);

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error('This invoice has already been fully paid.');
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error('Cannot record payment for a cancelled invoice.');
      }

      if (payAmount > invoice.outstandingBalance + 0.01) {
        throw new Error(`Payment amount (₹${payAmount}) exceeds invoice outstanding balance (₹${invoice.outstandingBalance}).`);
      }

      const paymentNumber = await generateSequence('PAY');
      const pDate = paymentDate ? new Date(paymentDate) : new Date();

      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: payAmount,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentDate: pDate,
          transactionRef,
          notes
        }
      });

      // 2. Update Invoice paidAmount and outstandingBalance
      const newPaidAmount = invoice.paidAmount + payAmount;
      const newOutstanding = Math.max(0, invoice.totalAmount - newPaidAmount);
      const isFullyPaid = newOutstanding <= 0.01;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          outstandingBalance: newOutstanding,
          status: isFullyPaid ? InvoiceStatus.PAID : invoice.status
        }
      });

      return { payment, invoice: updatedInvoice };
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: result.payment,
      invoice: result.invoice
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error recording payment' });
  }
}
