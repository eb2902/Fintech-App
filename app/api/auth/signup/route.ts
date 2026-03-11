import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/middleware/csrf';
import { randomUUID } from 'crypto';

// Proteger esta ruta contra CSRF
export const POST = protectRoute(async (request: NextRequest, context: { params: Promise<{}> }) => {
  try {
    const body = await request.json();
    const { fullName, email, password, confirmPassword } = body;

    // Validación básica de entrada
    if (!fullName || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { 
          error: 'Todos los campos son requeridos',
          code: 'MISSING_FIELDS'
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

    // Validación de longitud del nombre
    if (fullName.trim().length < 2) {
      return NextResponse.json(
        { 
          error: 'El nombre completo debe tener al menos 2 caracteres',
          code: 'INVALID_NAME'
        },
        { status: 400 }
      );
    }

    // Validación de contraseña
    if (password.length < 8) {
      return NextResponse.json(
        { 
          error: 'La contraseña debe tener al menos 8 caracteres',
          code: 'WEAK_PASSWORD'
        },
        { status: 400 }
      );
    }

    // Validación de complejidad de contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { 
          error: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
          code: 'WEAK_PASSWORD_COMPLEXITY'
        },
        { status: 400 }
      );
    }

    // Validación de coincidencia de contraseñas
    if (password !== confirmPassword) {
      return NextResponse.json(
        { 
          error: 'Las contraseñas no coinciden',
          code: 'PASSWORDS_DO_NOT_MATCH'
        },
        { status: 400 }
      );
    }

    // TODO: Verificar si el email ya está registrado
    // Esto debería consultarse en tu base de datos
    
    // TODO: Implementar lógica de registro real
    // Esto debería conectarse a tu base de datos y crear el usuario
    
    // Simulación de registro exitoso
    const newUser = {
      id: 'user-' + randomUUID(),
      email: email,
      name: fullName.trim(),
      role: 'user',
      createdAt: new Date().toISOString()
    };

    // Generar token de sesión (esto debería ser un JWT real)
    const sessionToken = generateSessionToken(newUser.id);

    // Configurar cookie de sesión segura
    const response = NextResponse.json({
      success: true,
      message: 'Registro exitoso',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });

    // Configurar cookie de sesión segura
    response.headers.set('Set-Cookie', createSessionCookie(sessionToken));

    return response;

  } catch (error) {
    console.error('Error en registro:', error);
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
