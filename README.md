# Brightloop Software — Subscription Management System

[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22.0-2D3748.svg)](https://www.prisma.io/)
[![Express.js](https://img.shields.io/badge/Express-4.21.1-lightgrey.svg)](https://expressjs.com/)
[![React 18](https://img.shields.io/badge/React-18.3.1-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)

A full-stack, enterprise-grade **Subscription Management System** designed and built for **Brightloop Software** to manage recurring software products, tiered subscription plans, sales quotation workflows, idempotent automated billing cycles, discount rules, payment collections, and financial analytics.

---

## 1. System Architecture & Tech Stack

```
                                    +------------------------------+
                                    |     React 18 + TypeScript    |
                                    | Tailwind CSS • Recharts • Vite |
                                    +--------------+---------------+
                                                   |
                                         REST APIs (JSON / JWT)
                                                   |
                                    +--------------v---------------+
                                    |    Node.js + Express.js API  |
                                    |  TypeScript • Zod • PDFKit   |
                                    +--------------+---------------+
                                                   |
                                              Prisma ORM
                                                   |
                                    +--------------v---------------+
                                    |     PostgreSQL 16 Engine     |
                                    |  (Docker Container Port 5432) |
                                    +------------------------------+
```

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons, Recharts for financial analytics charts.
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, PDFKit for PDF invoice rendering, node-cron for recurring billing schedules, bcryptjs, jsonwebtoken.
- **Database**: PostgreSQL 16 with relational integrity (18 models: Users, Customers, Staff, Products, Variants, Plans, Quotations, Subscriptions, Invoices, Payments, Discounts, Taxes, Audit Logs).
- **Version Control & GitHub Desktop**: Integrated Git repository tracking changes live with GitHub Desktop and remote `https://github.com/tarrun20/Subscription-Management-System.git`.

---

## 2. Key Modules & Functional Capabilities

### A. Authentication & Role-Based Access Control (RBAC)
- **Three Discrete Roles**:
  - **Admin**: Unrestricted control (products, plans, taxes, discounts, staff accounts, financial analytics).
  - **Staff**: Day-to-day operations (customer management, quotations, subscriptions, invoice generation, payment recording).
  - **Customer**: Strict self-service data isolation (view only own subscriptions, upcoming renewals, download PDF invoices, payment receipts).
- **Password Security Policy**: Enforces `>8 characters`, at least one uppercase letter, one lowercase letter, and one special character.
- **Forgot Password**: Secure tokenized password recovery workflow.

### B. Products & Dynamic Variant Pricing
- Configurable base products (Software, Services, Hardware, Consumables) with sales price and cost price.
- **Dynamic Pricing Engine**: Selecting a product variant dynamically modifies line price. For example, selecting the **Odoo Brand** variant automatically adds **+₹560** to the base price of ₹5,000 to compute unit price ₹5,560 dynamically.

### C. Subscription Plan Management
- Frequencies supported: **Daily, Weekly, Monthly, Yearly**.
- Configurable lifecycle rules per plan:
  - `autoCloseOnExpiry`: Closes subscription automatically when plan terminates.
  - `allowEarlyClosure`: Customer/Staff can terminate subscription before expiry.
  - `allowPause`: Suspend and resume billing cycles with shifted renewal dates.
  - `allowRenewal`: One-click renewal extension.

### D. Quotations & Conversion Pipeline
- Predefined Quotation Templates with configurable validity days.
- Real-time line item price calculation with variant adjustments and GST tax rates.
- **1-Click Conversion**: Transitions approved quotations into active subscriptions instantly.

### E. Automated Idempotent Recurring Invoicing
- **Billing Engine**: Evaluates all active subscriptions where `nextBillingDate <= NOW()`.
- **Idempotency Guard**: Guarantees no subscription can ever be billed twice for the same period.
- **Automated Calculations**: Taxes computed automatically from tax rules; eligible discounts applied and usage counters incremented atomically.
- **PDF Generation**: Generates itemized, tax-compliant PDF invoices with company details, GSTIN, line items, and payment status using PDFKit.

### F. Discount Rules & Payment Management
- **Discounts**: Percentage (%) and Fixed Amount (₹) discounts with minimum spend, minimum quantity, validity dates, and usage limits.
- **Payment Ledger**: Supports Cash, Bank Transfer, UPI, Card, and Other methods.
- **Atomic Balance Updates**: Full and partial payments automatically decrement invoice `outstandingBalance` and update status from `CONFIRMED` to `PAID` once cleared.

### G. Analytics & Reporting Dashboard
- Database-backed calculations for:
  - **MRR (Monthly Recurring Revenue)** and **ARR (Annual Recurring Revenue)**.
  - Total Revenue Collected vs. Outstanding Payments.
  - Overdue Invoices and Upcoming Renewals count.
  - Interactive Recharts: Monthly Revenue Trend, Revenue by Plan, Invoice Status Distribution, and Subscription Health.

---

## 3. Demo Credentials

Quick 1-click login buttons are provided on the login page for instant hackathon evaluation:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Super Admin** | `admin@brightloop.com` | `Admin@123456#` | Full system access, plans, discounts, staff, analytics |
| **Staff Member** | `staff@brightloop.com` | `Staff@123456#` | Customers, quotations, subscriptions, invoices, payments |
| **Customer** | `acme@example.com` | `Customer@123456#` | Acme Technologies portal, invoices, renewal dates |

---

## 4. Local Quick Start Guide

### Prerequisites
- Node.js (v18+) and npm (v9+)
- Docker Desktop (for PostgreSQL container)

### Step 1: Start PostgreSQL 16 Database
```bash
# In the project root:
docker compose up -d

# Verify container is healthy:
docker exec brightloop_postgres pg_isready -U postgres
```

### Step 2: Seed the Database
```bash
cd server
npm run prisma:seed
```
This populates the database with realistic products (including Odoo Brand +₹560), plans, tax rules, discount codes, customers, active/expired subscriptions, confirmed invoices, and payments.

### Step 3: Run the Backend Server
```bash
cd server
npm run dev
```
Backend API will start at: `http://localhost:5000`

### Step 4: Run the React Frontend Client
In a new terminal window:
```bash
cd client
npm run dev
```
Frontend application will be accessible at: `http://localhost:5173`

---

## 5. Automated Verification Tests

The repository contains a standalone automated test suite validating all core business rules against PostgreSQL:
```bash
cd server
npm test
```

### Verified Test Cases:
1. Rejection of weak passwords (length <= 8, no uppercase, no lowercase, no special character).
2. Acceptance of compliant passwords.
3. User registration and persistence in PostgreSQL.
4. Prevention of duplicate email registrations.
5. Role-based JWT token generation and role claim decoding.
6. Product creation with variants.
7. Dynamic variant price calculation (+₹560 added for Odoo Brand).
8. Subscription plan creation with lifecycle rules.
9. Formatted sequence number generation (`SUB-YYYY-XXXX`, `INV-YYYY-XXXX`, `PAY-YYYY-XXXX`).
10. Subscription creation in ACTIVE status.
11. Automated recurring invoicing engine execution.
12. Idempotent billing verification (skips duplicate billing cycle).
13. Line tax and discount computation.
14. Partial payment recording and accurate remaining balance calculation.
15. Full payment clearance transitioning invoice status to `PAID` with zero balance.

---

## 6. REST API Endpoints Overview

| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new customer account | Public |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Authenticated |
| `POST` | `/api/auth/forgot-password` | Generate password reset token | Public |
| `POST` | `/api/auth/reset-password` | Update password using reset token | Public |
| `GET` | `/api/products` | List products and variants | Public / Auth |
| `GET` | `/api/products/calculate-price` | Dynamic variant price computation | Public / Auth |
| `POST` | `/api/products` | Create product with variants | Admin |
| `GET` | `/api/plans` | List subscription plans | Public / Auth |
| `POST` | `/api/plans` | Create subscription plan | Admin |
| `GET` | `/api/quotations` | List quotations (scoped by customer) | Authenticated |
| `POST` | `/api/quotations` | Create quotation offer | Admin, Staff |
| `POST` | `/api/quotations/:id/convert` | Convert quotation to subscription | Admin, Staff |
| `GET` | `/api/subscriptions` | List subscriptions | Authenticated |
| `POST` | `/api/subscriptions/:id/pause` | Pause active subscription | Authenticated |
| `POST` | `/api/subscriptions/:id/resume` | Resume paused subscription | Authenticated |
| `POST` | `/api/subscriptions/:id/renew` | Renew subscription | Authenticated |
| `POST` | `/api/subscriptions/:id/close` | Close subscription early | Authenticated |
| `GET` | `/api/invoices` | List invoices with status / overdue filters | Authenticated |
| `GET` | `/api/invoices/:id/pdf` | Download official PDF invoice | Authenticated |
| `POST` | `/api/payments` | Record full or partial payment | Admin, Staff |
| `GET` | `/api/discounts` | List discount rules | Admin, Staff |
| `POST` | `/api/discounts` | Create discount rule | Admin |
| `GET` | `/api/analytics/dashboard` | Executive financial analytics & Recharts | Admin, Staff |
| `POST` | `/api/billing/run` | Trigger on-demand automated recurring billing | Admin, Staff |

---

### Advanced renewal and simulation endpoints

The advanced extension is mounted at `/api/advanced` (all endpoints require a bearer token):

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/renewals` | Customer (own records), staff/admin | Renewal timeline, in-app reminder history and renewal history |
| POST | `/subscriptions/:id/change-plan` | Customer (own record), staff/admin | Preview a plan change; confirm with `confirm: true` and an `Idempotency-Key` header |
| GET/PUT | `/renewal-settings` | Admin | Read or set reminder stages in whole days |
| POST | `/customer-simulator` | Customer | Estimate catalog plan totals for selected plan IDs and quantity |
| POST | `/revenue-simulator` | Admin | Calculate a hypothetical business scenario; pass `save: true` and `name` to persist it |
| GET/DELETE | `/revenue-simulator/scenarios[/:id]` | Admin | List or delete scenarios owned by the current admin |

Renewal reminders run daily at 08:00 server time. The unique subscription/date/stage key makes generation idempotent. Notifications are stored in-app; no email transport exists in this project. The manager simulator uses current active subscriptions as its MRR baseline and stores assumptions and outputs without creating invoices or payments.

The database extension is in `server/prisma/migrations/20261031000000_advanced_subscription_tools`. Apply it to a database that already has the original Brightloop schema, then regenerate Prisma Client with `cd server && npm run prisma:generate`. This repository did not have a prior migration history, so a fresh database still needs the original schema initialized using the existing project setup before applying this incremental migration.

## 7. GitHub Desktop Collaboration Guide

This repository is configured to update live in GitHub Desktop:
1. Open **GitHub Desktop**.
2. Select **File -> Add Local Repository** (or open repository `Subscription-Management-System`).
3. GitHub Desktop will immediately track every file change, allowing seamless commits, branch creation, and synchronization with `origin/main` at `https://github.com/tarrun20/Subscription-Management-System.git`.

---

© 2026 Brightloop Software Solutions. All rights reserved.
