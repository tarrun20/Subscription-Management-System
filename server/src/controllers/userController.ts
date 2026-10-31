import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { validatePassword } from '../utils/validation';

export async function getCustomers(req: Request, res: Response): Promise<void> {
  try {
    const customers = await prisma.customerProfile.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true }
        },
        subscriptions: {
          select: { id: true, subscriptionNumber: true, status: true, totalAmount: true }
        },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true, outstandingBalance: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
}

export async function getStaffMembers(req: Request, res: Response): Promise<void> {
  try {
    const staff = await prisma.staffProfile.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching staff members', error: error.message });
  }
}

export async function createStaffMember(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, phone, department, designation } = req.body;

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ message: passwordCheck.message });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(409).json({ message: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const count = await prisma.staffProfile.count();
    const employeeCode = `BL-STF-${String(count + 1).padStart(3, '0')}`;

    const staffUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        phone,
        role: Role.STAFF,
        staffProfile: {
          create: {
            employeeCode,
            department: department || 'Operations',
            designation: designation || 'Support Specialist'
          }
        }
      },
      include: { staffProfile: true }
    });

    res.status(201).json({ message: 'Staff member created successfully', staff: staffUser });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating staff member', error: error.message });
  }
}
