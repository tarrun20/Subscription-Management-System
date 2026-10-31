import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma';

export async function generateInvoicePdfBuffer(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: {
        include: { user: true }
      },
      subscription: {
        include: { plan: true }
      },
      lines: true,
      payments: true
    }
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', reject);

    // Header: Company details
    doc.fillColor('#1E293B').fontSize(22).font('Helvetica-Bold').text('BRIGHTLOOP SOFTWARE', 40, 40);
    doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('Cloud Solutions & Enterprise Subscription Platform', 40, 68);
    doc.text('GSTIN: 29AABCU9603R1ZM | contact@brightloop.com | www.brightloop.com', 40, 80);

    // Invoice Meta (Right side)
    doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 400, 40, { align: 'right' });
    doc.fillColor('#475569').fontSize(10).font('Helvetica');
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 400, 65, { align: 'right' });
    doc.text(`Date: ${invoice.invoiceDate.toISOString().split('T')[0]}`, 400, 80, { align: 'right' });
    doc.text(`Due Date: ${invoice.dueDate.toISOString().split('T')[0]}`, 400, 95, { align: 'right' });
    doc.text(`Status: ${invoice.status}`, 400, 110, { align: 'right' });

    doc.moveTo(40, 130).lineTo(555, 130).strokeColor('#CBD5E1').stroke();

    // Bill To
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('BILL TO:', 40, 145);
    doc.fillColor('#334155').fontSize(10).font('Helvetica');
    const customer = invoice.customer;
    doc.text(customer.companyName || customer.user.name, 40, 160);
    if (customer.companyName) doc.text(`Attn: ${customer.user.name}`, 40, 175);
    doc.text(customer.billingAddress || 'Billing Address Not Specified', 40, 190);
    doc.text(`${customer.city || ''}, ${customer.state || ''} ${customer.zipCode || ''} ${customer.country || ''}`, 40, 205);
    if (customer.taxNumber) doc.text(`Tax ID / GST: ${customer.taxNumber}`, 40, 220);

    // Subscription & Billing Period
    if (invoice.subscription) {
      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('SUBSCRIPTION DETAILS:', 320, 145);
      doc.fillColor('#334155').fontSize(10).font('Helvetica');
      doc.text(`Sub Ref: ${invoice.subscription.subscriptionNumber}`, 320, 160);
      doc.text(`Plan: ${invoice.subscription.plan.name}`, 320, 175);
      if (invoice.billingPeriodStart && invoice.billingPeriodEnd) {
        doc.text(`Period: ${invoice.billingPeriodStart.toISOString().split('T')[0]} to ${invoice.billingPeriodEnd.toISOString().split('T')[0]}`, 320, 190);
      }
    }

    // Line Items Table Header
    const tableTop = 250;
    doc.rect(40, tableTop, 515, 22).fill('#F1F5F9');
    doc.fillColor('#1E293B').fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 50, tableTop + 6);
    doc.text('QTY', 280, tableTop + 6, { width: 40, align: 'center' });
    doc.text('UNIT PRICE (₹)', 330, tableTop + 6, { width: 70, align: 'right' });
    doc.text('TAX %', 410, tableTop + 6, { width: 40, align: 'right' });
    doc.text('TOTAL (₹)', 460, tableTop + 6, { width: 85, align: 'right' });

    let currentY = tableTop + 28;
    doc.font('Helvetica').fontSize(9);

    for (const item of invoice.lines) {
      doc.fillColor('#334155');
      doc.text(item.description, 50, currentY, { width: 220 });
      doc.text(String(item.quantity), 280, currentY, { width: 40, align: 'center' });
      doc.text(item.unitPrice.toFixed(2), 330, currentY, { width: 70, align: 'right' });
      doc.text(`${item.taxRate}%`, 410, currentY, { width: 40, align: 'right' });
      doc.text(item.lineTotal.toFixed(2), 460, currentY, { width: 85, align: 'right' });
      currentY += 20;
    }

    doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor('#E2E8F0').stroke();
    currentY += 15;

    // Financial Totals block (Right aligned)
    const summaryX = 350;
    doc.fillColor('#475569').fontSize(9);
    doc.text('Subtotal:', summaryX, currentY);
    doc.text(`₹${invoice.subtotal.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
    currentY += 16;

    if (invoice.discountAmount > 0) {
      doc.text('Discount Applied:', summaryX, currentY);
      doc.text(`- ₹${invoice.discountAmount.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
      currentY += 16;
    }

    doc.text('Taxes (GST):', summaryX, currentY);
    doc.text(`+ ₹${invoice.taxAmount.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
    currentY += 16;

    doc.rect(340, currentY - 4, 215, 24).fill('#F8FAFC');
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11);
    doc.text('Total Amount:', summaryX, currentY + 2);
    doc.text(`₹${invoice.totalAmount.toFixed(2)}`, 460, currentY + 2, { width: 85, align: 'right' });
    currentY += 28;

    doc.font('Helvetica').fontSize(9).fillColor('#16A34A');
    doc.text('Paid Amount:', summaryX, currentY);
    doc.text(`₹${invoice.paidAmount.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
    currentY += 16;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(invoice.outstandingBalance > 0 ? '#DC2626' : '#16A34A');
    doc.text('Balance Due:', summaryX, currentY);
    doc.text(`₹${invoice.outstandingBalance.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

    // Payment History Table if any
    if (invoice.payments && invoice.payments.length > 0) {
      currentY += 35;
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Recorded Payments:', 40, currentY);
      currentY += 15;
      for (const p of invoice.payments) {
        doc.font('Helvetica').fontSize(8).fillColor('#475569');
        doc.text(`• ${p.paymentDate.toISOString().split('T')[0]} - ${p.paymentNumber} via ${p.paymentMethod}: ₹${p.amount.toFixed(2)} (${p.transactionRef || 'No ref'})`, 45, currentY);
        currentY += 12;
      }
    }

    // Footer
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
      .text('Thank you for choosing Brightloop Software. For billing inquiries, email billing@brightloop.com.', 40, 770, { align: 'center', width: 515 });

    doc.end();
  });
}
