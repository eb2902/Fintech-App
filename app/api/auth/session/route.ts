import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/middleware/csrf';
import { validateSession } from '@/lib/auth';

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

    return NextResponse.json({
      success: true,
      session: {
        userId: session.userId,
        email: session.email,
        sessionId: session.sessionId,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
});