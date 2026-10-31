import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';
import { exportLedger, getAuditLogs } from '../controllers/exportController';

const router = Router();
router.use(authenticateToken);
router.get('/ledger.csv', exportLedger);
router.get('/audit-logs', requireRole([Role.ADMIN, Role.MANAGER]), getAuditLogs);
export default router;
