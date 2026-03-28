const API_URL = 'http://localhost:3001/api';

// Variable para almacenar la función de logout del contexto
let logoutFunction = null;

export const setLogoutFunction = (fn) => {
  logoutFunction = fn;
};

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al iniciar sesión');
  }

  return data;
};

export const register = async (name, email, password) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al registrarse');
  }

  return data;
};

export const refreshToken = async (refreshTokenValue) => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al refrescar token');
  }

  return data;
};

export const logout = async (token, revokeAllSessions = false) => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ revokeAllSessions }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al cerrar sesión');
  }

  return data;
};

export const getProfile = async (token) => {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // Si el error es 401, intentar refrescar el token
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error(data.error || 'Error al obtener perfil');
  }

  return data;
};

// Función helper para hacer peticiones autenticadas con refresh automático
export const authenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const refreshTokenValue = localStorage.getItem('refreshToken');

  if (!token) {
    throw new Error('No hay token de acceso');
  }

  // Agregar header de autorización
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  let response = await fetch(url, { ...options, headers });

  // Si el token expiró (401), intentar refrescar
  if (response.status === 401 && refreshTokenValue) {
    try {
      const refreshData = await refreshToken(refreshTokenValue);
      
      // Actualizar tokens en localStorage
      localStorage.setItem('token', refreshData.token);
      localStorage.setItem('refreshToken', refreshData.refreshToken);

      // Reintentar la petición original con el nuevo token
      headers['Authorization'] = `Bearer ${refreshData.token}`;
      response = await fetch(url, { ...options, headers });
    } catch {
      // Si el refresh falla, hacer logout
      if (logoutFunction) {
        logoutFunction();
      }
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
  }

  return response;
};
