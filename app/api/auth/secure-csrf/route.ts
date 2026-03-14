import { NextRequest, NextResponse } from 'next/server';
import { secureCSRFManager } from '@/middleware/secure-csrf';

/**
 * Endpoint para generar y validar tokens CSRF seguros
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Generar token CSRF seguro
    const csrfToken = secureCSRFManager.generateSecureToken(undefined, request);
    
    // Crear respuesta con token CSRF
    const response = NextResponse.json({
      csrfToken: csrfToken.token,
      timestamp: csrfToken.timestamp,
      expiresAt: csrfToken.timestamp + (60 * 60 * 1000) // 1 hora
    });

    // Configurar cookie CSRF segura
    const cookieString = `csrf-token=${csrfToken.token}; Path=/; HttpOnly=false; Secure; SameSite=Strict; Max-Age=${60 * 60}`;
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

/**
 * Endpoint para validar tokens CSRF
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { csrfToken } = body;

    if (!csrfToken) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Token CSRF requerido',
          code: 'MISSING_CSRF_TOKEN'
        },
        { status: 400 }
      );
    }

    // Validar token CSRF
    const isValid = secureCSRFManager.validateSecureToken(csrfToken, request);

    if (isValid) {
      return NextResponse.json({
        valid: true,
        message: 'Token CSRF válido'
      });
    } else {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Token CSRF inválido o expirado',
          code: 'INVALID_CSRF_TOKEN'
        },
        { status: 403 }
      );
    }

  } catch (error) {
    console.error('Error validando token CSRF:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para generar múltiples tokens CSRF para mayor seguridad
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { count = 3 } = body;

    // Generar múltiples tokens CSRF
    const csrfTokens = secureCSRFManager.generateMultipleTokens(undefined, request, count);
    
    const response = NextResponse.json({
      csrfTokens: csrfTokens.map(t => t.token),
      timestamp: Date.now(),
      expiresAt: Date.now() + (60 * 60 * 1000) // 1 hora
    });

    // Configurar cookie CSRF segura con el primer token
    if (csrfTokens.length > 0) {
      const cookieString = `csrf-token=${csrfTokens[0].token}; Path=/; HttpOnly=false; Secure; SameSite=Strict; Max-Age=${60 * 60}`;
      response.headers.set('Set-Cookie', cookieString);
    }

    return response;

  } catch (error) {
    console.error('Error generando múltiples tokens CSRF:', error);
    return NextResponse.json(
      { 
        error: 'Error generando tokens CSRF',
        code: 'CSRF_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para limpiar tokens CSRF de una sesión
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    // Limpiar tokens CSRF (en producción usar sessionId real)
    secureCSRFManager.cleanupSessionTokens();

    return NextResponse.json({
      success: true,
      message: 'Tokens CSRF limpiados exitosamente'
    });

  } catch (error) {
    console.error('Error limpiando tokens CSRF:', error);
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
