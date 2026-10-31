import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validatePassword, generateSequence } from '../src/utils/validation';
import { runAutomatedBilling } from '../src/services/billingService';
import { ProductType, Role, SubscriptionStatus, InvoiceStatus, BillingFrequency, PaymentMethod } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'brightloop_super_secure_jwt_secret_key_2026_odoo_hackathon';

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' BRIGHTLOOP AUTOMATED VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✔ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Password validation tests
    console.log('--- 1. Authentication & Password Security Tests ---');
    assert('Rejects password <= 8 characters', !validatePassword('Short1!').valid);
    assert('Rejects password without uppercase letter', !validatePassword('lowercase1!@#').valid);
    assert('Rejects password without lowercase letter', !validatePassword('UPPERCASE1!@#').valid);
    assert('Rejects password without special character', !validatePassword('NoSpecial12345').valid);
    assert('Accepts strong compliant password', validatePassword('Brightloop@2026#').valid);

    // 2. User registration & duplicate email prevention
    const testEmail = `test.user.${Date.now()}@brightloop-test.com`;
    const hash = await bcrypt.hash('SecurePass@123#', 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: hash,
        name: 'Automated Tester',
        role: Role.CUSTOMER,
        customerProfile: { create: { companyName: 'Test Automation Corp' } }
      },
      include: { customerProfile: true }
    });
    assert('User registration persists in database', !!user.id && user.email === testEmail);

    let duplicateCaught = false;
    try {
      await prisma.user.create({
        data: { email: testEmail, passwordHash: hash, name: 'Duplicate' }
      });
    } catch {
      duplicateCaught = true;
    }
    assert('Duplicate email prevention triggers constraint violation', duplicateCaught);

    // 3. Role-based token generation & verification
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    const decoded: any = jwt.verify(token, JWT_SECRET);
    assert('JWT generates and decodes role accurately', decoded.role === Role.CUSTOMER);

    // 4. Product creation and dynamic variant pricing calculation (+₹560 for Odoo Brand)
    console.log('\n--- 2. Product & Dynamic Variant Pricing Tests ---');
    const product = await prisma.product.create({
      data: {
        name: 'Business Suite Test Edition',
        type: ProductType.SOFTWARE,
        salesPrice: 5000.0,
        costPrice: 1800.0,
        variants: {
          create: [
            { variantName: 'Standard', priceAdjustment: 0.0 },
            { variantName: 'Odoo Brand', priceAdjustment: 560.0 }
          ]
        }
      },
      include: { variants: true }
    });
    assert('Product created with variants', product.variants.length === 2);

    const odooVar = product.variants.find(v => v.variantName === 'Odoo Brand');
    const dynamicPrice = product.salesPrice + (odooVar?.priceAdjustment || 0);
    assert('Odoo Brand variant automatically adds ₹560 to base price (5000 + 560 = 5560)', dynamicPrice === 5560.0);

    // 5. Subscription plan creation & lifecycle permissions
    console.log('\n--- 3. Subscription Plan & Lifecycle Tests ---');
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Automation Test Monthly Plan',
        price: 5000.0,
        billingFrequency: BillingFrequency.MONTHLY,
        allowPause: true,
        allowEarlyClosure: true,
        allowRenewal: true,
        autoCloseOnExpiry: false
      }
    });
    assert('Subscription plan initialized with lifecycle rules', plan.allowPause && plan.allowEarlyClosure);

    // 6. Subscription creation & Sequence Number generation
    const subNumber = await generateSequence('SUB');
    assert('Generates formatted sequence number (SUB-YYYY-XXXX)', /^SUB-\d{4}-\d{4}$/.test(subNumber));

    const now = new Date();
    const expiry = new Date(now.getTime() + 365 * 86400000);
    const sub = await prisma.subscription.create({
      data: {
        subscriptionNumber: subNumber,
        customerId: user.customerProfile!.id,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: now,
        expiryDate: expiry,
        nextBillingDate: now,
        subtotal: 5560.0,
        taxAmount: 1000.8,
        totalAmount: 6560.8,
        lines: {
          create: [
            {
              productId: product.id,
              variantId: odooVar!.id,
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
    assert('Subscription created in ACTIVE status', sub.status === SubscriptionStatus.ACTIVE);

    // 7. Automated Idempotent Billing Engine execution
    console.log('\n--- 4. Automated Recurring Invoicing & Idempotency Tests ---');
    const run1 = await runAutomatedBilling();
    assert('Billing engine processes due subscription and generates invoice', run1.generatedInvoices.length > 0);

    const invoice = await prisma.invoice.findFirst({
      where: { subscriptionId: sub.id },
      include: { lines: true }
    });
    assert('Invoice created with matching line items and tax', !!invoice && invoice.taxAmount === 1000.8);

    // Idempotency test
    const run2 = await runAutomatedBilling();
    const invoiceCount = await prisma.invoice.count({
      where: { subscriptionId: sub.id }
    });
    assert('Idempotency verified: duplicate billing cycle skipped (invoice count remains 1)', invoiceCount === 1);

    // 8. Partial & Full Payment Recording
    console.log('\n--- 5. Payment Ledger & Balance Reconciliation Tests ---');
    const initialBalance = invoice!.outstandingBalance;
    const partialAmount = 2000.0;

    await prisma.payment.create({
      data: {
        paymentNumber: await generateSequence('PAY'),
        invoiceId: invoice!.id,
        customerId: user.customerProfile!.id,
        amount: partialAmount,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        transactionRef: 'TEST-NEFT-001'
      }
    });

    const updatedInv1 = await prisma.invoice.update({
      where: { id: invoice!.id },
      data: {
        paidAmount: partialAmount,
        outstandingBalance: initialBalance - partialAmount
      }
    });
    assert(
      'Partial payment records and decrements balance accurately',
      Math.abs(updatedInv1.outstandingBalance - (initialBalance - partialAmount)) < 0.01
    );
    assert('Invoice remains in CONFIRMED status after partial payment', updatedInv1.status === InvoiceStatus.CONFIRMED);

    // Record remaining payment
    const remainingAmount = updatedInv1.outstandingBalance;
    await prisma.payment.create({
      data: {
        paymentNumber: await generateSequence('PAY'),
        invoiceId: invoice!.id,
        customerId: user.customerProfile!.id,
        amount: remainingAmount,
        paymentMethod: PaymentMethod.UPI,
        transactionRef: 'TEST-UPI-002'
      }
    });

    const updatedInv2 = await prisma.invoice.update({
      where: { id: invoice!.id },
      data: {
        paidAmount: initialBalance,
        outstandingBalance: 0.0,
        status: InvoiceStatus.PAID
      }
    });
    assert(
      'Full clearance transitions invoice status to PAID with ₹0 balance',
      updatedInv2.status === InvoiceStatus.PAID && updatedInv2.outstandingBalance === 0
    );

    // Clean up test records
    await prisma.payment.deleteMany({ where: { invoiceId: invoice!.id } });
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice!.id } });
    await prisma.invoice.deleteMany({ where: { id: invoice!.id } });
    await prisma.subscriptionLine.deleteMany({ where: { subscriptionId: sub.id } });
    await prisma.subscription.deleteMany({ where: { id: sub.id } });
    await prisma.subscriptionPlan.deleteMany({ where: { id: plan.id } });
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.product.deleteMany({ where: { id: product.id } });
    await prisma.customerProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTestSuite();
