import { Router } from 'express';
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
} from '../controllers/planController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', getPlans);
router.get('/:id', getPlanById);

router.use(authenticateToken);
router.post('/', requireRole([Role.ADMIN]), createPlan);
router.put('/:id', requireRole([Role.ADMIN]), updatePlan);
router.delete('/:id', requireRole([Role.ADMIN]), deletePlan);

export default router;
