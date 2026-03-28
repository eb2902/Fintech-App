import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Validación del JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es requerido en producción. Configura la variable de entorno JWT_SECRET.');
  } else {
    console.warn('⚠️  JWT_SECRET no está configurado. Usando secret por defecto SOLO para desarrollo.');
    // En desarrollo, usar un secret por defecto (NO usar en producción)
    process.env.JWT_SECRET = 'dev-secret-key-change-in-production-' + crypto.randomBytes(32).toString('hex');
  }
}

const JWT_EXPIRES_IN = '15m'; // Reducido a 15 minutos

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    jwtid: crypto.randomUUID() // Agregar JWT ID único
  });
};

export const generateRefreshToken = () => {
  // Generar un refresh token aleatorio (no es un JWT)
  return crypto.randomBytes(64).toString('hex');
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Token inválido o expirado', { cause: err });
  }
};

export const decodeToken = (token) => {
  // Decodificar sin verificar (útil para obtener info sin validar firma)
  return jwt.decode(token);
};

export const getTokenExpiration = () => {
  // Retornar fecha de expiración para refresh tokens (7 días)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
};
