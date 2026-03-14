import { NextRequest, NextResponse } from 'next/server';
import { SecureCookieOptions } from './types';


/**
 * Clase para manejar cookies seguras con rutas absolutas válidas
 */
export class SecureCookieManager {
  private readonly defaultOptions: Partial<SecureCookieOptions> = {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    priority: 'high'
  };

  /**
   * Crea una cookie segura con validación de ruta
   */
  createSecureCookie(options: SecureCookieOptions): string {
    // Validar nombre de cookie
    if (!this.isValidCookieName(options.name)) {
      throw new Error('Nombre de cookie inválido');
    }

    // Validar valor de cookie
    if (!this.isValidCookieValue(options.value)) {
      throw new Error('Valor de cookie inválido');
    }

    // Validar ruta absoluta
    const path = this.validateAbsolutePath(options.path || this.defaultOptions.path!);
    
    // Validar dominio
    const domain = this.validateDomain(options.domain);

    // Construir cookie segura
    const cookieParts = [
      `${encodeURIComponent(options.name)}=${encodeURIComponent(options.value)}`,
      `Path=${path}`,
      `Domain=${domain}`,
      `Max-Age=${options.maxAge || 86400}`, // 24 horas por defecto
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Priority=High'
    ];

    // Añadir fecha de expiración si se proporciona
    if (options.expires) {
      cookieParts.push(`Expires=${options.expires.toUTCString()}`);
    }

    return cookieParts.join('; ');
  }

  /**
   * Valida el nombre de una cookie
   */
  private isValidCookieName(name: string): boolean {
    // No debe contener caracteres especiales
    const invalidChars = /[=,; \t\r\n\0\x85\u2028\u2029]/;
    return Boolean(name && !invalidChars.test(name) && name.length <= 100);
  }

  /**
   * Valida el valor de una cookie
   */
  private isValidCookieValue(value: string): boolean {
    // No debe contener caracteres de control
    const controlChars = /[\x00-\x1F\x7F]/;
    return Boolean(value && !controlChars.test(value) && value.length <= 4096);
  }

  /**
   * Valida y normaliza una ruta absoluta
   */
  private validateAbsolutePath(path: string): string {
    // Asegurar que la ruta sea absoluta
    if (!path.startsWith('/')) {
      throw new Error('La ruta debe ser absoluta (comenzar con /)');
    }

    // Normalizar la ruta
    const normalizedPath = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    
    // Validar longitud
    if (normalizedPath.length > 2000) {
      throw new Error('Ruta demasiado larga');
    }

    return normalizedPath;
  }

  /**
   * Valida y normaliza un dominio
   */
  private validateDomain(domain?: string): string {
    if (!domain) {
      return ''; // Dominio vacío para cookies de host actual
    }

    // Validar formato de dominio
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!domainRegex.test(domain)) {
      throw new Error('Dominio inválido');
    }

    // No debe ser demasiado largo
    if (domain.length > 253) {
      throw new Error('Dominio demasiado largo');
    }

    return domain;
  }

  /**
   * Elimina una cookie estableciéndola como expirada
   */
  deleteCookie(name: string, path: string = '/', domain?: string): string {
    return this.createSecureCookie({
      name,
      value: '',
      path,
      domain,
      expires: new Date(0), // Fecha en el pasado
      maxAge: 0
    });
  }

  /**
   * Obtiene una cookie segura del request
   */
  getCookie(request: NextRequest, name: string): string | null {
    const cookies = request.headers.get('cookie');
    if (!cookies) {
      return null;
    }

    const cookiePairs = cookies.split(';');
    for (const pair of cookiePairs) {
      const [cookieName, cookieValue] = pair.trim().split('=');
      if (cookieName === name) {
        try {
          return decodeURIComponent(cookieValue);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Verifica si una cookie es segura
   */
  isSecureCookie(cookie: string): boolean {
    const requiredFlags = ['HttpOnly', 'Secure', 'SameSite=Strict'];
    
    for (const flag of requiredFlags) {
      if (!cookie.includes(flag)) {
        return false;
      }
    }

    // Verificar que tenga una ruta absoluta válida
    const pathMatch = cookie.match(/Path=([^;]+)/);
    if (!pathMatch || !pathMatch[1].startsWith('/')) {
      return false;
    }

    return true;
  }

  /**
   * Crea una cookie de sesión segura
   */
  createSessionCookie(token: string, options: Partial<SecureCookieOptions> = {}): string {
    return this.createSecureCookie({
      name: 'session',
      value: token,
      maxAge: 24 * 60 * 60, // 24 horas
      ...options
    });
  }

  /**
   * Crea una cookie CSRF segura
   */
  createCSRFCookie(token: string, options: Partial<SecureCookieOptions> = {}): string {
    return this.createSecureCookie({
      name: 'csrf-token',
      value: token,
      maxAge: 60 * 60, // 1 hora
      httpOnly: false, // Necesario para acceder desde JavaScript
      ...options
    });
  }

  /**
   * Crea una cookie de recordar sesión
   */
  createRememberCookie(userId: string, options: Partial<SecureCookieOptions> = {}): string {
    return this.createSecureCookie({
      name: 'remember',
      value: userId,
      maxAge: 30 * 24 * 60 * 60, // 30 días
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      ...options
    });
  }
}

// Instancia única del manager de cookies seguras
export const secureCookieManager = new SecureCookieManager();

/**
 * Middleware para validar cookies seguras
 */
export function validateSecureCookies(request: NextRequest): boolean {
  const cookies = request.headers.get('cookie');
  if (!cookies) {
    return false;
  }

  const cookiePairs = cookies.split(';');
  for (const pair of cookiePairs) {
    const cookie = pair.trim();
    if (cookie && !secureCookieManager.isSecureCookie(cookie)) {
      return false;
    }
  }

  return true;
}

/**
 * Función auxiliar para crear una respuesta con cookies seguras
 */
export function createResponseWithSecureCookies<T>(
  data: T, 
  cookies: SecureCookieOptions[], 
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  for (const cookieOptions of cookies) {
    const cookieString = secureCookieManager.createSecureCookie(cookieOptions);
    response.headers.append('Set-Cookie', cookieString);
  }

  return response;
}

/**
 * Función auxiliar para eliminar cookies seguras
 */
export function createResponseWithDeletedCookies<T>(
  data: T, 
  cookieNames: string[], 
  path: string = '/',
  domain?: string,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  for (const name of cookieNames) {
    const deleteCookieString = secureCookieManager.deleteCookie(name, path, domain);
    response.headers.append('Set-Cookie', deleteCookieString);
  }

  return response;
}
