import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';
import { deleteScenario, listScenarios, renewalSettings, renewalTimeline, simulateCustomerCost, simulateRevenue } from '../controllers/advancedController';

const router = Router();
router.use(authenticateToken);
router.get('/renewals', renewalTimeline);
router.get('/renewal-settings', requireRole([Role.ADMIN]), renewalSettings);
router.put('/renewal-settings', requireRole([Role.ADMIN]), renewalSettings);
router.post('/customer-simulator', requireRole([Role.CUSTOMER]), simulateCustomerCost);
router.post('/revenue-simulator', requireRole([Role.ADMIN, Role.MANAGER]), simulateRevenue);
router.get('/revenue-simulator/scenarios', requireRole([Role.ADMIN, Role.MANAGER]), listScenarios);
router.delete('/revenue-simulator/scenarios/:id', requireRole([Role.ADMIN, Role.MANAGER]), deleteScenario);
export default router;
