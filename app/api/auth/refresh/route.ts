import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/middleware/csrf';
import { sessionManager, validateSession } from '@/lib/auth';

// Proteger esta ruta contra CSRF
export const POST = protectRoute(async (request: NextRequest) => {
  try {
    // Obtener sesión actual
    const session = validateSession(request);
    
    if (!session) {
      return NextResponse.json(
        { 
          error: 'No autorizado',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Verificar que la sesión no esté a punto de expirar (renovar con 30 minutos de antelación)
    const timeUntilExpiry = session.expiresAt - Date.now();
    const renewalThreshold = 30 * 60 * 1000; // 30 minutos

    if (timeUntilExpiry > renewalThreshold) {
      return NextResponse.json(
        { 
          error: 'La sesión no necesita ser renovada aún',
          code: 'SESSION_NOT_READY_FOR_REFRESH'
        },
        { status: 400 }
      );
    }

    // Generar nuevo token
    const newToken = sessionManager.generateToken({
      userId: session.userId,
      email: session.email,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      sessionId: session.sessionId
    });

    // Actualizar sesión en el almacenamiento
    const userSession = sessionManager.getSession(session.sessionId);
    if (userSession) {
      userSession.token = newToken;
      userSession.lastActivity = new Date();
      userSession.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      sessionManager.storeSession(userSession);
    }

    return NextResponse.json({
      success: true,
      message: 'Sesión renovada exitosamente',
      token: newToken
    });

  } catch (error) {
    console.error('Error renovando sesión:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
});