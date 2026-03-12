/**
 * Hook para prevenir ataques de fuerza bruta en formularios de autenticación
 */

export interface AttackPreventionState {
  isBlocked: boolean;
  attempts: number;
  blockUntil: number | null;
  timeRemaining: number;
  canSubmit: boolean;
  warningLevel: 'none' | 'warning' | 'blocked';
}

export interface UseAttackPreventionOptions {
  maxAttempts?: number;
  blockDuration?: number;
  warningThreshold?: number;
  progressiveDelays?: boolean;
  storageKey?: string;
}

export function useAttackPrevention(options: UseAttackPreventionOptions = {}) {
  const {
    maxAttempts = 5,
    blockDuration = 300000, // 5 minutos en ms
    warningThreshold = 3,
    progressiveDelays = true,
    storageKey = 'auth_attempts',
  } = options;

  // Verificar si estamos en un entorno del cliente con localStorage disponible
  const isClient = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  // Obtener estado actual del localStorage (solo en cliente)
  const getStoredState = (): { attempts: number; lastAttempt: number; blockUntil: number | null } => {
    // Si no estamos en el cliente, retornar estado predeterminado
    if (!isClient) {
      return { attempts: 0, lastAttempt: 0, blockUntil: null };
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        
        // Si el bloqueo ha expirado, limpiar el estado
        if (parsed.blockUntil && parsed.blockUntil < now) {
          localStorage.removeItem(storageKey);
          return { attempts: 0, lastAttempt: 0, blockUntil: null };
        }
        
        return parsed;
      }
    } catch (error) {
      console.warn('Error reading attack prevention state:', error);
    }
    
    return { attempts: 0, lastAttempt: 0, blockUntil: null };
  };

  // Guardar estado en localStorage (solo en cliente)
  const saveState = (state: { attempts: number; lastAttempt: number; blockUntil: number | null }) => {
    // Si no estamos en el cliente, no hacer nada
    if (!isClient) {
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Error saving attack prevention state:', error);
    }
  };

    // Calcular el tiempo restante de bloqueo
  const calculateTimeRemaining = (blockUntil: number | null): number => {
    if (!blockUntil) return 0;
    const remaining = blockUntil - Date.now();
    return Math.max(0, remaining);
  };

  // Obtener el estado actual de prevención
  const getCurrentState = (): AttackPreventionState => {
    const state = getStoredState();
    const timeRemaining = calculateTimeRemaining(state.blockUntil);
    const isBlocked = timeRemaining > 0;
    
    let warningLevel: 'none' | 'warning' | 'blocked' = 'none';
    if (isBlocked) {
      warningLevel = 'blocked';
    } else if (state.attempts >= warningThreshold && state.attempts < maxAttempts) {
      warningLevel = 'warning';
    }

    return {
      isBlocked,
      attempts: state.attempts,
      blockUntil: state.blockUntil,
      timeRemaining,
      canSubmit: !isBlocked,
      warningLevel,
    };
  };

  // Incrementar intentos fallidos
  const incrementAttempts = (): AttackPreventionState => {
    const currentState = getStoredState();
    const now = Date.now();
    const timeRemaining = calculateTimeRemaining(currentState.blockUntil);
    
    // Si está bloqueado, no incrementar intentos
    if (timeRemaining > 0) {
      return getCurrentState();
    }

    const newAttempts = currentState.attempts + 1;
    let newBlockUntil: number | null = null;

    // Calcular bloqueo progresivo
    if (progressiveDelays) {
      if (newAttempts >= maxAttempts) {
        // Bloqueo total por superar el límite máximo
        newBlockUntil = now + (blockDuration * 3); // 15 minutos
      } else if (newAttempts > warningThreshold) {
        // Bloqueos progresivos (solo después de superar el umbral de advertencia)
        const delayMultiplier = newAttempts - warningThreshold;
        newBlockUntil = now + (blockDuration * delayMultiplier * 0.1); // 30s, 60s, 90s...
      }
      // Nota: No hay bloqueo en el warningThreshold exacto, solo advertencia
    } else {
      // Bloqueo simple después de maxAttempts
      if (newAttempts >= maxAttempts) {
        newBlockUntil = now + blockDuration;
      }
    }

    const newState = {
      attempts: newAttempts,
      lastAttempt: now,
      blockUntil: newBlockUntil,
    };

    saveState(newState);
    return getCurrentState();
  };

  // Resetear intentos (cuando el login es exitoso)
  const resetAttempts = (): AttackPreventionState => {
    saveState({ attempts: 0, lastAttempt: 0, blockUntil: null });
    return getCurrentState();
  };

  // Forzar desbloqueo (para pruebas o administración)
  const forceUnlock = (): AttackPreventionState => {
    saveState({ attempts: 0, lastAttempt: 0, blockUntil: null });
    return getCurrentState();
  };

  // Obtener mensaje de advertencia
  const getWarningMessage = (state: AttackPreventionState): string => {
    if (state.isBlocked) {
      const minutes = Math.ceil(state.timeRemaining / 60000);
      return `Demasiados intentos fallidos. Por favor, inténtalo de nuevo en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`;
    }
    
    if (state.warningLevel === 'warning') {
      return `Cuidado: Has tenido ${state.attempts} intentos fallidos. Después de ${maxAttempts} intentos, tu cuenta será bloqueada temporalmente.`;
    }
    
    return '';
  };

  // Obtener nivel de progresión del bloqueo
  const getBlockProgress = (state: AttackPreventionState): number => {
    if (!state.isBlocked || !state.blockUntil) return 0;
    
    const totalBlockTime = state.blockUntil - (state.blockUntil - state.timeRemaining);
    const elapsed = totalBlockTime - state.timeRemaining;
    
    return Math.min(100, (elapsed / totalBlockTime) * 100);
  };

  // Verificar si el formulario debe estar deshabilitado
  const shouldDisableForm = (state: AttackPreventionState): boolean => {
    return state.isBlocked || state.attempts >= maxAttempts;
  };

  return {
    getCurrentState,
    incrementAttempts,
    resetAttempts,
    forceUnlock,
    getWarningMessage,
    getBlockProgress,
    shouldDisableForm,
    // Valores constantes para configuración
    config: {
      maxAttempts,
      blockDuration,
      warningThreshold,
      progressiveDelays,
    },
  };
}

// Configuración predeterminada para diferentes escenarios
export const PREVENTION_CONFIGS = {
  // Configuración para login (más estricta)
  login: {
    maxAttempts: 5,
    blockDuration: 300000, // 5 minutos
    warningThreshold: 3,
    progressiveDelays: true,
    storageKey: 'login_attempts',
  },
  
  // Configuración para signup (menos estricta, pero contra bots)
  signup: {
    maxAttempts: 10,
    blockDuration: 600000, // 10 minutos
    warningThreshold: 5,
    progressiveDelays: true,
    storageKey: 'signup_attempts',
  },
  
  // Configuración para recuperación de contraseña (moderada)
  passwordReset: {
    maxAttempts: 3,
    blockDuration: 900000, // 15 minutos
    warningThreshold: 2,
    progressiveDelays: true,
    storageKey: 'password_reset_attempts',
  },
} as const;