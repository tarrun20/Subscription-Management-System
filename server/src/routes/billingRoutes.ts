import { Router } from 'express';
import { triggerBillingRun } from '../controllers/billingController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.post('/run', requireRole([Role.ADMIN, Role.STAFF]), triggerBillingRun);

export default router;
