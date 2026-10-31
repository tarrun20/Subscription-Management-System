import { PrismaClient, Role, ProductType, BillingFrequency, PaymentTerms, InvoiceStatus, SubscriptionStatus, QuotationStatus, DiscountType, DiscountTarget, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Brightloop database...');

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.planProduct.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // Password meets rule: >8 chars, uppercase, lowercase, special char
  const adminPassword = await bcrypt.hash('Admin@123456#', 10);
  const staffPassword = await bcrypt.hash('Staff@123456#', 10);
  const customerPassword = await bcrypt.hash('Customer@123456#', 10);

  // 1. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@brightloop.com',
      passwordHash: adminPassword,
      name: 'Brightloop Super Admin',
      role: Role.ADMIN,
      phone: '+91 9876543210'
    }
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@brightloop.com',
      passwordHash: staffPassword,
      name: 'Rohan Sharma',
      role: Role.STAFF,
      phone: '+91 9876543211',
      staffProfile: {
        create: {
          employeeCode: 'BL-STF-001',
          department: 'Sales & Billing',
          designation: 'Senior Account Executive'
        }
      }
    }
  });

  const customerUser1 = await prisma.user.create({
    data: {
      email: 'acme@example.com',
      passwordHash: customerPassword,
      name: 'Rajesh Kumar',
      role: Role.CUSTOMER,
      phone: '+91 9876543212',
      customerProfile: {
        create: {
          companyName: 'Acme Technologies Pvt Ltd',
          taxNumber: '29ABCDE1234F1Z5',
          billingAddress: '42 MG Road, Cyber Park',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          zipCode: '560001'
        }
      }
    },
    include: { customerProfile: true }
  });

  const customerUser2 = await prisma.user.create({
    data: {
      email: 'globex@example.com',
      passwordHash: customerPassword,
      name: 'Sarah Chen',
      role: Role.CUSTOMER,
      phone: '+91 9876543213',
      customerProfile: {
        create: {
          companyName: 'Globex Digital Corp',
          taxNumber: '27AAACG0123M1Z9',
          billingAddress: '15 Financial Center',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          zipCode: '400051'
        }
      }
    },
    include: { customerProfile: true }
  });

  const customerUser3 = await prisma.user.create({
    data: {
      email: 'nova@example.com',
      passwordHash: customerPassword,
      name: 'Vikram Patel',
      role: Role.CUSTOMER,
      phone: '+91 9876543214',
      customerProfile: {
        create: {
          companyName: 'Nova Solutions India',
          taxNumber: '07AAACN5432P1Z2',
          billingAddress: '8 Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          zipCode: '110001'
        }
      }
    },
    include: { customerProfile: true }
  });

  console.log('Created Users & Profiles.');

  // 2. Tax Rules
  const gst18 = await prisma.taxRule.create({
    data: {
      name: 'GST 18%',
      rate: 18.0,
      isDefault: true,
      status: true
    }
  });

  const vat5 = await prisma.taxRule.create({
    data: {
      name: 'VAT 5%',
      rate: 5.0,
      isDefault: false,
      status: true
    }
  });

  // 3. Discount Rules
  const volumeDiscount = await prisma.discountRule.create({
    data: {
      name: 'Enterprise Volume Discount 10%',
      code: 'VOLUME10',
      type: DiscountType.PERCENTAGE,
      value: 10.0,
      minPurchaseAmount: 10000.0,
      minQuantity: 2,
      targetType: DiscountTarget.ALL,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      maxUsageLimit: 100,
      currentUsageCount: 1,
      status: true
    }
  });

  const welcomeDiscount = await prisma.discountRule.create({
    data: {
      name: 'New Customer Welcome ₹500 Off',
      code: 'WELCOME500',
      type: DiscountType.FIXED,
      value: 500.0,
      minPurchaseAmount: 3000.0,
      minQuantity: 1,
      targetType: DiscountTarget.ALL,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      maxUsageLimit: 50,
      currentUsageCount: 0,
      status: true
    }
  });

  // 4. Products & Variants (including Odoo Brand +560)
  const productSoftware = await prisma.product.create({
    data: {
      name: 'Business Software Suite',
      type: ProductType.SOFTWARE,
      salesPrice: 5000.0,
      costPrice: 2000.0,
      description: 'Comprehensive business enterprise suite for CRM, invoicing, and inventory.',
      variants: {
        create: [
          {
            variantName: 'Standard',
            priceAdjustment: 0.0,
            sku: 'BS-STD'
          },
          {
            variantName: 'Odoo Brand',
            priceAdjustment: 560.0, // Exactly as required by prompt!
            sku: 'BS-ODOO'
          }
        ]
      }
    },
    include: { variants: true }
  });

  const productAnalytics = await prisma.product.create({
    data: {
      name: 'Cloud Analytics Addon',
      type: ProductType.SOFTWARE,
      salesPrice: 1500.0,
      costPrice: 400.0,
      description: 'Real-time telemetry and revenue forecasting analytics addon.',
      variants: {
        create: [
          {
            variantName: 'Standard Analytics',
            priceAdjustment: 0.0,
            sku: 'ANA-STD'
          },
          {
            variantName: 'Pro AI Insights',
            priceAdjustment: 800.0,
            sku: 'ANA-PRO'
          }
        ]
      }
    },
    include: { variants: true }
  });

  const productSupport = await prisma.product.create({
    data: {
      name: '24/7 Priority Support',
      type: ProductType.SERVICE,
      salesPrice: 2500.0,
      costPrice: 800.0,
      description: 'Dedicated 24/7 technical architect SLA response support.'
    }
  });

  console.log('Created Products and Variants (including Odoo Brand +₹560).');

  // 5. Subscription Plans
  const monthlyPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Monthly Business Pro',
      description: 'Standard monthly plan for growing businesses.',
      price: 5000.0,
      billingFrequency: BillingFrequency.MONTHLY,
      minimumQuantity: 1,
      availableFrom: new Date('2026-01-01'),
      availableUntil: new Date('2028-12-31'),
      autoCloseOnExpiry: false,
      allowEarlyClosure: true,
      allowPause: true,
      allowRenewal: true,
      planProducts: {
        create: [
          { productId: productSoftware.id, isIncludedDefault: true },
          { productId: productAnalytics.id, isIncludedDefault: false }
        ]
      }
    }
  });

  const yearlyPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Yearly Enterprise Suite',
      description: 'Full enterprise suite with annual billing and 2 months free.',
      price: 50000.0,
      billingFrequency: BillingFrequency.YEARLY,
      minimumQuantity: 1,
      availableFrom: new Date('2026-01-01'),
      availableUntil: new Date('2028-12-31'),
      autoCloseOnExpiry: false,
      allowEarlyClosure: true,
      allowPause: true,
      allowRenewal: true,
      planProducts: {
        create: [
          { productId: productSoftware.id, isIncludedDefault: true },
          { productId: productAnalytics.id, isIncludedDefault: true },
          { productId: productSupport.id, isIncludedDefault: true }
        ]
      }
    }
  });

  const weeklyTrialPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Weekly Growth Trial',
      description: 'Weekly evaluation plan for testing features.',
      price: 1200.0,
      billingFrequency: BillingFrequency.WEEKLY,
      minimumQuantity: 1,
      autoCloseOnExpiry: true,
      allowEarlyClosure: true,
      allowPause: true,
      allowRenewal: true
    }
  });

  // 6. Quotation Templates
  const templateStandard = await prisma.quotationTemplate.create({
    data: {
      name: 'Standard Business Starter Offer',
      planId: monthlyPlan.id,
      validityDays: 30,
      notes: 'Standard 30-day validity offer for SME clients.'
    }
  });

  // 7. Quotations
  const odooVariant = productSoftware.variants.find(v => v.variantName === 'Odoo Brand')!;
  const standardVariant = productSoftware.variants.find(v => v.variantName === 'Standard')!;

  const quo1 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QUO-2026-0001',
      customerId: customerUser1.customerProfile!.id,
      templateId: templateStandard.id,
      planId: monthlyPlan.id,
      status: QuotationStatus.CONVERTED,
      validUntil: new Date(Date.now() + 30 * 86400000),
      subtotal: 5560.0, // 5000 + 560 Odoo brand
      taxAmount: 1000.8, // 18% of 5560
      discountAmount: 0.0,
      totalAmount: 6560.8,
      notes: 'Initial customized quote with Odoo Brand variant.',
      lines: {
        create: [
          {
            productId: productSoftware.id,
            variantId: odooVariant.id,
            quantity: 1,
            unitPrice: 5560.0,
            taxRate: 18.0,
            discount: 0.0,
            lineTotal: 5560.0
          }
        ]
      }
    }
  });

  const quo2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QUO-2026-0002',
      customerId: customerUser2.customerProfile!.id,
      planId: yearlyPlan.id,
      status: QuotationStatus.SENT,
      validUntil: new Date(Date.now() + 15 * 86400000),
      subtotal: 50000.0,
      taxAmount: 9000.0,
      discountAmount: 5000.0,
      totalAmount: 54000.0,
      notes: 'Yearly contract proposal with 10% enterprise discount.',
      lines: {
        create: [
          {
            productId: productSoftware.id,
            variantId: standardVariant.id,
            quantity: 1,
            unitPrice: 50000.0,
            taxRate: 18.0,
            discount: 5000.0,
            lineTotal: 45000.0
          }
        ]
      }
    }
  });

  // 8. Subscriptions
  // Active subscription for Acme (Customer 1)
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 86400000);
  const nextYear = new Date(now.getTime() + 365 * 86400000);

  const sub1 = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0001',
      customerId: customerUser1.customerProfile!.id,
      planId: monthlyPlan.id,
      quotationId: quo1.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: now,
      expiryDate: nextYear,
      nextBillingDate: nextMonth,
      paymentTerms: PaymentTerms.IMMEDIATE,
      subtotal: 5560.0,
      taxAmount: 1000.8,
      discountAmount: 0.0,
      totalAmount: 6560.8,
      lines: {
        create: [
          {
            productId: productSoftware.id,
            variantId: odooVariant.id,
            quantity: 1,
            unitPrice: 5560.0,
            taxRate: 18.0,
            discount: 0.0,
            lineTotal: 5560.0
          }
        ]
      }
    }
  });

  // Expired subscription for Nova Solutions
  const pastStart = new Date(now.getTime() - 90 * 86400000);
  const pastExpiry = new Date(now.getTime() - 30 * 86400000);

  const sub2 = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0002',
      customerId: customerUser3.customerProfile!.id,
      planId: weeklyTrialPlan.id,
      status: SubscriptionStatus.CLOSED,
      startDate: pastStart,
      expiryDate: pastExpiry,
      nextBillingDate: pastExpiry,
      paymentTerms: PaymentTerms.IMMEDIATE,
      subtotal: 1200.0,
      taxAmount: 216.0,
      discountAmount: 0.0,
      totalAmount: 1416.0,
      lines: {
        create: [
          {
            productId: productSoftware.id,
            variantId: standardVariant.id,
            quantity: 1,
            unitPrice: 1200.0,
            taxRate: 18.0,
            discount: 0.0,
            lineTotal: 1200.0
          }
        ]
      }
    }
  });

  // 9. Invoices
  // Invoice 1: Paid invoice for Acme
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      subscriptionId: sub1.id,
      customerId: customerUser1.customerProfile!.id,
      status: InvoiceStatus.PAID,
      invoiceDate: new Date(now.getTime() - 25 * 86400000),
      dueDate: new Date(now.getTime() - 10 * 86400000),
      subtotal: 5560.0,
      taxAmount: 1000.8,
      discountAmount: 0.0,
      totalAmount: 6560.8,
      paidAmount: 6560.8,
      outstandingBalance: 0.0,
      billingPeriodStart: new Date(now.getTime() - 30 * 86400000),
      billingPeriodEnd: now,
      notes: 'First month subscription invoice for Odoo Brand variant.',
      lines: {
        create: [
          {
            productId: productSoftware.id,
            variantId: odooVariant.id,
            description: 'Business Software Suite - Odoo Brand',
            quantity: 1,
            unitPrice: 5560.0,
            taxRate: 18.0,
            discount: 0.0,
            lineTotal: 5560.0
          }
        ]
      }
    }
  });

  // Payment for Invoice 1
  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-0001',
      invoiceId: inv1.id,
      customerId: customerUser1.customerProfile!.id,
      amount: 6560.8,
      paymentMethod: PaymentMethod.UPI,
      paymentDate: new Date(now.getTime() - 20 * 86400000),
      transactionRef: 'UPI-982348271034',
      notes: 'Paid via GPay Business'
    }
  });

  // Invoice 2: Confirmed with Partial Payment for Acme (Next cycle preview)
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      subscriptionId: sub1.id,
      customerId: customerUser1.customerProfile!.id,
      status: InvoiceStatus.CONFIRMED,
      invoiceDate: now,
      dueDate: new Date(now.getTime() + 15 * 86400000),
      subtotal: 5560.0,
      taxAmount: 1000.8,
      discountAmount: 0.0,
      totalAmount: 6560.8,
      paidAmount: 2000.0,
      outstandingBalance: 4560.8,
      billingPeriodStart: now,
      billingPeriodEnd: nextMonth,
      notes: 'Current billing cycle. Partial payment received.',
      lines: {
        create: [
          {
            productId: productSoftware.id,
            variantId: odooVariant.id,
            description: 'Business Software Suite - Odoo Brand',
            quantity: 1,
            unitPrice: 5560.0,
            taxRate: 18.0,
            discount: 0.0,
            lineTotal: 5560.0
          }
        ]
      }
    }
  });

  // Partial Payment for Invoice 2
  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-0002',
      invoiceId: inv2.id,
      customerId: customerUser1.customerProfile!.id,
      amount: 2000.0,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDate: now,
      transactionRef: 'NEFT-AXIS-992341',
      notes: 'Part advance payment recorded'
    }
  });

  // Invoice 3: Overdue Invoice for Nova Solutions
  const overdueDate = new Date(now.getTime() - 15 * 86400000);
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0003',
      subscriptionId: sub2.id,
      customerId: customerUser3.customerProfile!.id,
      status: InvoiceStatus.CONFIRMED,
      invoiceDate: new Date(now.getTime() - 35 * 86400000),
      dueDate: overdueDate,
      subtotal: 1200.0,
      taxAmount: 216.0,
      discountAmount: 0.0,
      totalAmount: 1416.0,
      paidAmount: 0.0,
      outstandingBalance: 1416.0,
      billingPeriodStart: new Date(now.getTime() - 60 * 86400000),
      billingPeriodEnd: new Date(now.getTime() - 30 * 86400000),
      notes: 'Overdue invoice pending collection chase.',
      lines: {
        create: [
          {
            productId: productSoftware.id,
            variantId: standardVariant.id,
            description: 'Weekly Growth Trial',
            quantity: 1,
            unitPrice: 1200.0,
            taxRate: 18.0,
            discount: 0.0,
            lineTotal: 1200.0
          }
        ]
      }
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
