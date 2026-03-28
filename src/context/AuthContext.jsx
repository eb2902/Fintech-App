import { createContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, register as registerApi, logout as logoutApi, setLogoutFunction } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  const register = async (name, email, password) => {
    const data = await registerApi(name, email, password);
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  const logout = useCallback(async (revokeAllSessions = false) => {
    try {
      // Intentar hacer logout en el backend si hay token
      if (token) {
        await logoutApi(token, revokeAllSessions);
      }
    } catch (error) {
      // Si falla el logout en el backend, continuar con el logout local
      console.error('Error al hacer logout en el backend:', error);
    } finally {
      // Limpiar estado local independientemente del resultado del backend
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }, [token]);

  // Registrar la función de logout para que el servicio API pueda usarla
  useEffect(() => {
    setLogoutFunction(logout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

