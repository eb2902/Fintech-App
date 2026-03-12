import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/middleware/csrf';
import { sessionManager, validateSession } from '@/lib/auth';

// Proteger esta ruta contra CSRF
export const POST = protectRoute(async (request: NextRequest) => {
  try {
    // Obtener sesión actual
    const session = validateSession(request);
    
    if (session) {
      // Revocar todas las sesiones del usuario
      sessionManager.revokeAllUserSessions(session.userId);
    }

    // Crear respuesta de logout
    const response = NextResponse.json({
      success: true,
      message: 'Todas las sesiones cerradas exitosamente'
    });

    // Eliminar cookie de sesión (configurar con fecha de expiración pasada)
    response.headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT');

    return response;

  } catch (error) {
    console.error('Error en logout all:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
});