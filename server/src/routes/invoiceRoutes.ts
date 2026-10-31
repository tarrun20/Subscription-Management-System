import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  confirmInvoice,
  cancelInvoice,
  downloadInvoicePdf
} from '../controllers/invoiceController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', getInvoices);
router.get('/:id/pdf', downloadInvoicePdf);
router.get('/:id', getInvoiceById);

router.post('/:id/confirm', requireRole([Role.ADMIN, Role.STAFF]), confirmInvoice);
router.post('/:id/cancel', requireRole([Role.ADMIN, Role.STAFF]), cancelInvoice);

export default router;
