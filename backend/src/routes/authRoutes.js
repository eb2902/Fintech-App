import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { 
  validateContentType, 
  sanitizeInputs, 
  validateRegister, 
  validateLogin 
} from '../middleware/validationMiddleware.js';

const router = Router();

// Middleware global para todas las rutas POST
router.use(validateContentType);

// Rutas públicas con validación
router.post('/register', sanitizeInputs, validateRegister, register);
router.post('/login', sanitizeInputs, validateLogin, login);

// Rutas protegidas
router.get('/profile', authenticate, getProfile);

export default router;
