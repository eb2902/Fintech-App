import crypto from 'crypto';

export interface CSRFToken {
  token: string;
  expires: number;
}

export class CSRFManager {
  private secret: string;
  private tokenExpiry: number;
  private cookieName: string;

  constructor() {
    this.secret = process.env.CSRF_SECRET || crypto.randomBytes(64).toString('hex');
    this.tokenExpiry = 60 * 60 * 1000; // 1 hora en milisegundos
    this.cookieName = '__Host-csrf-token';
  }

  /**
   * Genera un token CSRF único y seguro
   */
  generateToken(): CSRFToken {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + this.tokenExpiry;
    
    return {
      token,
      expires
    };
  }

  /**
   * Crea el valor de la cookie CSRF con firma
   */
  createCookieValue(token: string): string {
    const timestamp = Date.now();
    const signature = this.signToken(token, timestamp);
    return `${token}:${timestamp}:${signature}`;
  }

  /**
   * Verifica y extrae el token de la cookie
   */
  verifyCookie(cookieValue: string): string | null {
    if (!cookieValue) return null;

    const parts = cookieValue.split(':');
    if (parts.length !== 3) return null;

    const [token, timestamp, signature] = parts;
    
    // Verificar la firma
    if (!this.verifySignature(token, parseInt(timestamp), signature)) {
      return null;
    }

    // Verificar expiración (máximo 24 horas)
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    if (now - tokenTime > 24 * 60 * 60 * 1000) {
      return null;
    }

    return token;
  }

  /**
   * Valida un token CSRF contra el token de la cookie
   */
  validateToken(cookieToken: string | null, submittedToken: string): boolean {
    if (!cookieToken || !submittedToken) {
      return false;
    }

    // Comparación segura contra timing attacks
    // Asegurar que ambos buffers tengan la misma longitud
    const cookieBuffer = Buffer.from(cookieToken);
    const submittedBuffer = Buffer.from(submittedToken);
    
    if (cookieBuffer.length !== submittedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(cookieBuffer, submittedBuffer);
  }

  /**
   * Firma un token con la clave secreta
   */
  private signToken(token: string, timestamp: number): string {
    const data = `${token}:${timestamp}:${this.secret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verifica la firma de un token
   */
  private verifySignature(token: string, timestamp: number, signature: string): boolean {
    const expectedSignature = this.signToken(token, timestamp);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

/**
 * Configura las cabeceras de seguridad para la cookie
 */
getCookieHeaders(token: string): string {
  const cookieValue = this.createCookieValue(token);
  
  return `${this.cookieName}=${cookieValue}; ` +
         `Path=/; ` +
         `HttpOnly; ` +
         `Secure; ` +
         `SameSite=Strict; ` +
         `Max-Age=${this.tokenExpiry / 1000}`;
}
}

// Instancia única del manager
export const csrfManager = new CSRFManager();

/**
 * Middleware de Next.js para protección CSRF
 */
export function csrfMiddleware(req: NextRequest, res: NextResponse) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const csrfCookie = cookies[csrfManager.cookieName];
  
  let token = null;
  if (csrfCookie) {
    token = csrfManager.verifyCookie(csrfCookie);
  }

  // Si no hay token válido, generar uno nuevo
  if (!token) {
    const newToken = csrfManager.generateToken();
    token = newToken.token;
    
    // Configurar la cookie en la respuesta
    if (res.headers) {
      res.headers.set('Set-Cookie', csrfManager.getCookieHeaders(token));
    }
  }

  // Adjuntar el token al request para que los handlers lo puedan usar
  (req as { csrfToken?: string }).csrfToken = token;
  
  return req;
}

/**
 * Función auxiliar para parsear cookies
 */
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
 * Protege una ruta específica contra CSRF
 */
export function protectRoute(handler: (req: NextRequest, res: NextResponse, ...args: unknown[]) => Promise<Response> | Response) {
  return async (req: NextRequest, res: NextResponse, ...args: unknown[]) => {
    // Solo proteger métodos POST, PUT, DELETE, PATCH
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || '')) {
      return handler(req, res, ...args);
    }

    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const csrfCookie = cookies[csrfManager.cookieName];
    
    const cookieToken = csrfCookie ? csrfManager.verifyCookie(csrfCookie) : null;
    const submittedToken = req.headers.get('x-csrf-token') || 
                          (req.body && (req.body as { _csrf?: string })._csrf);

    if (!csrfManager.validateToken(cookieToken, submittedToken)) {
      return new Response(
        JSON.stringify({ 
          error: 'Token CSRF inválido o expirado',
          code: 'CSRF_TOKEN_INVALID'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(req, res, ...args);
  };
}