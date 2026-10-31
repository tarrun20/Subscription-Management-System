export type Role = 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  customerProfile?: CustomerProfile;
  staffProfile?: StaffProfile;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  companyName?: string;
  taxNumber?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  user?: User;
}

export interface StaffProfile {
  id: string;
  userId: string;
  employeeCode: string;
  department?: string;
  designation?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  variantName: string;
  priceAdjustment: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  type: 'SOFTWARE' | 'SERVICE' | 'HARDWARE' | 'CONSUMABLE';
  salesPrice: number;
  costPrice: number;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  variants: ProductVariant[];
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  minimumQuantity: number;
  availableFrom?: string;
  availableUntil?: string;
  autoCloseOnExpiry: boolean;
  allowEarlyClosure: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  planProducts?: Array<{ product: Product }>;
  _count?: { subscriptions: number };
}

export interface QuotationLine {
  id?: string;
  productId: string;
  variantId?: string | null;
  product?: Product;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer?: CustomerProfile;
  planId?: string | null;
  plan?: SubscriptionPlan;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'CONVERTED' | 'REJECTED';
  validUntil: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  lines: QuotationLine[];
  subscription?: { id: string; subscriptionNumber: string; status: string };
  createdAt: string;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  customer?: CustomerProfile;
  planId: string;
  plan: SubscriptionPlan;
  status: 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  startDate: string;
  expiryDate: string;
  nextBillingDate: string;
  paymentTerms: 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  lines: QuotationLine[];
  invoices?: Invoice[];
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  productId: string;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  subscriptionId?: string;
  subscription?: Subscription;
  customerId: string;
  customer?: CustomerProfile;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  notes?: string;
  lines: InvoiceLine[];
  payments: Payment[];
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoice?: Invoice;
  customerId: string;
  customer?: CustomerProfile;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  transactionRef?: string;
  notes?: string;
}

export interface DiscountRule {
  id: string;
  name: string;
  code: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  minPurchaseAmount: number;
  minQuantity: number;
  targetType: 'ALL' | 'PRODUCT' | 'PLAN';
  targetId?: string;
  startDate?: string;
  endDate?: string;
  maxUsageLimit?: number;
  currentUsageCount: number;
  status: boolean;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  status: boolean;
}

export interface AnalyticsData {
  metrics: {
    totalCustomers: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    mrr: number;
    arr: number;
    totalRevenueCollected: number;
    outstandingPayments: number;
    overdueInvoicesCount: number;
    upcomingRenewalsCount: number;
  };
  charts: {
    revenueByPlan: Array<{ planName: string; revenue: number; activeSubscriptions: number }>;
    monthlyRevenueTrend: Array<{ month: string; revenue: number; payments: number }>;
    invoiceStatusDistribution: Array<{ name: string; value: number; color: string }>;
    subscriptionStatusDistribution: Array<{ name: string; value: number; color: string }>;
  };
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
