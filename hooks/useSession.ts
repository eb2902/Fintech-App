'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCSRF } from '@/lib/csrf';

export interface SessionInfo {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
  lastActivity: number;
  expiresAt: number;
}

export interface UseSessionReturn {
  session: SessionInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkSessionExpiration: () => boolean;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchWithToken } = useCSRF();

  // Obtener sesión actual
  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetchWithToken('/api/auth/session');
      
      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          setSession(data.session);
        } else {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Error obteniendo sesión:', err);
      setError('Error al obtener la sesión');
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithToken]);

  // Verificar si la sesión ha expirado
  const checkSessionExpiration = useCallback((): boolean => {
    if (!session) return false;
    
    const isExpired = session.expiresAt <= Date.now();
    if (isExpired) {
      setSession(null);
      return true;
    }
    return false;
  }, [session]);

  // Cerrar sesión
  const logout = useCallback(async () => {
    try {
      const response = await fetchWithToken('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        setSession(null);
      } else {
        setError('Error al cerrar sesión');
      }
    } catch (err) {
      console.error('Error cerrando sesión:', err);
      setError('Error al cerrar sesión');
    }
  }, [fetchWithToken]);

  // Cerrar todas las sesiones
  const logoutAll = useCallback(async () => {
    try {
      const response = await fetchWithToken('/api/auth/logout-all', {
        method: 'POST',
      });

      if (response.ok) {
        setSession(null);
      } else {
        setError('Error al cerrar todas las sesiones');
      }
    } catch (err) {
      console.error('Error cerrando todas las sesiones:', err);
      setError('Error al cerrar todas las sesiones');
    }
  }, [fetchWithToken]);

  // Renovar sesión
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetchWithToken('/api/auth/refresh', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          setSession(data.session);
        }
      } else {
        setError('Error al renovar la sesión');
      }
    } catch (err) {
      console.error('Error renovando sesión:', err);
      setError('Error al renovar la sesión');
    }
  }, [fetchWithToken]);

  // Cargar sesión al montar el componente
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Monitorear expiración de sesión cada 30 segundos
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      if (checkSessionExpiration()) {
        // La sesión ha expirado
        console.warn('La sesión ha expirado automáticamente');
      }
    }, 30000); // Verificar cada 30 segundos

    return () => clearInterval(interval);
  }, [session, checkSessionExpiration]);

  // Renovar sesión automáticamente cuando esté próxima a expirar
  useEffect(() => {
    if (!session) return;

    const timeUntilExpiry = session.expiresAt - Date.now();
    const warningThreshold = 10 * 60 * 1000; // 10 minutos

    if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
      // Intentar renovar automáticamente
      refreshSession();
    }
  }, [session, refreshSession]);

  return {
    session,
    isAuthenticated: !!session && !checkSessionExpiration(),
    isLoading,
    error,
    logout,
    logoutAll,
    refreshSession,
    checkSessionExpiration,
  };
}