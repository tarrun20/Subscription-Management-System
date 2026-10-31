import { prisma } from '../config/prisma';

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length <= 8) {
    return { valid: false, message: 'Password must contain more than 8 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }
  return { valid: true };
}

export async function generateSequence(prefix: 'QUO' | 'SUB' | 'INV' | 'PAY'): Promise<string> {
  const year = new Date().getFullYear();
  let count = 0;

  if (prefix === 'QUO') {
    count = await prisma.quotation.count();
  } else if (prefix === 'SUB') {
    count = await prisma.subscription.count();
  } else if (prefix === 'INV') {
    count = await prisma.invoice.count();
  } else if (prefix === 'PAY') {
    count = await prisma.payment.count();
  }

  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}
