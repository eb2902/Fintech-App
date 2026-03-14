import { NextRequest, NextResponse } from 'next/server';
import { secureAuthManager } from '@/lib/secure-auth';
import { secureCookieManager } from '@/lib/secure-cookies';
import { secureCSRFManager } from '@/middleware/secure-csrf';
import { validateSecureSession } from '@/lib/secure-session';

/**
 * Endpoint de logout seguro con validación CSRF y protección contra ataques
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
    const { logoutAllDevices = false } = body;

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

    // Validar sesión
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

    // Realizar logout seguro
    const logoutResult = await secureAuthManager.logoutUser(token, request, logoutAllDevices);

    if (logoutResult.success) {
      // Crear cookies para eliminar sesiones
      const cookiesToDelete = ['session', 'remember', 'csrf-token'];
      const response = NextResponse.json({
        success: true,
        message: logoutResult.message || 'Sesión cerrada exitosamente'
      });

      // Eliminar cookies seguras
      for (const cookieName of cookiesToDelete) {
        try {
          const deleteCookieString = secureCookieManager.deleteCookie(cookieName, '/');
          response.headers.append('Set-Cookie', deleteCookieString);
        } catch (error) {
          console.error(`Error eliminando cookie ${cookieName}:`, error);
        }
      }

      return response;
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: logoutResult.message || 'Error al cerrar sesión',
          code: 'LOGOUT_ERROR'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error en logout seguro:', error);
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