import { Router } from 'express';
import { getPayments, recordPayment } from '../controllers/paymentController';
import { createCheckoutOrder, verifyCheckoutPayment } from '../controllers/gatewayController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', getPayments);
router.post('/checkout/verify', verifyCheckoutPayment);
router.post('/checkout/:invoiceId', createCheckoutOrder);
router.post('/', requireRole([Role.ADMIN, Role.STAFF]), recordPayment);

export default router;
