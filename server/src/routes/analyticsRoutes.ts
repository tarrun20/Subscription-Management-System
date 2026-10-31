import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analyticsController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.get('/dashboard', requireRole([Role.ADMIN, Role.STAFF]), getDashboardAnalytics);

export default router;
