import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface SessionData {
  userId: string;
  email: string;
  userAgent: string;
  ipAddress: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  lastActivity: number;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  ipAddress: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
  expiresAt: Date;
}

class SessionManager {
  private secret: string;
  private tokenExpiry: number;
  private maxSessions: number;
  private sessionStore: Map<string, UserSession> = new Map();

  constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 horas
    this.maxSessions = 5; // Máximo 5 sesiones por usuario
  }

  /**
   * Genera un token JWT seguro
   */
  generateToken(sessionData: Omit<SessionData, 'issuedAt' | 'expiresAt' | 'lastActivity'>): string {
    const now = Date.now();
    const payload: SessionData = {
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
   * Verifica y decodifica un token JWT
   */
  verifyToken(token: string): SessionData | null {
    try {
      const decoded = jwt.verify(token, this.secret) as SessionData;
      
      // Verificar expiración
      if (Date.now() > decoded.expiresAt) {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Error verificando token:', error);
      return null;
    }
  }

  /**
   * Encripta datos sensibles
   */
  encryptData(data: string): string {
    // En producción, usar una librería de encriptación más robusta
    return Buffer.from(data).toString('base64');
  }

  /**
   * Desencripta datos sensibles
   */
  decryptData(encryptedData: string): string {
    return Buffer.from(encryptedData, 'base64').toString();
  }

  /**
   * Hashea contraseñas
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verifica contraseñas
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Genera un ID de sesión único
   */
  generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Almacena una sesión en memoria (en producción usar base de datos)
   */
  storeSession(session: UserSession): void {
    this.sessionStore.set(session.id, session);
    
    // Limpiar sesiones expiradas
    this.cleanupExpiredSessions();
  }

  /**
   * Obtiene una sesión por ID
   */
  getSession(sessionId: string): UserSession | null {
    const session = this.sessionStore.get(sessionId);
    if (session && session.isActive && new Date() < session.expiresAt) {
      return session;
    }
    return null;
  }

  /**
   * Actualiza la actividad de una sesión
   */
  updateSessionActivity(sessionId: string): void {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessionStore.set(sessionId, session);
    }
  }

  /**
   * Revoca una sesión específica
   */
  revokeSession(sessionId: string): void {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessionStore.set(sessionId, session);
    }
  }

  /**
   * Revoca todas las sesiones de un usuario
   */
  revokeAllUserSessions(userId: string): void {
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
  getUserSessions(userId: string): UserSession[] {
    const sessions: UserSession[] = [];
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
  checkSessionLimit(userId: string): boolean {
    const activeSessions = this.getUserSessions(userId);
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
  extractSecurityInfo(request: Request): { userAgent: string; ipAddress: string } {
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') ||
                     '127.0.0.1';
    
    return { userAgent, ipAddress };
  }

  /**
   * Valida la integridad de la sesión
   */
  validateSessionIntegrity(sessionData: SessionData, request: Request): boolean {
    const { userAgent, ipAddress } = this.extractSecurityInfo(request);
    
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

    return true;
  }
}

// Instancia única del manager
export const sessionManager = new SessionManager();

/**
 * Middleware para validar sesiones
 */
export function validateSession(request: Request): SessionData | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  
  if (!token) {
    return null;
  }

  const sessionData = sessionManager.verifyToken(token);
  if (!sessionData) {
    return null;
  }

  // Validar integridad de la sesión
  if (!sessionManager.validateSessionIntegrity(sessionData, request)) {
    return null;
  }

  // Actualizar actividad de la sesión
  sessionManager.updateSessionActivity(sessionData.sessionId);

  return sessionData;
}

/**
 * Protege rutas que requieren autenticación
 */
export function requireAuth(handler: (request: Request, session: SessionData) => Promise<Response> | Response) {
  return async (request: Request) => {
    const session = validateSession(request);
    
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