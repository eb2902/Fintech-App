# Sistema de Prevención Temprana Frontend

Este documento describe el sistema de prevención temprana implementado en el frontend para proteger contra ataques de fuerza bruta en los formularios de autenticación.

## Características Principales

### 🛡️ Bloqueo Inteligente
- **Límite de intentos configurables**: Bloquea el formulario después de N intentos fallidos
- **Bloqueos progresivos**: Aumenta el tiempo de bloqueo según el número de intentos
- **Reseteo automático**: Los intentos se reinician después de un login exitoso

### ⏱️ Retrasos Progresivos
- **Bloqueo inicial**: 30 segundos después de 3 intentos fallidos
- **Bloqueo moderado**: 1 minuto después de 4 intentos fallidos  
- **Bloqueo severo**: 1.5 minutos después de 5 intentos fallidos
- **Bloqueo total**: 15 minutos después de superar el límite máximo

### 📢 Comunicación Clara
- **Mensajes informativos**: Advierte al usuario sobre el estado del bloqueo
- **Contador regresivo**: Muestra el tiempo restante de bloqueo en tiempo real
- **Indicadores visuales**: Colores y estilos que comunican el nivel de advertencia

### 🤖 Prevención de Bots
- **Deshabilitación completa**: Bloquea el formulario durante períodos de bloqueo
- **Protección contra JavaScript**: Impide envíos automáticos durante bloqueos
- **Validación en tiempo real**: Verifica el estado de bloqueo antes de cada intento

## Configuración

### Configuraciones Predefinidas

El sistema incluye configuraciones optimizadas para diferentes escenarios:

```typescript
export const PREVENTION_CONFIGS = {
  // Configuración para login (más estricta)
  login: {
    maxAttempts: 5,           // Máximo 5 intentos fallidos
    blockDuration: 300000,    // 5 minutos de bloqueo base
    warningThreshold: 3,      // Advertencia después de 3 intentos
    progressiveDelays: true,  // Bloqueos progresivos
    storageKey: 'login_attempts',
  },
  
  // Configuración para signup (menos estricta, pero contra bots)
  signup: {
    maxAttempts: 10,          // Máximo 10 intentos fallidos
    blockDuration: 600000,    // 10 minutos de bloqueo base
    warningThreshold: 5,      // Advertencia después de 5 intentos
    progressiveDelays: true,  // Bloqueos progresivos
    storageKey: 'signup_attempts',
  },
  
  // Configuración para recuperación de contraseña (moderada)
  passwordReset: {
    maxAttempts: 3,           // Máximo 3 intentos fallidos
    blockDuration: 900000,    // 15 minutos de bloqueo base
    warningThreshold: 2,      // Advertencia después de 2 intentos
    progressiveDelays: true,  // Bloqueos progresivos
    storageKey: 'password_reset_attempts',
  },
}
```

### Personalización de Configuración

Puedes crear configuraciones personalizadas para adaptar el sistema a tus necesidades:

```typescript
const customConfig = {
  maxAttempts: 8,           // Personaliza el número máximo de intentos
  blockDuration: 180000,    // Personaliza la duración base del bloqueo (en ms)
  warningThreshold: 4,      // Personaliza el umbral de advertencia
  progressiveDelays: true,  // Habilita/deshabilita bloqueos progresivos
  storageKey: 'custom_attempts', // Clave personalizada para localStorage
};

const customPrevention = useAttackPrevention(customConfig);
```

## Componentes

### useAttackPrevention Hook

Hook principal que gestiona la lógica de prevención de ataques:

```typescript
import { useAttackPrevention } from '@/hooks/useAttackPrevention';

const attackPrevention = useAttackPrevention(config);

// Métodos disponibles:
const currentState = attackPrevention.getCurrentState();
attackPrevention.incrementAttempts();
attackPrevention.resetAttempts();
attackPrevention.forceUnlock();
```

**Estados de Prevención:**
- `isBlocked`: Booleano que indica si el formulario está bloqueado
- `attempts`: Número actual de intentos fallidos
- `blockUntil`: Timestamp del final del bloqueo
- `timeRemaining`: Tiempo restante de bloqueo en ms
- `canSubmit`: Booleano que indica si se puede enviar el formulario
- `warningLevel`: Nivel de advertencia ('none' | 'warning' | 'blocked')

### AttackWarning Component

Componente visual que muestra advertencias y el estado del bloqueo:

```typescript
import AttackWarning from '@/components/AttackWarning';

<AttackWarning 
  preventionState={attackPrevention.getCurrentState()}
  onRetry={() => {
    // Callback cuando termina el bloqueo
  }}
/>
```

**Características:**
- Mensajes de advertencia contextuales
- Contador regresivo en tiempo real
- Barra de progreso visual del bloqueo
- Estilos diferentes para advertencias y bloqueos

## Integración en Formularios

### Login Form

```typescript
// 1. Importar los componentes necesarios
import { useAttackPrevention, PREVENTION_CONFIGS } from '@/hooks/useAttackPrevention';
import AttackWarning from '@/components/AttackWarning';

// 2. Inicializar la prevención
const attackPrevention = useAttackPrevention(PREVENTION_CONFIGS.login);

// 3. Verificar bloqueo antes de enviar
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Verificar si el formulario está bloqueado
  const currentState = attackPrevention.getCurrentState();
  if (attackPrevention.shouldDisableForm(currentState)) {
    setError('Formulario temporalmente deshabilitado por seguridad');
    return;
  }
  
  try {
    // Intentar login...
    // Si falla:
    attackPrevention.incrementAttempts();
  } catch (error) {
    attackPrevention.incrementAttempts();
  }
};

// 4. Renderizar el componente de advertencia
<AttackWarning preventionState={attackPrevention.getCurrentState()} />

// 5. Deshabilitar botón durante bloqueos
<button disabled={attackPrevention.shouldDisableForm(attackPrevention.getCurrentState())}>
  Enviar
</button>
```

### Signup Form

El proceso es idéntico al login, usando la configuración de signup:

```typescript
const attackPrevention = useAttackPrevention(PREVENTION_CONFIGS.signup);
```

## Almacenamiento

### localStorage

El sistema utiliza localStorage para persistir el estado de los intentos entre sesiones:

- **Claves únicas**: Cada formulario tiene su propia clave de almacenamiento
- **Persistencia inteligente**: Los datos se limpian automáticamente después de bloqueos
- **Compatibilidad**: Funciona en todos los navegadores modernos

### Estructura de Almacenamiento

```javascript
{
  "attempts": 3,
  "lastAttempt": 1700000000000,
  "blockUntil": 1700000300000
}
```

## Seguridad

### Protección contra Manipulación

- **Validación de datos**: El sistema valida la integridad de los datos almacenados
- **Límites de tiempo**: Los bloqueos no pueden ser manipulados fácilmente
- **Reseteo automático**: Los intentos se reinician después de períodos de inactividad

### Compatibilidad con Backend

Este sistema frontend complementa las protecciones backend:

- **Doble capa de defensa**: Protección tanto en cliente como en servidor
- **Mensajes consistentes**: Comunicación clara entre frontend y backend
- **Experiencia de usuario**: Bloqueos frontend previenen solicitudes innecesarias al servidor

## Mejores Prácticas

### Para Desarrolladores

1. **Siempre verificar el estado**: Verifica `shouldDisableForm()` antes de enviar
2. **Incrementar intentos en errores**: Llama a `incrementAttempts()` para cualquier error de autenticación
3. **Resetear en éxitos**: Llama a `resetAttempts()` después de un login exitoso
4. **Mostrar advertencias**: Usa el componente `AttackWarning` para mejor UX

### Para Administradores

1. **Ajustar configuraciones**: Modifica los parámetros según el riesgo de tu aplicación
2. **Monitorizar intentos**: Considera registrar intentos fallidos en el backend
3. **Combinar con backend**: Usa este sistema junto con protecciones server-side
4. **Educación de usuarios**: Informa a los usuarios sobre las medidas de seguridad

## Consideraciones de Rendimiento

- **Bajo overhead**: El sistema tiene un impacto mínimo en el rendimiento
- **Almacenamiento ligero**: Solo almacena datos esenciales en localStorage
- **Actualizaciones eficientes**: El contador regresivo se actualiza solo cuando es necesario

## Compatibilidad

- **Navegadores modernos**: Chrome, Firefox, Safari, Edge
- **Next.js 16+**: Compatible con la versión actual del proyecto
- **TypeScript**: Totalmente tipado para mejor desarrollo

## Solución de Problemas

### Problemas Comunes

1. **localStorage no disponible**: El sistema maneja gracefully la falta de localStorage
2. **Bloqueos persistentes**: Usa `forceUnlock()` para desbloqueos manuales
3. **Contadores incorrectos**: Los datos se validan y limpian automáticamente

### Depuración

```typescript
// Para depurar, puedes inspeccionar el estado actual
console.log(attackPrevention.getCurrentState());

// Para forzar un desbloqueo (solo en desarrollo)
attackPrevention.forceUnlock();
```

## Futuras Mejoras

- **Integración con CAPTCHA**: Podría integrarse con servicios de CAPTCHA
- **Detección de patrones**: Análisis de patrones de ataque más sofisticados
- **Notificaciones push**: Alertas en tiempo real para intentos sospechosos
- **Integración con analytics**: Métricas de seguridad para análisis de seguridad