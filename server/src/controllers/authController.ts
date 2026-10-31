import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { validatePassword } from '../utils/validation';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'brightloop_default_secret_jwt';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, phone, role, companyName, taxNumber, billingAddress, city, state, country, zipCode } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ message: 'Email, password, and name are required.' });
      return;
    }

    // Password rule validation (>8 chars, uppercase, lowercase, special character)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ message: passwordCheck.message });
      return;
    }

    // Duplicate email prevention
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    // Role assignment: Only ADMIN can register restricted business roles. Defaults to CUSTOMER.
    let userRole: Role = Role.CUSTOMER;
    if (role === Role.STAFF || role === Role.ADMIN || role === Role.MANAGER) {
      if (!req.user || req.user.role !== Role.ADMIN) {
        res.status(403).json({ message: 'Only administrators can create staff or admin accounts.' });
        return;
      }
      userRole = role;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        phone,
        role: userRole,
        ...(userRole === Role.CUSTOMER && {
          customerProfile: {
            create: {
              companyName,
              taxNumber,
              billingAddress,
              city,
              state,
              country: country || 'India',
              zipCode
            }
          }
        }),
        ...((userRole === Role.STAFF || userRole === Role.MANAGER) && {
          staffProfile: {
            create: {
              employeeCode: `BL-STF-${Date.now().toString().slice(-4)}`,
              department: req.body.department || 'Operations',
              designation: req.body.designation || 'Staff Associate'
            }
          }
        })
      },
      include: {
        customerProfile: true,
        staffProfile: true
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        customerProfile: user.customerProfile,
        staffProfile: user.staffProfile
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration', error: error.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { customerProfile: true, staffProfile: true }
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        customerProfile: user.customerProfile,
        staffProfile: user.staffProfile
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login', error: error.message });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { customerProfile: true, staffProfile: true }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        customerProfile: user.customerProfile,
        staffProfile: user.staffProfile
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Return 200 to prevent user enumeration
      res.json({ message: 'If an account exists with this email, a reset link has been dispatched.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiresAt: resetExpires
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    res.json({
      message: 'Password reset link generated successfully.',
      resetToken, // Returned for easy hackathon demo verification!
      resetUrl
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error processing forgot password', error: error.message });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required' });
      return;
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      res.status(400).json({ message: passwordCheck.message });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gte: new Date() }
      }
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired password reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null
      }
    });

    res.json({ message: 'Password has been successfully updated. You may now login.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
}
