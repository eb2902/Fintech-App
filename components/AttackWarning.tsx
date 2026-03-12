'use client';

import { useEffect, useState } from 'react';
import { AttackPreventionState } from '@/hooks/useAttackPrevention';

interface AttackWarningProps {
  preventionState: AttackPreventionState;
  onRetry?: () => void;
  className?: string;
}

export default function AttackWarning({ 
  preventionState, 
  onRetry, 
  className = '' 
}: AttackWarningProps) {
  const [timeRemaining, setTimeRemaining] = useState(preventionState.timeRemaining);

  // Actualizar el temporizador en tiempo real
  useEffect(() => {
    if (!preventionState.isBlocked) {
      return;
    }

    const updateTimer = () => {
      const remaining = preventionState.timeRemaining;
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // El bloqueo ha terminado, forzar actualización
        if (onRetry) {
          onRetry();
        }
      }
    };

    // Actualizar cada segundo
    const interval = setInterval(updateTimer, 1000);
    
    // Actualizar inmediatamente
    updateTimer();

    return () => clearInterval(interval);
  }, [preventionState.isBlocked, preventionState.timeRemaining, onRetry]);

  // Formatear tiempo restante
  const formatTime = (milliseconds: number): string => {
    if (milliseconds <= 0) return '00:00';
    
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Obtener el mensaje de advertencia
  const getWarningMessage = (): string => {
    if (preventionState.isBlocked) {
      const minutes = Math.ceil(timeRemaining / 60000);
      return `Demasiados intentos fallidos. Por favor, inténtalo de nuevo en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`;
    }
    
    if (preventionState.warningLevel === 'warning') {
      return `Cuidado: Has tenido ${preventionState.attempts} intentos fallidos. Después de 5 intentos, tu cuenta será bloqueada temporalmente.`;
    }
    
    return '';
  };

  // Obtener el tipo de advertencia para estilos
  const getWarningType = (): 'warning' | 'blocked' => {
    return preventionState.isBlocked ? 'blocked' : preventionState.warningLevel === 'warning' ? 'warning' : 'blocked';
  };

  // No mostrar nada si no hay advertencias
  if (preventionState.warningLevel === 'none' && !preventionState.isBlocked) {
    return null;
  }

  const warningType = getWarningType();
  const message = getWarningMessage();

  return (
    <div className={`mt-4 p-4 rounded-lg border transition-all duration-300 ${
      warningType === 'blocked' 
        ? 'bg-red-500/10 border-red-500/50 text-red-200' 
        : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-200'
    } ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 ${
          warningType === 'blocked' 
            ? 'bg-red-500/20 border border-red-500/50' 
            : 'bg-yellow-500/20 border border-yellow-500/50'
        }`}>
          <div className={`w-full h-full rounded-full ${
            warningType === 'blocked' ? 'bg-red-400' : 'bg-yellow-400'
          } animate-pulse`}></div>
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          
          {preventionState.isBlocked && (
            <div className="mt-3">
              {/* Barra de progreso del bloqueo */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-white/80">Tiempo restante</span>
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </div>
              
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    warningType === 'blocked' ? 'bg-red-400' : 'bg-yellow-400'
                  }`}
                  style={{ 
                    width: `${Math.max(0, (timeRemaining / (preventionState.blockUntil! - (preventionState.blockUntil! - timeRemaining))) * 100)}%` 
                  }}
                ></div>
              </div>
              
              <p className="text-xs text-white/70 mt-2">
                Durante este tiempo, el formulario permanecerá deshabilitado para proteger tu cuenta.
              </p>
            </div>
          )}
          
          {preventionState.warningLevel === 'warning' && (
            <div className="mt-2">
              <p className="text-xs text-white/70">
                Te recomendamos verificar tus credenciales antes de intentar nuevamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}