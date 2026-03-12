'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/session';
import { useCSRF } from '@/lib/csrf';

interface SessionManagerProps {
  onSessionExpired?: () => void;
}

export default function SessionManager({ onSessionExpired }: SessionManagerProps) {
  const { session, logout, logoutAll, refreshSession, checkSessionExpiration, isAuthenticated } = useSession();
  const { fetchWithToken } = useCSRF();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessions, setSessions] = useState<Array<{
    id: string;
    userAgent: string;
    ipAddress: string;
    isActive: boolean;
    lastActivity: Date;
    createdAt: Date;
    expiresAt: Date;
    isCurrent: boolean;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Obtener sesiones activas
  const fetchSessions = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const response = await fetchWithToken('/api/auth/sessions');
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cerrar sesión específica
  const closeSession = async (sessionId: string) => {
    try {
      const response = await fetchWithToken('/api/auth/sessions', {
        method: 'DELETE',
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        fetchSessions(); // Refrescar lista de sesiones
      }
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  // Monitorear expiración de sesión
  useEffect(() => {
    const checkExpiration = () => {
      if (session && !checkSessionExpiration()) {
        onSessionExpired?.();
      }
    };

    // Verificar cada 30 segundos
    const interval = setInterval(checkExpiration, 30000);
    return () => clearInterval(interval);
  }, [session, checkSessionExpiration, onSessionExpired]);

  // Renovar sesión automáticamente cuando esté próxima a expirar
  useEffect(() => {
    if (!session) return;

    const timeUntilExpiry = session.expiresAt - Date.now();
    const warningThreshold = 10 * 60 * 1000; // 10 minutos

    if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
      // Mostrar advertencia
      console.warn('La sesión está a punto de expirar');
      
      // Intentar renovar automáticamente
      refreshSession();
    }
  }, [session, refreshSession]);

  if (!isAuthenticated || !session) {
    return null;
  }

  return (
    <>
      {/* Componente de notificación de sesión */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <div>
              <p className="text-white text-sm font-medium">Sesión activa</p>
              <p className="text-white/70 text-xs">
                Última actividad: {new Date(session.lastActivity).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSessionModal(true)}
                className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors"
              >
                Sesiones
              </button>
              <button
                onClick={logout}
                className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-md transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de gestión de sesiones */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Sesiones activas</h3>
              <button
                onClick={() => setShowSessionModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {isLoading ? (
                <p className="text-white/70 text-sm">Cargando sesiones...</p>
              ) : sessions.length === 0 ? (
                <p className="text-white/70 text-sm">No hay sesiones activas</p>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`p-3 rounded-lg border ${
                      sess.isCurrent 
                        ? 'border-blue-400/50 bg-blue-500/10' 
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">
                          {sess.isCurrent ? 'Esta sesión' : 'Otra sesión'}
                        </p>
                        <p className="text-white/70 text-xs">{sess.userAgent}</p>
                        <p className="text-white/70 text-xs">IP: {sess.ipAddress}</p>
                      </div>
                      {!sess.isCurrent && (
                        <button
                          onClick={() => closeSession(sess.id)}
                          className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-md transition-colors"
                        >
                          Cerrar
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-white/60 text-xs">
                      Activa desde: {new Date(sess.lastActivity).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={logoutAll}
                className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-md transition-colors"
              >
                Cerrar todas las sesiones
              </button>
              <button
                onClick={fetchSessions}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors"
              >
                Refrescar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}