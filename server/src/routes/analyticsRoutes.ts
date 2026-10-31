import { Router } from 'express';
import { getDashboardAnalytics, getRetentionAnalytics } from '../controllers/analyticsController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.get('/dashboard', requireRole([Role.ADMIN, Role.STAFF]), getDashboardAnalytics);
router.get('/retention', requireRole([Role.ADMIN, Role.MANAGER, Role.STAFF]), getRetentionAnalytics);

export default router;
