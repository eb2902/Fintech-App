import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/middleware/csrf';
import { sessionManager } from '@/lib/auth';
import { securityMiddleware, bruteForceProtection, validateCSRFToken } from '@/middleware/security';

// Proteger esta ruta contra CSRF
export const POST = protectRoute(async (request: NextRequest) => {
  // Aplicar middleware de seguridad
  const securityResponse = securityMiddleware(request);
  if (securityResponse.status !== 200) {
    return securityResponse;
  }

  // Protección contra fuerza bruta
  const bruteForceResponse = bruteForceProtection();
  if (bruteForceResponse.status !== 200) {
    return bruteForceResponse;
  }

  // Validar CSRF token
  if (!validateCSRFToken(request)) {
    return new Response('Token CSRF inválido', { status: 403 });
  }
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validación básica de entrada
    if (!email || !password) {
      return NextResponse.json(
        { 
          error: 'Correo electrónico y contraseña son requeridos',
          code: 'MISSING_CREDENTIALS'
        },
        { status: 400 }
      );
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Formato de correo electrónico inválido',
          code: 'INVALID_EMAIL'
        },
        { status: 400 }
      );
    }

    // Validación de longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { 
          error: 'La contraseña debe tener al menos 6 caracteres',
          code: 'WEAK_PASSWORD'
        },
        { status: 400 }
      );
    }

    // TODO: Implementar lógica de autenticación real
    // Esto debería conectarse a tu base de datos y verificar credenciales
    
    // Simulación de autenticación exitosa
    const user = {
      id: 'user-123',
      email: email,
      name: 'Usuario de Prueba',
      role: 'user'
    };

    // Verificar límite de sesiones
    if (!sessionManager.checkSessionLimit(user.id)) {
      return NextResponse.json(
        { 
          error: 'Límite de sesiones concurrentes alcanzado. Por favor, cierra sesiones en otros dispositivos.',
          code: 'SESSION_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }

    // Generar token JWT seguro
    const { userAgent, ipAddress } = sessionManager.extractSecurityInfo(request);
    const sessionId = sessionManager.generateSessionId();
    
    const sessionData = {
      userId: user.id,
      email: user.email,
      userAgent,
      ipAddress,
      sessionId
    };

    const token = sessionManager.generateToken(sessionData);

    // Almacenar sesión
    const userSession = {
      id: sessionId,
      userId: user.id,
      token,
      userAgent,
      ipAddress,
      isActive: true,
      lastActivity: new Date(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    
    sessionManager.storeSession(userSession);

    // Configurar cookie de sesión segura
    const response = NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token // Incluir token para uso en frontend
    });

    // Configurar cookie de sesión segura
    response.headers.set('Set-Cookie', createSessionCookie(token));

    return response;

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
});

/**
 * Crea una cookie de sesión segura
 */
function createSessionCookie(token: string): string {
  return `session=${token}; ` +
         `Path=/; ` +
         `HttpOnly; ` +
         `Secure; ` +
         `SameSite=Strict; ` +
         `Max-Age=${24 * 60 * 60}`; // 24 horas en segundos
}
