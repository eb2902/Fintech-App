import { NextRequest, NextResponse } from 'next/server';
import { secureAuthManager } from '@/lib/secure-auth';
import { secureCookieManager } from '@/lib/secure-cookies';
import { secureCSRFManager } from '@/middleware/secure-csrf';
import { SecureCookieOptions } from '@/lib/types';

/**
 * Endpoint de login seguro con validación CSRF y protección contra ataques
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validar token CSRF
    const csrfToken = request.headers.get('x-csrf-token') ||
                     request.headers.get('x-xsrf-token') ||
                     request.cookies.get('csrf-token')?.value;

    if (!csrfToken) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token CSRF requerido',
          code: 'MISSING_CSRF_TOKEN'
        },
        { status: 403 }
      );
    }

    if (!secureCSRFManager.validateSecureToken(csrfToken, request)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token CSRF inválido o expirado',
          code: 'INVALID_CSRF_TOKEN'
        },
        { status: 403 }
      );
    }

    // Obtener datos del cuerpo
    const body = await request.json();
    const { email, password, remember } = body;

    // Validar datos de entrada
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Correo electrónico y contraseña son requeridos',
          code: 'MISSING_CREDENTIALS'
        },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Formato de correo electrónico inválido',
          code: 'INVALID_EMAIL'
        },
        { status: 400 }
      );
    }

    // Validar longitud de contraseña
    if (password.length < 8) {
      return NextResponse.json(
        { 
          success: false,
          error: 'La contraseña debe tener al menos 8 caracteres',
          code: 'WEAK_PASSWORD'
        },
        { status: 400 }
      );
    }

    // Intentar autenticación segura
    const authResult = await secureAuthManager.authenticateUser(email, password, request);

    if (authResult.success && authResult.token) {
      // Crear cookies seguras
      const cookies: SecureCookieOptions[] = [
        {
          name: 'session',
          value: authResult.token,
          maxAge: 24 * 60 * 60, // 24 horas
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'strict'
        }
      ];

      // Si se solicita recordar sesión
      if (remember && authResult.user) {
        cookies.push({
          name: 'remember',
          value: authResult.user.id,
          maxAge: 30 * 24 * 60 * 60, // 30 días
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'strict'
        });
      }

      // Crear respuesta con cookies seguras
      const response = NextResponse.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        user: authResult.user,
        token: authResult.token
      });

      // Configurar cookies seguras
      for (const cookieOptions of cookies) {
        try {
          const cookieString = secureCookieManager.createSecureCookie(cookieOptions);
          response.headers.append('Set-Cookie', cookieString);
        } catch (error) {
          console.error('Error creando cookie segura:', error);
          return NextResponse.json(
            { 
              success: false,
              error: 'Error interno del servidor',
              code: 'COOKIE_ERROR'
            },
            { status: 500 }
          );
        }
      }

      return response;
    } else {
      // Retornar error de autenticación
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error || 'Credenciales inválidas',
          code: authResult.code || 'AUTH_FAILED'
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Error en login seguro:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para obtener token CSRF
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Generar token CSRF seguro
    const csrfToken = secureCSRFManager.generateSecureToken(undefined, request);
    
    // Crear respuesta con token CSRF
    const response = NextResponse.json({
      csrfToken: csrfToken.token,
      timestamp: csrfToken.timestamp
    });

    // Configurar cookie CSRF segura
    const cookieString = secureCookieManager.createCSRFCookie(csrfToken.token, {
      path: '/',
      maxAge: 60 * 60 // 1 hora
    });

    response.headers.set('Set-Cookie', cookieString);

    return response;

  } catch (error) {
    console.error('Error generando token CSRF:', error);
    return NextResponse.json(
      { 
        error: 'Error generando token CSRF',
        code: 'CSRF_ERROR'
      },
      { status: 500 }
    );
  }
}