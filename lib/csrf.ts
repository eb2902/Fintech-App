/**
 * Hook personalizado para manejo de tokens CSRF en el cliente
 */

export interface CSRFToken {
  token: string;
  expires: number;
}

/**
 * Obtiene el token CSRF de las cookies
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '__Host-csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Genera un nuevo token CSRF solicitándolo al servidor
 */
export async function refreshCSRFToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to refresh CSRF token');
    }

    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);
    return null;
  }
}

/**
 * Configura una solicitud fetch con protección CSRF
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Obtener token actual
  let token = getCSRFToken();
  
  // Si no hay token, intentar obtener uno nuevo
  if (!token) {
    token = await refreshCSRFToken();
    if (!token) {
      throw new Error('No se pudo obtener un token CSRF válido');
    }
  }

  // Configurar headers con el token CSRF
  const headers = new Headers(options.headers || {});
  headers.set('X-CSRF-Token', token);
  headers.set('Content-Type', 'application/json');

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Importante para enviar cookies
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // Si el token está expirado o es inválido, intentar regenerarlo
    if (response.status === 403) {
      const errorData = await response.json().catch(() => null);
      if (errorData && errorData.code === 'CSRF_TOKEN_INVALID') {
        // Intentar regenerar el token
        const newToken = await refreshCSRFToken();
        if (newToken) {
          // Reintentar la solicitud con el nuevo token
          headers.set('X-CSRF-Token', newToken);
          return fetch(url, {
            ...fetchOptions,
            headers
          });
        }
      }
    }

    return response;
  } catch (error) {
    console.error('Error en solicitud con CSRF:', error);
    throw error;
  }
}

/**
 * Hook para usar en componentes React
 */
export function useCSRF() {
  const getToken = () => getCSRFToken();
  
  const fetchWithToken = async (url: string, options: RequestInit = {}) => {
    return fetchWithCSRF(url, options);
  };

  const refreshAndFetch = async (url: string, options: RequestInit = {}) => {
    // Forzar la renovación del token
    const newToken = await refreshCSRFToken();
    if (!newToken) {
      throw new Error('No se pudo renovar el token CSRF');
    }

    const headers = new Headers(options.headers || {});
    headers.set('X-CSRF-Token', newToken);
    headers.set('Content-Type', 'application/json');

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  };

  return {
    getToken,
    fetchWithToken,
    refreshAndFetch,
  };
}

/**
 * Función para incluir token CSRF en formularios
 */
export function getCSRFInputHTML(): string {
  const token = getCSRFToken();
  if (!token) return '';
  
  return `<input type="hidden" name="_csrf" value="${token}" />`;
}

/**
 * Agrega token CSRF a un FormData existente
 */
export function appendCSRFToken(formData: FormData): FormData {
  const token = getCSRFToken();
  if (token) {
    formData.append('_csrf', token);
  }
  return formData;
}