import { useEffect, useState, useCallback } from 'react';

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

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<SessionError | null>(null);

  // Obtener sesión actual
  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Intentar obtener sesión desde el token almacenado
      const token = getStoredToken();
      if (!token) {
        setSession(null);
        setIsLoading(false);
        return;
      }

      // Validar sesión con el backend
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Error validando sesión');
      }

      const responseData = await response.json();
      setSession(responseData.session);
    } catch (error) {
      console.error('Error obteniendo sesión:', error);
      setSession(null);
      setError({
        code: 'SESSION_ERROR',
        message: error instanceof Error ? error.message : 'Error obteniendo sesión'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Iniciar sesión
  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener token CSRF
      const csrfResponse = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });

      if (!csrfResponse.ok) {
        throw new Error('No se pudo obtener token CSRF');
      }

      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.token;

      // Intentar login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el login');
      }

      const loginData = await response.json();
      
      // Almacenar token
      if (loginData.token) {
        storeToken(loginData.token);
      }

      setSession({
        userId: loginData.user.id,
        email: loginData.user.email,
        name: loginData.user.name,
        sessionId: loginData.user.sessionId || '',
        lastActivity: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      });

      return { success: true };
    } catch (error) {
      console.error('Error en login:', error);
      setError({
        code: 'LOGIN_ERROR',
        message: error instanceof Error ? error.message : 'Error en el login'
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cerrar sesión
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener token CSRF
      const csrfResponse = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });

      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.token;

        // Cerrar sesión en el backend
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
        });
      }

      // Limpiar token almacenado
      clearStoredToken();
      setSession(null);
      return { success: true };
    } catch (error) {
      console.error('Error en logout:', error);
      setError({
        code: 'LOGOUT_ERROR',
        message: error instanceof Error ? error.message : 'Error en el logout'
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cerrar todas las sesiones
  const logoutAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener token CSRF
      const csrfResponse = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });

      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.token;

        // Cerrar todas las sesiones en el backend
        await fetch('/api/auth/logout-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
        });
      }

      // Limpiar token almacenado
      clearStoredToken();
      setSession(null);
      return { success: true };
    } catch (error) {
      console.error('Error en logout all:', error);
      setError({
        code: 'LOGOUT_ALL_ERROR',
        message: error instanceof Error ? error.message : 'Error cerrando sesiones'
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verificar expiración de sesión
  const checkSessionExpiration = useCallback(() => {
    if (session && session.expiresAt < Date.now()) {
      logout();
      return false;
    }
    return true;
  }, [session, logout]);

  // Renovar sesión automáticamente
  const refreshSession = useCallback(async () => {
    if (!session) return false;

    try {
      const token = getStoredToken();
      if (!token) {
        logout();
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('No se pudo renovar la sesión');
      }

      await response.json();
      setSession({
        ...session,
        lastActivity: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      });

      return true;
    } catch (error) {
      console.error('Error renovando sesión:', error);
      logout();
      return false;
    }
  }, [session, logout]);

  // Almacenar token en localStorage
  function storeToken(token: string) {
    try {
      localStorage.setItem('auth_token', token);
    } catch {
      console.warn('No se pudo almacenar el token en localStorage');
    }
  }

  // Obtener token de localStorage
  function getStoredToken(): string | null {
    try {
      return localStorage.getItem('auth_token');
    } catch {
      console.warn('No se pudo obtener el token de localStorage');
      return null;
    }
  }

  // Limpiar token de localStorage
  function clearStoredToken() {
    try {
      localStorage.removeItem('auth_token');
    } catch {
      console.warn('No se pudo limpiar el token de localStorage');
    }
  }

  // Inicializar sesión al montar el componente
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Verificar expiración periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (session) {
        checkSessionExpiration();
      }
    }, 60000); // Verificar cada minuto

    return () => clearInterval(interval);
  }, [session, checkSessionExpiration]);

  return {
    session,
    isLoading,
    error,
    login,
    logout,
    logoutAll,
    refreshSession,
    checkSessionExpiration,
    isAuthenticated: !!session && checkSessionExpiration(),
  };
}