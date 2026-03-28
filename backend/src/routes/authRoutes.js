import { Router } from 'express';
import { login, getProfile, refreshToken, logout, cleanupTokens } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { 
  validateContentType, 
  sanitizeInputs, 
  validateRegister, 
  validateLogin 
} from '../middleware/validationMiddleware.js';
import rateLimit from 'express-rate-limit';
const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs on protected auth routes
});


const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 peticiones por IP por ventana
});

// Middleware global para todas las rutas POST
router.use(validateContentType);
router.use(authRateLimiter);
router.get('/profile', authenticate, authLimiter, getProfile);
router.post('/logout', authenticate, authLimiter, logout);
router.post('/cleanup', authenticate, authLimiter, cleanupTokens);
router.post('/login', sanitizeInputs, validateLogin, login);
router.post('/refresh', refreshToken);

// Rutas protegidas
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);
router.post('/cleanup', authenticate, cleanupTokens);

export default router;
