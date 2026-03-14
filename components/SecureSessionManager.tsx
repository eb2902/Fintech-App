import React, { useState } from 'react';
import { useSecureSession, useIsAuthenticated, useCurrentUser } from '@/hooks/useSecureSession';
import { SecureSessionData } from '@/lib/secure-session';

interface SecureSessionManagerProps {
  children: React.ReactNode;
}

/**
 * Componente de gestión de sesiones seguras
 * Maneja la autenticación, validación y protección de sesiones
 */
export function SecureSessionManager({ children }: SecureSessionManagerProps): React.ReactElement {
  const [sessionState, sessionActions] = useSecureSession();
  const isAuthenticated = useIsAuthenticated();
  const currentUser = useCurrentUser();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Determinar si se debe mostrar el modal de login basado en el estado actual
  const shouldShowLoginModal = (!isAuthenticated && sessionState.isAuthenticated) || 
                               (sessionState.error && sessionState.isAuthenticated);

  const handleLogin = async (email: string, password: string) => {
    const result = await sessionActions.login(email, password);
    if (result.success) {
      // El modal se cierra automáticamente al cambiar el estado de autenticación
    }
  };

  const handleLogout = async (logoutAllDevices: boolean = false) => {
    const result = await sessionActions.logout(logoutAllDevices);
    if (result.success) {
      setShowLogoutModal(false);
    }
  };

  const handleRefreshSession = async () => {
    await sessionActions.refreshSession();
  };

  if (sessionState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      {children}
      
      {/* Modal de Login */}
      {shouldShowLoginModal && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => {}}
          error={sessionState.error}
          isLoading={sessionState.isLoading}
        />
      )}

      {/* Modal de Logout */}
      {showLogoutModal && (
        <LogoutModal
          onLogout={handleLogout}
          onClose={() => setShowLogoutModal(false)}
          isLoading={sessionState.isLoading}
        />
      )}

      {/* Barra de estado de sesión */}
      {sessionState.isAuthenticated && (
        <SessionStatusBar
          user={currentUser}
          onLogout={() => setShowLogoutModal(true)}
          onRefresh={handleRefreshSession}
        />
      )}
    </>
  );
}

/**
 * Modal de Login Seguro
 */
interface LoginModalProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onClose: () => void;
  error?: string | null;
  isLoading: boolean;
}

function LoginModal({ onLogin, onClose, error, isLoading }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return;
    }
    await onLogin(email, password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión Segura</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@ejemplo.com"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isLoading}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Recordar sesión</span>
            </label>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Iniciando..." : "Iniciar Sesión"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>🔒 Esta sesión está protegida con encriptación avanzada</p>
          <p>🛡️ Se requiere verificación CSRF para mayor seguridad</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de Logout Seguro
 */
interface LogoutModalProps {
  onLogout: (logoutAllDevices: boolean) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function LogoutModal({ onLogout, onClose, isLoading }: LogoutModalProps) {
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogout(logoutAllDevices);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Cerrar Sesión</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              ¿Estás seguro de que deseas cerrar sesión?
            </p>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={logoutAllDevices}
              onChange={(e) => setLogoutAllDevices(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">
              Cerrar sesión en todos los dispositivos
            </span>
          </label>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Cerrando..." : "Cerrar Sesión"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>🔒 Tu sesión será cerrada de forma segura</p>
          <p>🛡️ Se eliminarán todas las cookies de autenticación</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Barra de Estado de Sesión
 */
interface SessionStatusBarProps {
  user: SecureSessionData | null;
  onLogout: () => void;
  onRefresh: () => void;
}

function SessionStatusBar({ user, onLogout, onRefresh }: SessionStatusBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-2 z-40">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Sesión Activa</span>
          </div>
          {user && (
            <div className="text-sm">
              Bienvenido, {user.email}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
          >
            Refrescar
          </button>
          <button
            onClick={onLogout}
            className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}