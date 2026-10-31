import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  calculatePrice
} from '../controllers/productController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/calculate-price', calculatePrice);
router.get('/', getProducts);
router.get('/:id', getProductById);

router.use(authenticateToken);
router.post('/', requireRole([Role.ADMIN]), createProduct);
router.put('/:id', requireRole([Role.ADMIN]), updateProduct);
router.delete('/:id', requireRole([Role.ADMIN]), deleteProduct);

export default router;
