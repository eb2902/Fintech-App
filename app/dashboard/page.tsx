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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <div className="md:col-span-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Bienvenido, {session.name}
            </h1>
            <p className="text-white/80 mb-4">
              Tu sesión está activa y segura. Estamos monitoreando tu actividad para proteger tu cuenta.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-sm">ID de Sesión</p>
                <p className="text-white font-mono text-sm mt-1">{session.sessionId}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-sm">Correo</p>
                <p className="text-white text-sm mt-1">{session.email}</p>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Acciones de Seguridad</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/profile'}
                className="w-full px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                Perfil de Usuario
              </button>
              <button
                onClick={() => window.location.href = '/security'}
                className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors"
              >
                Configuración de Seguridad
              </button>
              <button
                onClick={logout}
                className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* Security Tips */}
          <div className="md:col-span-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Consejos de Seguridad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="text-white/80">
                <strong>•</strong> No compartas tu sesión con nadie
              </div>
              <div className="text-white/80">
                <strong>•</strong> Cierra sesión en dispositivos públicos
              </div>
              <div className="text-white/80">
                <strong>•</strong> Cambia tu contraseña regularmente
              </div>
              <div className="text-white/80">
                <strong>•</strong> Revisa tus sesiones activas periódicamente
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}