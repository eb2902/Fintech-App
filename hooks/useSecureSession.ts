import { useState, useEffect, useCallback } from 'react';
import { SecureSessionData } from '@/lib/secure-session';
import { SecureAuthResult } from '@/lib/secure-auth';

export interface SecureSessionState {
  user: SecureSessionData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SecureSessionActions {
  login: (email: string, password: string) => Promise<SecureAuthResult>;
  logout: (logoutAllDevices?: boolean) => Promise<{ success: boolean; message?: string }>;
  refreshSession: () => Promise<SecureAuthResult>;
  clearError: () => void;
}

/**
 * Hook para manejar sesiones seguras en el frontend
 */
export function useSecureSession(): [SecureSessionState, SecureSessionActions] {
  const [state, setState] = useState<SecureSessionState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  /**
   * Obtiene la sesión actual del backend
   */
  const fetchSession = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/secure-session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          user: data.session,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        }));
      }
    } catch {
      console.error('Error al obtener sesión');
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Error al obtener la sesión'
      }));
    }
  }, []);

  /**
   * Inicia sesión de forma segura
   */
  const login = useCallback(async (email: string, password: string): Promise<SecureAuthResult> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Obtener token CSRF
      const csrfResponse = await fetch('/api/auth/secure-csrf', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!csrfResponse.ok) {
        throw new Error('No se pudo obtener el token CSRF');
      }

      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      // Intentar login
      const response = await fetch('/api/auth/secure-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });

      const result: SecureAuthResult = await response.json();

      if (result.success && result.token) {
        // Almacenar token en localStorage para uso en otras solicitudes
        localStorage.setItem('auth_token', result.token);
        
        setState(prev => ({
          ...prev,
          user: result.user ? {
            userId: result.user.id,
            email: result.user.email,
            userAgent: '',
            ipAddress: '',
            sessionId: '',
            issuedAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            lastActivity: Date.now(),
            fingerprint: ''
          } : null,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: result.error || 'Error en el login'
        }));
      }

      return result;
    } catch {
      console.error('Error en login');
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Error de conexión'
      }));
      
      return {
        success: false,
        error: 'Error de conexión',
        code: 'NETWORK_ERROR'
      };
    }
  }, []);

  /**
   * Obtiene un token CSRF
   */
  const getCSRFToken = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch("/api/auth/secure-csrf", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.csrfToken;
      }
    } catch {
      console.error("Error al obtener CSRF token");
    }
    return "";
  }, []);

  /**
   * Cierra sesión de forma segura
   */
  const logout = useCallback(async (logoutAllDevices: boolean = false): Promise<{ success: boolean; message?: string }> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No hay token de autenticación");
      }

      const response = await fetch("/api/auth/secure-logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-CSRF-Token": await getCSRFToken(),
        },
        body: JSON.stringify({ logoutAllDevices }),
      });

      const result = await response.json();

      if (result.success) {
        // Limpiar token
        localStorage.removeItem("auth_token");
        
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.message || "Error al cerrar sesión"
        }));
      }

      return result;
    } catch {
      console.error("Error en logout");
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Error de conexión"
      }));
      
      return {
        success: false,
        message: "Error de conexión"
      };
    }
  }, [getCSRFToken]);

  /**
   * Refresca la sesión
   */
  const refreshSession = useCallback(async (): Promise<SecureAuthResult> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No hay token de autenticación");
      }

      const response = await fetch("/api/auth/secure-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-CSRF-Token": await getCSRFToken(),
        },
      });

      const result: SecureAuthResult = await response.json();

      if (result.success && result.token) {
        // Actualizar token
        localStorage.setItem("auth_token", result.token);
        
        setState(prev => ({
          ...prev,
          user: result.user ? {
            userId: result.user.id,
            email: result.user.email,
            userAgent: "",
            ipAddress: "",
            sessionId: "",
            issuedAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            lastActivity: Date.now(),
            fingerprint: ""
          } : null,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: result.error || "Error al refrescar sesión"
        }));
      }

      return result;
    } catch {
      console.error("Error en refresh de sesión");
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Error de conexión"
      }));
      
      return {
        success: false,
        error: "Error de conexión",
        code: "NETWORK_ERROR"
      };
    }
  }, [getCSRFToken]);

  /**
   * Limpia el error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Efecto para cargar la sesión al montar el componente
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Efecto para refrescar la sesión cada 15 minutos
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(() => {
        refreshSession();
      }, 15 * 60 * 1000); // 15 minutos

      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated, refreshSession]);

  return [
    state,
    {
      login,
      logout,
      refreshSession,
      clearError
    }
  ];
}

/**
 * Hook para verificar si el usuario está autenticado sin estado
 */
export function useIsAuthenticated(): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/secure-session', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  return isAuthenticated;
}

/**
 * Hook para obtener el usuario actual sin estado
 */
export function useCurrentUser(): SecureSessionData | null {
  const [user, setUser] = useState<SecureSessionData | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/secure-session', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.session);
        }
      } catch {
        console.error('Error al obtener usuario');
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  return user;
}