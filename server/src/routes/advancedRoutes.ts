import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';
import {
  deleteScenario,
  listScenarios,
  renewalSettings,
  renewalTimeline,
  simulateCustomerCost,
  simulateRevenue,
  markNotificationRead,
  triggerRenewalReminders
} from '../controllers/advancedController';

const router = Router();
router.use(authenticateToken);

router.get('/renewals', renewalTimeline);
router.post('/renewals/trigger-reminders', requireRole([Role.ADMIN, Role.STAFF]), triggerRenewalReminders);
router.put('/notifications/:id/read', markNotificationRead);
router.get('/renewal-settings', requireRole([Role.ADMIN]), renewalSettings);
router.put('/renewal-settings', requireRole([Role.ADMIN]), renewalSettings);
router.post('/customer-simulator', requireRole([Role.CUSTOMER, Role.ADMIN, Role.STAFF]), simulateCustomerCost);
router.post('/revenue-simulator', requireRole([Role.ADMIN, Role.MANAGER]), simulateRevenue);
router.get('/revenue-simulator/scenarios', requireRole([Role.ADMIN, Role.MANAGER]), listScenarios);
router.delete('/revenue-simulator/scenarios/:id', requireRole([Role.ADMIN, Role.MANAGER]), deleteScenario);

export default router;
