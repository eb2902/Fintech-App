/**
 * Utilidades de validación para la aplicación Fintech
 */

// Regex para validación de email (RFC 5322 simplificado)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Regex para contraseña fuerte
// - Mínimo 8 caracteres
// - Al menos una mayúscula
// - Al menos una minúscula
// - Al menos un número
// - Al menos un carácter especial
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+_-])[A-Za-z\d@$!%*?&#+_-]{8,}$/;

// Regex para nombre (solo letras, espacios y caracteres acentuados)
export const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,100}$/;

/**
 * Valida el formato de un email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si es válido
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Valida que una contraseña sea fuerte
 * @param {string} password - Contraseña a validar
 * @returns {boolean} - true si es válida
 */
export const isStrongPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return STRONG_PASSWORD_REGEX.test(password);
};

/**
 * Valida que un nombre sea válido
 * @param {string} name - Nombre a validar
 * @returns {boolean} - true si es válido
 */
export const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  return NAME_REGEX.test(name.trim());
};

/**
 * Sanitiza un string eliminando caracteres peligrosos para XSS
 * @param {string} input - String a sanitizar
 * @returns {string} - String sanitizado
 */
export const sanitizeString = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Mensajes de error estandarizados
 */
export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: 'El email es requerido',
  EMAIL_INVALID: 'El formato del email no es válido',
  PASSWORD_REQUIRED: 'La contraseña es requerida',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres',
  PASSWORD_WEAK: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&#+_-)',
  NAME_REQUIRED: 'El nombre es requerido',
  NAME_INVALID: 'El nombre solo puede contener letras y espacios (2-100 caracteres)',
  CONFIRM_PASSWORD_REQUIRED: 'La confirmación de contraseña es requerida',
  PASSWORDS_DONT_MATCH: 'Las contraseñas no coinciden',
  CONTENT_TYPE_INVALID: 'Content-Type debe ser application/json'
};

/**
 * Valida la fortaleza de la contraseña y retorna mensajes específicos
 * @param {string} password - Contraseña a validar
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password) {
    return { isValid: false, errors: [VALIDATION_MESSAGES.PASSWORD_REQUIRED] };
  }
  
  if (password.length < 8) {
    errors.push(VALIDATION_MESSAGES.PASSWORD_TOO_SHORT);
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }
  
  if (!/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }
  
  if (!/[@$!%*?&#+_-]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial (@$!%*?&#+_-)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};