import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware de seguridad avanzado
 */

// Headers de seguridad
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Patrones de ataques comunes
const ATTACK_PATTERNS = [
  /<\s*script\b/gi, // Detección de etiquetas <script> (XSS)
  /javascript:/gi, // JavaScript injection
  /on\w+\s*=/gi, // Event handlers
  /<iframe\b/gi, // Iframes
  /eval\s*\(/gi, // Eval usage
  /document\.cookie/gi, // Cookie access
  /document\.write/gi, // Document write
];

// IPs bloqueadas (en producción usar una lista dinámica)
const BLOCKED_IPS = new Set(['127.0.0.1']); // Ejemplo

/**
 * Middleware de seguridad
 */
export function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Aplicar headers de seguridad
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Validar User-Agent
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent || userAgent.length < 10) {
    return new Response('User-Agent inválido', { status: 400 });
  }

  // Validar tamaño del body
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB
    return new Response('Tamaño de solicitud demasiado grande', { status: 413 });
  }

  // Validar headers sospechosos
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'];
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && (value.includes('<') || value.includes('>'))) {
      return new Response('Headers sospechosos detectados', { status: 400 });
    }
  }

  // Bloquear IPs maliciosas
  const clientIP = getClientIP(request);
  if (BLOCKED_IPS.has(clientIP)) {
    return new Response('Acceso denegado', { status: 403 });
  }

  return response;
}

/**
 * Middleware de protección contra ataques de enumeración
 */
export function enumerationProtection() {
  // Limitar intentos de login
  if (getLoginAttempts() > 5) {
    return new Response('Demasiados intentos de login', { status: 429 });
  }

  return NextResponse.next();
}

/**
 * Middleware de protección contra fuerza bruta
 */
export function bruteForceProtection() {
  const attempts = getBruteForceAttempts();
  
  if (attempts > 10) {
    return new Response('Protección contra fuerza bruta activa', { status: 429 });
  }

  return NextResponse.next();
}

/**
 * Validar tokens CSRF en solicitudes críticas
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const csrfToken = request.headers.get('x-csrf-token');
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const csrfCookie = cookies['__Host-csrf-token'];

  if (!csrfToken || !csrfCookie) {
    return false;
  }

  // Validar token (implementación simplificada)
  return csrfToken.length > 0 && csrfCookie.length > 0;
}

/**
 * Detectar actividad sospechosa
 */
export function detectSuspiciousActivity(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const path = request.nextUrl.pathname;
  
  // Detectar bots maliciosos
  const maliciousBots = [
    /bot.*google.*bad/i,
    /crawler.*evil/i,
    /scanner.*vulnerability/i,
  ];

  for (const pattern of maliciousBots) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }

  // Detectar patrones de ataque en la URL
  for (const pattern of ATTACK_PATTERNS) {
    if (pattern.test(path)) {
      return true;
    }
  }

  return false;
}

/**
 * Funciones auxiliares
 */

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         '127.0.0.1';
}

function getLoginAttempts(): number {
  // Implementación simplificada - en producción usar Redis o base de datos
  // Aquí deberías consultar tu sistema de almacenamiento
  return 0;
}

function getBruteForceAttempts(): number {
  // Implementación simplificada - en producción usar Redis o base de datos
  return 0;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...value] = cookie.trim().split('=');
      if (name && value.length) {
        cookies[name] = value.join('=');
      }
    });
  }
  return cookies;
}

/**
 * Proteger rutas específicas
 */
export function protectRoute(route: string, handler: (request: NextRequest) => Response | Promise<Response>) {
  return async (request: NextRequest) => {
    // Aplicar validaciones de seguridad
    const securityResponse = securityMiddleware(request);
    if (securityResponse.status !== 200) {
      return securityResponse;
    }

    // Validar CSRF para rutas críticas
    if (['/api/auth/login', '/api/auth/logout', '/api/auth/signup'].includes(route)) {
      if (!validateCSRFToken(request)) {
        return new Response('Token CSRF inválido', { status: 403 });
      }
    }

    // Detectar actividad sospechosa
    if (detectSuspiciousActivity(request)) {
      return new Response('Actividad sospechosa detectada', { status: 403 });
    }

    return handler(request);
  };
}