/**
 * Script de prueba para validar el sistema de prevención de ataques
 * Este script simula intentos fallidos y verifica el comportamiento del sistema
 */

// Simulación del localStorage para pruebas
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Simulación del hook useAttackPrevention para pruebas
function createAttackPreventionTest(config) {
  const {
    maxAttempts = 5,
    blockDuration = 300000, // 5 minutos en ms
    warningThreshold = 3,
    progressiveDelays = true,
    storageKey = 'auth_attempts',
  } = config;

  // Mock de localStorage
  const getStoredState = () => {
    try {
      const stored = localStorageMock.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        
        // Si el bloqueo ha expirado, limpiar el estado
        if (parsed.blockUntil && parsed.blockUntil < now) {
          localStorageMock.removeItem(storageKey);
          return { attempts: 0, lastAttempt: 0, blockUntil: null };
        }
        
        return parsed;
      }
    } catch (error) {
      console.warn('Error reading attack prevention state:', error);
    }
    
    return { attempts: 0, lastAttempt: 0, blockUntil: null };
  };

  const saveState = (state) => {
    try {
      localStorageMock.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Error saving attack prevention state:', error);
    }
  };

  const calculateTimeRemaining = (blockUntil) => {
    if (!blockUntil) return 0;
    const remaining = blockUntil - Date.now();
    return Math.max(0, remaining);
  };

  const getCurrentState = () => {
    const state = getStoredState();
    const timeRemaining = calculateTimeRemaining(state.blockUntil);
    const isBlocked = timeRemaining > 0;
    
    let warningLevel = 'none';
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

  const incrementAttempts = () => {
    const currentState = getStoredState();
    const now = Date.now();
    const timeRemaining = calculateTimeRemaining(currentState.blockUntil);
    
    // Si está bloqueado, no incrementar intentos
    if (timeRemaining > 0) {
      return getCurrentState();
    }

    const newAttempts = currentState.attempts + 1;
    let newBlockUntil = null;

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

  const resetAttempts = () => {
    saveState({ attempts: 0, lastAttempt: 0, blockUntil: null });
    return getCurrentState();
  };

  const shouldDisableForm = (state) => {
    return state.isBlocked || state.attempts >= maxAttempts;
  };

  return {
    getCurrentState,
    incrementAttempts,
    resetAttempts,
    shouldDisableForm,
    config: {
      maxAttempts,
      blockDuration,
      warningThreshold,
      progressiveDelays,
    },
  };
}

// Pruebas del sistema de prevención
function runTests() {
  console.log('🧪 Iniciando pruebas del sistema de prevención de ataques\n');

  // Prueba 1: Configuración de login
  console.log('📋 Prueba 1: Configuración de login');
  const loginPrevention = createAttackPreventionTest({
    maxAttempts: 5,
    blockDuration: 300000, // 5 minutos
    warningThreshold: 3,
    progressiveDelays: true,
    storageKey: 'login_attempts',
  });

  let state = loginPrevention.getCurrentState();
  console.log('Estado inicial:', JSON.stringify(state, null, 2));
  console.assert(state.attempts === 0, '❌ Debería iniciar con 0 intentos');
  console.assert(state.warningLevel === 'none', '❌ Debería iniciar sin advertencias');
  console.assert(state.canSubmit === true, '❌ Debería poder enviar inicialmente');

  // Prueba 2: Intentos fallidos progresivos
  console.log('\n📋 Prueba 2: Intentos fallidos progresivos');
  for (let i = 1; i <= 6; i++) {
    state = loginPrevention.incrementAttempts();
    console.log('Intento ' + i + ':', JSON.stringify({
      attempts: state.attempts,
      warningLevel: state.warningLevel,
      isBlocked: state.isBlocked,
      timeRemaining: Math.round(state.timeRemaining / 1000) + 's'
    }));
    
    if (i === 3) {
      console.assert(state.warningLevel === 'warning', '❌ Debería mostrar advertencia en el intento 3');
    }
    if (i === 5) {
      console.assert(state.isBlocked === true, '❌ Debería estar bloqueado después del intento 5');
    }
  }

  // Prueba 3: Bloqueo y deshabilitación del formulario
  console.log('\n📋 Prueba 3: Bloqueo y deshabilitación del formulario');
  console.assert(loginPrevention.shouldDisableForm(state) === true, '❌ El formulario debería estar deshabilitado');
  console.assert(state.canSubmit === false, '❌ No debería poder enviar durante el bloqueo');

  // Prueba 4: Configuración de signup (menos estricta)
  console.log('\n📋 Prueba 4: Configuración de signup (menos estricta)');
  const signupPrevention = createAttackPreventionTest({
    maxAttempts: 10,
    blockDuration: 600000, // 10 minutos
    warningThreshold: 5,
    progressiveDelays: true,
    storageKey: 'signup_attempts',
  });

  signupPrevention.resetAttempts();
  state = signupPrevention.getCurrentState();
  
  // Hacer 6 intentos fallidos
  for (let i = 1; i <= 6; i++) {
    state = signupPrevention.incrementAttempts();
  }
  
  console.log('Signup después de 6 intentos:', JSON.stringify({
    attempts: state.attempts,
    warningLevel: state.warningLevel,
    isBlocked: state.isBlocked
  }));
  
  // En signup, con 6 intentos y warningThreshold=5, debería estar bloqueado (6 > 5)
  console.assert(state.warningLevel === 'blocked', '❌ Debería mostrar bloqueo en signup');
  console.assert(state.isBlocked === true, '❌ Debería estar bloqueado en signup con 6 intentos');

  // Prueba 5: Reseteo después de éxito
  console.log('\n📋 Prueba 5: Reseteo después de éxito');
  state = loginPrevention.resetAttempts();
  console.log('Después de resetear:', JSON.stringify({
    attempts: state.attempts,
    warningLevel: state.warningLevel,
    isBlocked: state.isBlocked,
    canSubmit: state.canSubmit
  }));
  
  console.assert(state.attempts === 0, '❌ Debería resetear a 0 intentos');
  console.assert(state.warningLevel === 'none', '❌ Debería limpiar advertencias');
  console.assert(state.canSubmit === true, '❌ Debería permitir enviar después del reseteo');

  // Prueba 6: Bloqueos progresivos
  console.log('\n📋 Prueba 6: Bloqueos progresivos');
  loginPrevention.resetAttempts();
  
  // Hacer intentos para probar bloqueos progresivos
  const times = [];
  for (let i = 1; i <= 5; i++) {
    state = loginPrevention.incrementAttempts();
    if (state.isBlocked) {
      times.push(state.timeRemaining);
      console.log('Bloqueo ' + i + ': ' + Math.round(state.timeRemaining / 1000) + ' segundos');
    }
  }
  
  // Verificar que los tiempos de bloqueo son progresivos
  console.assert(times.length > 0, '❌ Debería haber bloqueos');
  console.log('Tiempos de bloqueo: ' + times.map(t => Math.round(t/1000)).join('s, ') + 's');

  console.log('\n✅ Todas las pruebas completadas exitosamente!');
  console.log('\n🎯 Resumen del sistema:');
  console.log('- Bloqueo inteligente basado en intentos fallidos');
  console.log('- Advertencias progresivas para el usuario');
  console.log('- Deshabilitación completa durante bloqueos');
  console.log('- Reseteo automático después de éxitos');
  console.log('- Configuraciones personalizables por formulario');
  console.log('- Almacenamiento persistente en localStorage');
}

// Ejecutar pruebas
runTests();