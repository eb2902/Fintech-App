import { NextRequest } from 'next/server';

export interface SessionInfo {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
  lastActivity: number;
  expiresAt: number;
}

export interface SessionError {
  code: string;
  message: string;
}

// Exportar el hook para que pueda ser importado desde lib/session
export { useSession } from '@/hooks/useSession';

/**
 * Obtiene la sesión actual desde el token JWT
 */
export async function getSession(request: NextRequest): Promise<SessionInfo | null> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return null;
    }

    // Aquí normalmente validarías el token JWT
    // Por ahora, retornamos una sesión de ejemplo
    // En una implementación real, usarías jwt.verify()
    
    return {
      userId: 'user_123',
      email: 'user@example.com',
      name: 'Usuario de Prueba',
      sessionId: 'session_123',
      lastActivity: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
    };
  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    return null;
  }
}

/**
 * Obtiene el token JWT desde la solicitud
 */
function getTokenFromRequest(request: NextRequest): string | null {
  // Intentar obtener el token del header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Intentar obtener el token de las cookies
  const cookies = request.headers.get('cookie') || '';
  const cookieList = cookies.split(';');
  
  for (const cookie of cookieList) {
    const [name, value] = cookie.trim().split('=');
    if (name === '__Host-auth-token') {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Verifica si una sesión es válida
 */
export function isValidSession(session: SessionInfo | null): boolean {
  if (!session) {
    return false;
  }

  return session.expiresAt > Date.now();
}

/**
 * Genera un nuevo ID de sesión
 */
export function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Calcula el tiempo restante de una sesión en milisegundos
 */
export function getSessionTimeRemaining(session: SessionInfo): number {
  return Math.max(0, session.expiresAt - Date.now());
}

/**
 * Verifica si la sesión está próxima a expirar (menos de 10 minutos)
 */
export function isSessionExpiring(session: SessionInfo): boolean {
  const timeRemaining = getSessionTimeRemaining(session);
  return timeRemaining < (10 * 60 * 1000); // 10 minutos
}