import { NextRequest, NextResponse } from 'next/server';
import { validateSecureSession } from '@/lib/secure-session';
import { secureSessionManager } from '@/lib/secure-session';

/**
 * Endpoint para obtener información de la sesión actual
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
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

    // Obtener información detallada de la sesión
    const sessionInfo = secureSessionManager.getSecureSession(session.sessionId);
    
    if (!sessionInfo || !sessionInfo.isActive) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Sesión no encontrada o inactiva',
          code: 'SESSION_NOT_FOUND'
        },
        { status: 401 }
      );
    }

    // Retornar información de la sesión
    return NextResponse.json({
      success: true,
      session: {
        userId: session.userId,
        email: session.email,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        sessionId: session.sessionId,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
        fingerprint: session.fingerprint
      },
      sessionInfo: {
        isActive: sessionInfo.isActive,
        createdAt: sessionInfo.createdAt,
        lastActivity: sessionInfo.lastActivity,
        expiresAt: sessionInfo.expiresAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo información de sesión:', error);
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

/**
 * Endpoint para validar la integridad de la sesión
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    // Verificar integridad de la sesión
    const isValid = secureSessionManager.validateSecureSessionIntegrity(session, request);
    
    if (!isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Integridad de sesión comprometida',
          code: 'SESSION_COMPROMISED'
        },
        { status: 401 }
      );
    }

    // Actualizar actividad de la sesión
    secureSessionManager.updateSecureSessionActivity(session.sessionId);

    return NextResponse.json({
      success: true,
      message: 'Sesión válida',
      session: {
        userId: session.userId,
        email: session.email,
        lastActivity: session.lastActivity
      }
    });

  } catch (error) {
    console.error('Error validando integridad de sesión:', error);
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

/**
 * Endpoint para obtener sesiones activas del usuario
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
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

    // Obtener sesiones activas del usuario
    const userSessions = secureSessionManager.getUserSecureSessions(session.userId);

    return NextResponse.json({
      success: true,
      sessions: userSessions.map(s => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        isActive: s.isActive,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt
      })),
      currentSessionId: session.sessionId,
      totalSessions: userSessions.length
    });

  } catch (error) {
    console.error('Error obteniendo sesiones del usuario:', error);
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