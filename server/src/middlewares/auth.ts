import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  customerProfileId?: string;
  staffProfileId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'brightloop_default_secret_jwt';

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: Role };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { customerProfile: true, staffProfile: true }
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid token: user not found.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customerProfileId: user.customerProfile?.id,
      staffProfileId: user.staffProfile?.id
    };

    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: `Forbidden: role ${req.user.role} does not have access to this resource.`
      });
      return;
    }

    next();
  };
}
