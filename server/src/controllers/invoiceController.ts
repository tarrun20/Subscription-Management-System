import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { InvoiceStatus, Role } from '@prisma/client';
import { generateInvoicePdfBuffer } from '../services/pdfService';

export async function getInvoices(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { status, customerId, overdue } = req.query;

    let filter: any = {};

    if (user.role === Role.CUSTOMER && user.customerProfileId) {
      filter.customerId = user.customerProfileId;
    } else if (customerId) {
      filter.customerId = String(customerId);
    }

    if (status) {
      filter.status = status as InvoiceStatus;
    }

    if (overdue === 'true') {
      filter.status = { not: InvoiceStatus.PAID };
      filter.dueDate = { lt: new Date() };
    }

    const invoices = await prisma.invoice.findMany({
      where: filter,
      include: {
        customer: {
          include: { user: { select: { name: true, email: true, phone: true } } }
        },
        subscription: {
          include: { plan: { select: { name: true, billingFrequency: true } } }
        },
        lines: true,
        payments: true
      },
      orderBy: { invoiceDate: 'desc' }
    });

    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
}

export async function getInvoiceById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          include: { user: true }
        },
        subscription: {
          include: { plan: true }
        },
        lines: {
          include: { product: true, variant: true }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (req.user?.role === Role.CUSTOMER && invoice.customerId !== req.user.customerProfileId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
}

export async function confirmInvoice(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      res.status(400).json({ message: `Cannot confirm invoice with status ${invoice.status}` });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CONFIRMED }
    });

    res.json({ message: 'Invoice confirmed successfully', invoice: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error confirming invoice', error: error.message });
  }
}

export async function cancelInvoice(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (invoice.status === InvoiceStatus.PAID) {
      res.status(400).json({ message: 'Cannot cancel an invoice that has already been paid.' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED }
    });

    res.json({ message: 'Invoice cancelled successfully', invoice: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error cancelling invoice', error: error.message });
  }
}

export async function downloadInvoicePdf(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (req.user?.role === Role.CUSTOMER && invoice.customerId !== req.user.customerProfileId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const pdfBuffer = await generateInvoicePdfBuffer(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF error:', error);
    res.status(500).json({ message: 'Error generating PDF invoice', error: error.message });
  }
}
