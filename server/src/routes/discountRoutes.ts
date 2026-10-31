import { Router } from 'express';
import {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount
} from '../controllers/discountController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.get('/', getDiscounts);
router.post('/', requireRole([Role.ADMIN]), createDiscount);
router.put('/:id', requireRole([Role.ADMIN]), updateDiscount);
router.delete('/:id', requireRole([Role.ADMIN]), deleteDiscount);

export default router;
