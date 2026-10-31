import { Router } from 'express';
import { getTaxes, createTax, updateTax, deleteTax } from '../controllers/taxController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.get('/', getTaxes);
router.post('/', requireRole([Role.ADMIN]), createTax);
router.put('/:id', requireRole([Role.ADMIN]), updateTax);
router.delete('/:id', requireRole([Role.ADMIN]), deleteTax);

export default router;
