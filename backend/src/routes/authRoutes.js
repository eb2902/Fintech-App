import { Router } from 'express';
import { register, login, getProfile, refreshToken, logout, cleanupTokens } from '../controllers/authController.js';
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
router.post('/refresh', refreshToken);

// Rutas protegidas
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);
router.post('/cleanup', authenticate, cleanupTokens);

export default router;
