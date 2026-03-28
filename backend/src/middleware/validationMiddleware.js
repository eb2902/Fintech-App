import { body, validationResult } from 'express-validator';
import { 
  isValidEmail, 
  isStrongPassword, 
  isValidName, 
  sanitizeString,
  VALIDATION_MESSAGES 
} from '../utils/validators.js';

/**
 * Middleware para validar Content-Type en peticiones POST/PUT/PATCH
 */
export const validateContentType = (req, res, next) => {
  const methodsRequiringJson = ['POST', 'PUT', 'PATCH'];
  
  if (methodsRequiringJson.includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        error: VALIDATION_MESSAGES.CONTENT_TYPE_INVALID
      });
    }
  }
  
  next();
};

/**
 * Middleware para sanitizar inputs contra XSS
 */
export const sanitizeInputs = (req, res, next) => {
  if (req.body) {
    // Sanitizar campos de texto conocidos
    const textFields = ['name', 'email'];
    
    textFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = sanitizeString(req.body[field]);
      }
    });
  }
  
  next();
};

/**
 * Validaciones para registro de usuario
 */
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage(VALIDATION_MESSAGES.NAME_REQUIRED)
    .custom((value) => {
      if (!isValidName(value)) {
        throw new Error(VALIDATION_MESSAGES.NAME_INVALID);
      }
      return true;
    }),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage(VALIDATION_MESSAGES.EMAIL_REQUIRED)
    .custom((value) => {
      if (!isValidEmail(value)) {
        throw new Error(VALIDATION_MESSAGES.EMAIL_INVALID);
      }
      return true;
    }),
  
  body('password')
    .notEmpty()
    .withMessage(VALIDATION_MESSAGES.PASSWORD_REQUIRED)
    .isLength({ min: 8 })
    .withMessage(VALIDATION_MESSAGES.PASSWORD_TOO_SHORT)
    .custom((value) => {
      if (!isStrongPassword(value)) {
        throw new Error(VALIDATION_MESSAGES.PASSWORD_WEAK);
      }
      return true;
    }),
  
  // Middleware para manejar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }
    
    next();
  }
];

/**
 * Validaciones para inicio de sesión
 */
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage(VALIDATION_MESSAGES.EMAIL_REQUIRED)
    .custom((value) => {
      if (!isValidEmail(value)) {
        throw new Error(VALIDATION_MESSAGES.EMAIL_INVALID);
      }
      return true;
    }),
  
  body('password')
    .notEmpty()
    .withMessage(VALIDATION_MESSAGES.PASSWORD_REQUIRED),
  
  // Middleware para manejar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }
    
    next();
  }
];

/**
 * Validación para cambio de contraseña
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('La nueva contraseña es requerida')
    .isLength({ min: 8 })
    .withMessage(VALIDATION_MESSAGES.PASSWORD_TOO_SHORT)
    .custom((value) => {
      if (!isStrongPassword(value)) {
        throw new Error(VALIDATION_MESSAGES.PASSWORD_WEAK);
      }
      return true;
    }),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage(VALIDATION_MESSAGES.CONFIRM_PASSWORD_REQUIRED)
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error(VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH);
      }
      return true;
    }),
  
  // Middleware para manejar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }
    
    next();
  }
];