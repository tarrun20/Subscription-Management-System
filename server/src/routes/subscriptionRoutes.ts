import { Router } from 'express';
import {
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  pauseSubscription,
  resumeSubscription,
  renewSubscription,
  closeSubscription,
  getSubscriptionAnalytics
} from '../controllers/subscriptionController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', getSubscriptions);
router.get('/analytics', requireRole([Role.ADMIN, Role.STAFF]), getSubscriptionAnalytics);
router.get('/:id', getSubscriptionById);
router.post('/', requireRole([Role.ADMIN, Role.STAFF]), createSubscription);

router.post('/:id/pause', pauseSubscription);
router.post('/:id/resume', resumeSubscription);
router.post('/:id/renew', renewSubscription);
router.post('/:id/close', closeSubscription);

export default router;
