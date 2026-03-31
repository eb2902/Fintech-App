import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Protected routes
router.use(authenticateToken);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;