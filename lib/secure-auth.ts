import { NextRequest, NextResponse } from 'next/server';
import { secureSessionManager, SecureSessionData } from './secure-session';
import { secureCookieManager } from './secure-cookies';
import { SecureCookieOptions } from './types';
import bcrypt from 'bcryptjs';

export interface SecureUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export interface SecureAuthResult {
  success: boolean;
  user?: Omit<SecureUser, 'password'>;
  token?: string;
  error?: string;
  code?: string;
}

/**
 * Clase para manejar autenticación segura con JWT y validación robusta
 */
export class SecureAuthManager {
  private readonly sessionExpiry: number;
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number;

  constructor() {
    this.sessionExpiry = 24 * 60 * 60 * 1000; // 24 horas
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutos
  }

  /**
   * Autentica a un usuario de forma segura
   */
  async authenticateUser(
    email: string, 
    password: string, 
    request: NextRequest
  ): Promise<SecureAuthResult> {
    try {
      // Validación de entrada
      const validation = this.validateLoginInput(email, password);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          code: validation.code
        };
      }

      // Simulación de búsqueda de usuario (en producción usar base de datos)
      const user = await this.findUserByEmail(email);
      if (!user) {
        // No revelar si el usuario existe o no
        return {
          success: false,
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Verificar si la cuenta está bloqueada
      if (this.isAccountLocked(user)) {
        return {
          success: false,
          error: 'Cuenta bloqueada por intentos fallidos. Intente de nuevo más tarde.',
          code: 'ACCOUNT_LOCKED'
        };
      }

      // Verificar contraseña
      const passwordValid = await this.verifyPassword(password, user.password);
      if (!passwordValid) {
        await this.handleFailedLogin(user);
        return {
          success: false,
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Verificar si la cuenta está activa
      if (!user.isActive) {
        return {
          success: false,
          error: 'Cuenta desactivada. Contacte al administrador.',
          code: 'ACCOUNT_DISABLED'
        };
      }

      // Verificar límite de sesiones
      if (!secureSessionManager.checkSecureSessionLimit(user.id)) {
        return {
          success: false,
          error: 'Límite de sesiones concurrentes alcanzado.',
          code: 'SESSION_LIMIT_EXCEEDED'
        };
      }

      // Generar sesión segura
      const sessionData = await this.createSecureSession(user, request);
      
      // Actualizar último login
      await this.updateLastLogin(user.id);

      // Limpiar intentos fallidos
      await this.clearFailedLoginAttempts(user.id);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token: sessionData.token
      };

    } catch (error) {
      console.error('Error en autenticación segura:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      };
    }
  }

  /**
   * Cierra sesión de forma segura
   */
  async logoutUser(
    token: string, 
    request: NextRequest,
    logoutAllDevices: boolean = false
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const sessionData = secureSessionManager.verifySecureToken(token);
      if (!sessionData) {
        return { success: false, message: 'Token inválido' };
      }

      if (logoutAllDevices) {
        secureSessionManager.revokeAllUserSecureSessions(sessionData.userId);
        return { success: true, message: 'Sesión cerrada en todos los dispositivos' };
      } else {
        secureSessionManager.revokeSecureSession(sessionData.sessionId);
        return { success: true, message: 'Sesión cerrada exitosamente' };
      }

    } catch (error) {
      console.error('Error en logout seguro:', error);
      return { success: false, message: 'Error al cerrar sesión' };
    }
  }

  /**
   * Refresca un token JWT de forma segura
   */
  async refreshSession(token: string, request: NextRequest): Promise<SecureAuthResult> {
    try {
      const sessionData = secureSessionManager.verifySecureToken(token);
      if (!sessionData) {
        return {
          success: false,
          error: 'Token inválido o expirado',
          code: 'INVALID_TOKEN'
        };
      }

      // Verificar integridad de la sesión
      if (!secureSessionManager.validateSecureSessionIntegrity(sessionData, request)) {
        return {
          success: false,
          error: 'Sesión comprometida',
          code: 'SESSION_COMPROMISED'
        };
      }

      // Actualizar actividad de la sesión
      secureSessionManager.updateSecureSessionActivity(sessionData.sessionId);

      // Generar nuevo token
      const user = await this.findUserById(sessionData.userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'Usuario no encontrado o desactivado',
          code: 'USER_NOT_FOUND'
        };
      }

      const newSessionData = await this.createSecureSession(user, request);
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        token: newSessionData.token
      };

    } catch (error) {
      console.error('Error en refresh de sesión:', error);
      return {
        success: false,
        error: 'Error al refrescar sesión',
        code: 'REFRESH_ERROR'
      };
    }
  }

  /**
   * Valida datos de login
   */
  private validateLoginInput(email: string, password: string): { valid: boolean; error?: string; code?: string } {
    if (!email || !password) {
      return {
        valid: false,
        error: 'Correo electrónico y contraseña son requeridos',
        code: 'MISSING_CREDENTIALS'
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        error: 'Formato de correo electrónico inválido',
        code: 'INVALID_EMAIL'
      };
    }

    if (password.length < 8) {
      return {
        valid: false,
        error: 'La contraseña debe tener al menos 8 caracteres',
        code: 'WEAK_PASSWORD'
      };
    }

    return { valid: true };
  }

  /**
   * Crea una sesión segura
   */
  private async createSecureSession(user: SecureUser, request: NextRequest): Promise<{ token: string; sessionId: string }> {
    const { userAgent, ipAddress } = secureSessionManager.extractSecureSecurityInfo(request);
    const fingerprint = secureSessionManager.generateFingerprint(userAgent, ipAddress, user.email);
    const sessionId = secureSessionManager.generateSecureSessionId();

    const sessionData = {
      userId: user.id,
      email: user.email,
      userAgent,
      ipAddress,
      sessionId,
      fingerprint
    };

    const token = secureSessionManager.generateSecureToken(sessionData);

    const secureSession = {
      id: sessionId,
      userId: user.id,
      token,
      userAgent,
      ipAddress,
      fingerprint,
      isActive: true,
      lastActivity: new Date(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.sessionExpiry),
      loginAttempts: 0
    };

    secureSessionManager.storeSecureSession(secureSession);

    return { token, sessionId };
  }

  /**
   * Maneja intentos fallidos de login
   */
  private async handleFailedLogin(user: SecureUser): Promise<void> {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= this.maxLoginAttempts) {
      user.lockedUntil = new Date(Date.now() + this.lockoutDuration);
    }
    // En producción, guardar en base de datos
  }

  /**
   * Limpia intentos fallidos de login
   */
  private async clearFailedLoginAttempts(userId: string): Promise<void> {
    // En producción, actualizar en base de datos
    console.log(`Limpieza de intentos fallidos para usuario ${userId}`);
  }

  /**
   * Actualiza último login
   */
  private async updateLastLogin(userId: string): Promise<void> {
    // En producción, actualizar en base de datos
    console.log(`Actualización de último login para usuario ${userId}`);
  }

  /**
   * Verifica si una cuenta está bloqueada
   */
  private isAccountLocked(user: SecureUser): boolean {
    if (!user.lockedUntil) {
      return false;
    }
    return new Date() < user.lockedUntil;
  }

  /**
   * Sanitiza datos de usuario para la respuesta
   */
  private sanitizeUser(user: SecureUser): Omit<SecureUser, 'password'> {
    const { password, ...safeUser } = user;
    if (password) { /* Intentionally ignore password */ }
    return safeUser;
  }

  /**
   * Busca usuario por email (simulación)
   */
  private async findUserByEmail(_email: string): Promise<SecureUser | null> {
    // En producción, buscar en base de datos
    // Esto es una simulación para demostración
    if (_email === 'admin@example.com') {
      return {
        id: 'user-1',
        email: 'admin@example.com',
        password: await this.hashPassword('password123'),
        name: 'Administrador',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date(),
        failedLoginAttempts: 0
      };
    }
    return null;
  }

  /**
   * Busca usuario por ID (simulación)
   */
  private async findUserById(userId: string): Promise<SecureUser | null> {
    // En producción, buscar en base de datos por userId
    // Por ahora, simulamos con el mismo usuario de prueba
    if (userId === 'user-1') {
      return await this.findUserByEmail('admin@example.com');
    }
    return null;
  }

  /**
   * Hashea contraseña
   */
  private async hashPassword(_password: string): Promise<string> {
    const saltRounds = 14;
    return bcrypt.hash(_password, saltRounds);
  }

  /**
   * Verifica contraseña
   */
  private async verifyPassword(inputPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(inputPassword, hashedPassword);
  }
}

// Instancia única del manager de autenticación segura
export const secureAuthManager = new SecureAuthManager();

/**
 * Middleware de autenticación segura
 */
export function secureAuthMiddleware(handler: (request: NextRequest, session: SecureSessionData) => Promise<Response> | Response) {
  return async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    if (!token) {
      return new Response(
        JSON.stringify({ 
          error: 'Token de autenticación requerido',
          code: 'MISSING_TOKEN'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const session = secureSessionManager.verifySecureToken(token);
    if (!session) {
      return new Response(
        JSON.stringify({ 
          error: 'Token inválido o expirado',
          code: 'INVALID_TOKEN'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar integridad de la sesión
    if (!secureSessionManager.validateSecureSessionIntegrity(session, request)) {
      return new Response(
        JSON.stringify({ 
          error: 'Sesión comprometida',
          code: 'SESSION_COMPROMISED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Actualizar actividad de la sesión
    secureSessionManager.updateSecureSessionActivity(session.sessionId);

    return handler(request, session);
  };
}

/**
 * Crea una respuesta de autenticación segura con cookies
 */
export function createSecureAuthResponse(
  result: SecureAuthResult,
  cookies: SecureCookieOptions[] = []
): NextResponse {
  const response = NextResponse.json(result, { 
    status: result.success ? 200 : 401 
  });

  for (const cookieOptions of cookies) {
    const cookieString = secureCookieManager.createSecureCookie(cookieOptions);
    response.headers.append('Set-Cookie', cookieString);
  }

  return response;
}