'use client';

import { useState, useEffect } from 'react';
import SessionManager from '@/components/SessionManager';
import { useSession } from '@/lib/session';

export default function DashboardPage() {
  const { session, isAuthenticated, logout } = useSession();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Función auxiliar para calcular minutos restantes sin llamadas impuras
  const getMinutesUntilExpiration = (expiresAt: number, currentTime: Date): number => {
    return Math.ceil((expiresAt - currentTime.getTime()) / (1000 * 60));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!isAuthenticated || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Redirigiendo al login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Session Manager */}
      <SessionManager onSessionExpired={() => logout()} />

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid-layout">
          {/* Welcome Card */}
          <div className="glass-card">
            <h1 className="text-3xl font-bold text-white mb-2">
              Bienvenido, {session.name}
            </h1>
            <p className="text-white/80 mb-4">
              Tu sesión está activa y segura. Estamos monitoreando tu actividad para proteger tu cuenta.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="session-stat">
                <p className="session-stat-label">ID de Sesión</p>
                <p className="session-stat-value">{session.sessionId}</p>
              </div>
              <div className="session-stat">
                <p className="session-stat-label">Correo</p>
                <p className="session-stat-value">{session.email}</p>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="glass-card">
            <h2 className="text-xl font-semibold text-white mb-4">Estadísticas</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Hora actual</span>
                <span className="text-white font-mono text-sm">
                  {currentTime.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Última actividad</span>
                <span className="text-white font-mono text-sm">
                  {new Date(session.lastActivity).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Expira en</span>
                <span className="text-white font-mono text-sm">
                  {getMinutesUntilExpiration(session.expiresAt, currentTime)} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 grid-layout">
          <div className="glass-card">
            <h3 className="text-white font-semibold mb-4">Acciones de Seguridad</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/profile'}
                className="action-btn"
              >
                Perfil de Usuario
              </button>
              <button
                onClick={() => window.location.href = '/security'}
                className="action-btn-blue"
              >
                Configuración de Seguridad
              </button>
              <button
                onClick={logout}
                className="action-btn-red"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* Security Tips */}
          <div className="glass-card">
            <h3 className="text-white font-semibold mb-4">Consejos de Seguridad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="security-tip">
                <strong>•</strong> No compartas tu sesión con nadie
              </div>
              <div className="security-tip">
                <strong>•</strong> Cierra sesión en dispositivos públicos
              </div>
              <div className="security-tip">
                <strong>•</strong> Cambia tu contraseña regularmente
              </div>
              <div className="security-tip">
                <strong>•</strong> Revisa tus sesiones activas periódicamente
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}