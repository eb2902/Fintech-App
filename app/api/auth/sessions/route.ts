import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/middleware/csrf';
import { sessionManager, validateSession } from '@/lib/auth';

// Proteger esta ruta contra CSRF
export const GET = protectRoute(async (request: NextRequest) => {
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

    // Obtener todas las sesiones del usuario
    const userSessions = sessionManager.getUserSessions(session.userId);

    // Formatear las sesiones para la respuesta
    const sessionsData = userSessions.map(sess => ({
      id: sess.id,
      userAgent: sess.userAgent,
      ipAddress: sess.ipAddress,
      isActive: sess.isActive,
      lastActivity: sess.lastActivity,
      createdAt: sess.createdAt,
      expiresAt: sess.expiresAt,
      isCurrent: sess.id === session.sessionId
    }));

    return NextResponse.json({
      success: true,
      sessions: sessionsData,
      totalSessions: sessionsData.length
    });

  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
});

// Proteger esta ruta contra CSRF
export const DELETE = protectRoute(async (request: NextRequest) => {
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

    // Obtener el ID de sesión a cerrar desde el body
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { 
          error: 'ID de sesión requerido',
          code: 'MISSING_SESSION_ID'
        },
        { status: 400 }
      );
    }

    // Verificar que la sesión pertenece al usuario
    const userSessions = sessionManager.getUserSessions(session.userId);
    const targetSession = userSessions.find(s => s.id === sessionId);

    if (!targetSession) {
      return NextResponse.json(
        { 
          error: 'Sesión no encontrada o no autorizada',
          code: 'SESSION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // No permitir cerrar la sesión actual
    if (sessionId === session.sessionId) {
      return NextResponse.json(
        { 
          error: 'No puedes cerrar tu sesión actual',
          code: 'CANNOT_CLOSE_CURRENT_SESSION'
        },
        { status: 400 }
      );
    }

    // Revocar la sesión
    sessionManager.revokeSession(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    console.error('Error cerrando sesión:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
});