import { Router } from 'express';
import {
  getTemplates,
  createTemplate,
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotationStatus,
  convertToSubscription
} from '../controllers/quotationController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/templates', getTemplates);
router.post('/templates', requireRole([Role.ADMIN, Role.STAFF]), createTemplate);

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.post('/', requireRole([Role.ADMIN, Role.STAFF]), createQuotation);
router.patch('/:id/status', requireRole([Role.ADMIN, Role.STAFF]), updateQuotationStatus);
router.post('/:id/convert', requireRole([Role.ADMIN, Role.STAFF]), convertToSubscription);

export default router;
