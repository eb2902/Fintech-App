import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export interface SecureCSRFToken {
  token: string;
  timestamp: number;
  userAgent: string;
  ipAddress: string;
  sessionId?: string;
}

export interface SecureCSRFStore {
  [token: string]: SecureCSRFToken;
}

/**
 * Clase para manejar protección CSRF segura con validación robusta
 */
export class SecureCSRFManager {
  private readonly tokenExpiry: number;
  private readonly maxTokensPerSession: number;
  private readonly store: SecureCSRFStore = {};

  constructor() {
    this.tokenExpiry = 60 * 60 * 1000; // 1 hora
    this.maxTokensPerSession = 10; // Máximo 10 tokens por sesión
  }

  /**
   * Genera un token CSRF seguro
   */
  generateSecureToken(sessionId?: string, request?: NextRequest): SecureCSRFToken {
    const now = Date.now();
    const { userAgent, ipAddress } = this.extractSecurityInfo(request);
    
    // Generar token único y seguro
    const token = crypto.randomBytes(32).toString('hex');
    
    const csrfToken: SecureCSRFToken = {
      token,
      timestamp: now,
      userAgent,
      ipAddress,
      sessionId
    };

    // Almacenar token
    this.store[token] = csrfToken;
    
    // Limpiar tokens expirados
    this.cleanupExpiredTokens();

    return csrfToken;
  }

  /**
   * Valida un token CSRF de forma segura
   */
  validateSecureToken(token: string, request: NextRequest): boolean {
    const csrfToken = this.store[token];
    if (!csrfToken) {
      return false;
    }

    // Verificar expiración
    const now = Date.now();
    if (now - csrfToken.timestamp > this.tokenExpiry) {
      this.removeToken(token);
      return false;
    }

    // Verificar integridad del token
    const { userAgent, ipAddress } = this.extractSecurityInfo(request);
    
    // Validar agente de usuario
    if (csrfToken.userAgent !== userAgent) {
      this.removeToken(token);
      return false;
    }

    // Validar dirección IP (puede ser más flexible en entornos con proxies)
    if (csrfToken.ipAddress !== ipAddress) {
      this.removeToken(token);
      return false;
    }

    return true;
  }

  /**
   * Elimina un token CSRF
   */
  removeToken(token: string): void {
    delete this.store[token];
  }

  /**
   * Limpia tokens expirados
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, csrfToken] of Object.entries(this.store)) {
      if (now - csrfToken.timestamp > this.tokenExpiry) {
        delete this.store[token];
      }
    }
  }

  /**
   * Obtiene información de seguridad de la solicitud
   */
  private extractSecurityInfo(request?: NextRequest): { userAgent: string; ipAddress: string } {
    if (!request) {
      return {
        userAgent: 'Unknown',
        ipAddress: '127.0.0.1'
      };
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-client-ip') ||
                     '127.0.0.1';
    
    return { userAgent, ipAddress };
  }

  /**
   * Genera múltiples tokens CSRF para mayor seguridad
   */
  generateMultipleTokens(sessionId?: string, request?: NextRequest, count: number = 3): SecureCSRFToken[] {
    const tokens: SecureCSRFToken[] = [];
    for (let i = 0; i < count; i++) {
      tokens.push(this.generateSecureToken(sessionId, request));
    }
    return tokens;
  }

  /**
   * Valida múltiples tokens CSRF
   */
  validateMultipleTokens(tokens: string[], request: NextRequest): boolean {
    // Validar al menos un token
    for (const token of tokens) {
      if (this.validateSecureToken(token, request)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obtiene tokens activos para una sesión
   */
  getActiveTokensForSession(sessionId?: string): SecureCSRFToken[] {
    if (!sessionId) {
      return [];
    }

    return Object.values(this.store).filter(token => token.sessionId === sessionId);
  }

  /**
   * Limpia tokens para una sesión específica
   */
  cleanupSessionTokens(sessionId?: string): void {
    if (!sessionId) {
      return;
    }

    for (const [token, csrfToken] of Object.entries(this.store)) {
      if (csrfToken.sessionId === sessionId) {
        delete this.store[token];
      }
    }
  }
}

// Instancia única del manager CSRF seguro
export const secureCSRFManager = new SecureCSRFManager();

/**
 * Middleware de protección CSRF seguro
 */
export function secureCSRFMiddleware(handler: (request: NextRequest) => Promise<Response> | Response) {
  return async (request: NextRequest) => {
    // Permitir métodos seguros sin CSRF
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return handler(request);
    }

    // Obtener token CSRF de diferentes fuentes
    const csrfToken = request.headers.get('x-csrf-token') ||
                     request.headers.get('x-xsrf-token') ||
                     request.cookies.get('csrf-token')?.value ||
                     (await request.json()).csrfToken;

    if (!csrfToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Token CSRF requerido',
          code: 'MISSING_CSRF_TOKEN'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar token CSRF
    if (!secureCSRFManager.validateSecureToken(csrfToken, request)) {
      return new Response(
        JSON.stringify({ 
          error: 'Token CSRF inválido o expirado',
          code: 'INVALID_CSRF_TOKEN'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request);
  };
}

/**
 * Genera un token CSRF para la respuesta
 */
export function createCSRFResponse(token: string): NextResponse {
  const response = NextResponse.json({ csrfToken: token });
  const cookieString = `csrf-token=${token}; Path=/; HttpOnly=false; Secure; SameSite=Strict; Max-Age=${60 * 60}`;
  response.headers.set('Set-Cookie', cookieString);
  return response;
}

/**
 * Genera múltiples tokens CSRF para mayor seguridad
 */
export function createMultipleCSRFResponse(tokens: SecureCSRFToken[]): NextResponse {
  const response = NextResponse.json({ 
    csrfTokens: tokens.map(t => t.token),
    timestamp: Date.now()
  });

  // Crear cookie con el primer token (para compatibilidad)
  if (tokens.length > 0) {
    const cookieString = `csrf-token=${tokens[0].token}; Path=/; HttpOnly=false; Secure; SameSite=Strict; Max-Age=${60 * 60}`;
    response.headers.set('Set-Cookie', cookieString);
  }

  return response;
}