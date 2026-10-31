import { Router } from 'express';
import { getCustomers, getStaffMembers, createStaffMember, updateMyProfile } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.put('/me/profile', updateMyProfile);
router.get('/customers', requireRole([Role.ADMIN, Role.STAFF]), getCustomers);
router.get('/staff', requireRole([Role.ADMIN]), getStaffMembers);
router.post('/staff', requireRole([Role.ADMIN]), createStaffMember);

export default router;
