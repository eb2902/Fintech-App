import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface SecureSessionData {
  userId: string;
  email: string;
  userAgent: string;
  ipAddress: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  lastActivity: number;
  fingerprint: string;
}

export interface SecureUserSession {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  ipAddress: string;
  fingerprint: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
  expiresAt: Date;
  loginAttempts: number;
  lockedUntil?: Date;
}

class SecureSessionManager {
  private secret: string;
  private tokenExpiry: number;
  private maxSessions: number;
  private sessionStore: Map<string, SecureUserSession> = new Map();
  private loginAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map();

  constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 horas
    this.maxSessions = 3; // Máximo 3 sesiones por usuario para mayor seguridad
  }

  /**
   * Genera un token JWT seguro con validación de fingerprint
   */
  generateSecureToken(sessionData: Omit<SecureSessionData, 'issuedAt' | 'expiresAt' | 'lastActivity'>): string {
    const now = Date.now();
    const payload: SecureSessionData = {
      ...sessionData,
      issuedAt: now,
      expiresAt: now + this.tokenExpiry,
      lastActivity: now
    };

    return jwt.sign(payload, this.secret, { 
      algorithm: 'HS256',
      expiresIn: this.tokenExpiry 
    });
  }

  /**
   * Verifica y decodifica un token JWT con validación de seguridad
   */
  verifySecureToken(token: string): SecureSessionData | null {
    try {
      const decoded = jwt.verify(token, this.secret) as SecureSessionData;
      
      // Verificar expiración
      if (Date.now() > decoded.expiresAt) {
        return null;
      }

      // Verificar integridad del token
      if (!decoded.fingerprint || decoded.fingerprint.length !== 64) {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Error verificando token seguro:', error);
      return null;
    }
  }

  /**
   * Genera un fingerprint único para la sesión basado en múltiples factores
   */
  generateFingerprint(userAgent: string, ipAddress: string, email: string): string {
    const data = `${userAgent}:${ipAddress}:${email}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Hashea contraseñas con sal robusta
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 14; // Aumentado para mayor seguridad
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verifica contraseñas con tiempo constante
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Genera un ID de sesión único y seguro
   */
  generateSecureSessionId(): string {
    return uuidv4();
  }

  /**
   * Almacena una sesión segura en memoria (en producción usar base de datos)
   */
  storeSecureSession(session: SecureUserSession): void {
    this.sessionStore.set(session.id, session);
    
    // Limpiar sesiones expiradas
    this.cleanupExpiredSessions();
  }

  /**
   * Obtiene una sesión segura por ID
   */
  getSecureSession(sessionId: string): SecureUserSession | null {
    const session = this.sessionStore.get(sessionId);
    if (session && session.isActive && new Date() < session.expiresAt) {
      return session;
    }
    return null;
  }

  /**
   * Actualiza la actividad de una sesión segura
   */
  updateSecureSessionActivity(sessionId: string): void {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessionStore.set(sessionId, session);
    }
  }

  /**
   * Revoca una sesión segura específica
   */
  revokeSecureSession(sessionId: string): void {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessionStore.set(sessionId, session);
    }
  }

  /**
   * Revoca todas las sesiones de un usuario
   */
  revokeAllUserSecureSessions(userId: string): void {
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (session.userId === userId) {
        session.isActive = false;
        this.sessionStore.set(sessionId, session);
      }
    }
  }

  /**
   * Obtiene sesiones activas de un usuario
   */
  getUserSecureSessions(userId: string): SecureUserSession[] {
    const sessions: SecureUserSession[] = [];
    for (const session of this.sessionStore.values()) {
      if (session.userId === userId && session.isActive && new Date() < session.expiresAt) {
        sessions.push(session);
      }
    }
    return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * Verifica límite de sesiones concurrentes
   */
  checkSecureSessionLimit(userId: string): boolean {
    const activeSessions = this.getUserSecureSessions(userId);
    return activeSessions.length < this.maxSessions;
  }

  /**
   * Limpia sesiones expiradas
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (now >= session.expiresAt) {
        this.sessionStore.delete(sessionId);
      }
    }
  }

  /**
   * Obtiene información de seguridad de la solicitud
   */
  extractSecureSecurityInfo(request: Request): { userAgent: string; ipAddress: string; email?: string } {
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-client-ip') ||
                     '127.0.0.1';
    
    return { userAgent, ipAddress };
  }

  /**
   * Valida la integridad de la sesión segura
   */
  validateSecureSessionIntegrity(sessionData: SecureSessionData, request: Request): boolean {
    const { userAgent, ipAddress } = this.extractSecureSecurityInfo(request);
    
    // Validar agente de usuario
    if (sessionData.userAgent !== userAgent) {
      console.warn('Posible secuestro de sesión: User-Agent no coincide');
      return false;
    }

    // Validar dirección IP (puede ser más flexible en entornos con proxies)
    if (sessionData.ipAddress !== ipAddress) {
      console.warn('Posible secuestro de sesión: IP no coincide');
      return false;
    }

    // Validar fingerprint
    const currentFingerprint = this.generateFingerprint(userAgent, ipAddress, sessionData.email);
    if (sessionData.fingerprint !== currentFingerprint) {
      console.warn('Posible secuestro de sesión: Fingerprint no coincide');
      return false;
    }

    return true;
  }

  /**
   * Maneja intentos de login para prevenir fuerza bruta
   */
  handleLoginAttempt(identifier: string, success: boolean): { blocked: boolean; message?: string } {
    const now = new Date();
    const attempt = this.loginAttempts.get(identifier);
    
    if (success) {
      // Limpiar intentos fallidos en caso de éxito
      this.loginAttempts.delete(identifier);
      return { blocked: false };
    }

    if (!attempt) {
      this.loginAttempts.set(identifier, { count: 1, lastAttempt: now });
      return { blocked: false };
    }

    // Verificar si está bloqueado
    if (attempt.lockedUntil && now < attempt.lockedUntil) {
      const remainingTime = Math.ceil((attempt.lockedUntil.getTime() - now.getTime()) / 60000);
      return { 
        blocked: true, 
        message: `Cuenta bloqueada por intentos fallidos. Intente de nuevo en ${remainingTime} minutos.` 
      };
    }

    // Incrementar intentos fallidos
    attempt.count++;
    attempt.lastAttempt = now;

    // Bloquear después de 5 intentos fallidos
    if (attempt.count >= 5) {
      attempt.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos
      return { 
        blocked: true, 
        message: 'Demasiados intentos fallidos. La cuenta ha sido bloqueada por 15 minutos.' 
      };
    }

    this.loginAttempts.set(identifier, attempt);
    return { blocked: false };
  }

  /**
   * Verifica si un usuario está bloqueado
   */
  isUserBlocked(identifier: string): boolean {
    const attempt = this.loginAttempts.get(identifier);
    if (!attempt || !attempt.lockedUntil) {
      return false;
    }
    
    const now = new Date();
    return now < attempt.lockedUntil;
  }
}

// Instancia única del manager seguro
export const secureSessionManager = new SecureSessionManager();

/**
 * Middleware para validar sesiones seguras
 */
export function validateSecureSession(request: Request): SecureSessionData | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  
  if (!token) {
    return null;
  }

  const sessionData = secureSessionManager.verifySecureToken(token);
  if (!sessionData) {
    return null;
  }

  // Validar integridad de la sesión
  if (!secureSessionManager.validateSecureSessionIntegrity(sessionData, request)) {
    return null;
  }

  // Actualizar actividad de la sesión
  secureSessionManager.updateSecureSessionActivity(sessionData.sessionId);

  return sessionData;
}

/**
 * Protege rutas que requieren autenticación segura
 */
export function requireSecureAuth(handler: (request: Request, session: SecureSessionData) => Promise<Response> | Response) {
  return async (request: Request) => {
    const session = validateSecureSession(request);
    
    if (!session) {
      return new Response(
        JSON.stringify({ 
          error: 'No autorizado',
          code: 'UNAUTHORIZED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, session);
  };
}