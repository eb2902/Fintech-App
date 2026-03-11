import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/middleware/csrf';

// Proteger esta ruta contra CSRF
export const POST = protectRoute(async (request: NextRequest) => {
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

    // Generar token de sesión (esto debería ser un JWT real)
    const sessionToken = generateSessionToken(user.id);

    // Configurar cookie de sesión segura
    const response = NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

    // Configurar cookie de sesión segura
    response.headers.set('Set-Cookie', createSessionCookie(sessionToken));

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
 * Genera un token de sesión (en producción debería ser un JWT)
 */
function generateSessionToken(userId: string): string {
  const payload = {
    userId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
  };
  
  // En producción, usa una librería JWT como jsonwebtoken
  return btoa(JSON.stringify(payload));
}

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
