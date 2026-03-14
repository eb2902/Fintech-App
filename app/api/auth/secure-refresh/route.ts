import { NextRequest, NextResponse } from 'next/server';
import { secureAuthManager } from '@/lib/secure-auth';
import { validateSecureSession } from '@/lib/secure-session';
import { secureCSRFManager } from '@/middleware/secure-csrf';

/**
 * Endpoint para refrescar tokens JWT de forma segura
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

    // Obtener token de autorización
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token de autenticación requerido',
          code: 'MISSING_TOKEN'
        },
        { status: 401 }
      );
    }

    // Validar sesión actual
    const session = validateSecureSession(request);
    if (!session) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Sesión inválida o expirada',
          code: 'INVALID_SESSION'
        },
        { status: 401 }
      );
    }

    // Refrescar sesión
    const refreshResult = await secureAuthManager.refreshSession(token, request);

    if (refreshResult.success && refreshResult.token) {
      // Crear cookie de sesión segura con el nuevo token
      const response = NextResponse.json({
        success: true,
        message: 'Sesión refrescada exitosamente',
        user: refreshResult.user,
        token: refreshResult.token
      });

      // Configurar cookie de sesión segura
      const cookieString = `session=${refreshResult.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`;
      response.headers.set('Set-Cookie', cookieString);

      return response;
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: refreshResult.error || 'Error al refrescar sesión',
          code: refreshResult.code || 'REFRESH_ERROR'
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Error en refresh de sesión seguro:', error);
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