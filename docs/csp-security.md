# Configuración Content Security Policy (CSP)

## Visión General

FinWise implementa una política Content Security Policy (CSP) robusta para proteger contra ataques XSS (Cross-Site Scripting) y otros tipos de inyección de código malicioso.

## Configuración Actual

### Entorno de Desarrollo
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss: localhost:*; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

### Entorno de Producción
```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

## Directivas CSP Implementadas

### `default-src 'self'`
- **Propósito**: Política por defecto para recursos no especificados
- **Seguridad**: Solo permite recursos del mismo origen

### `script-src`
- **Desarrollo**: `'self' 'unsafe-inline' 'unsafe-eval'`
- **Producción**: `'self'`
- **Propósito**: Controla la ejecución de scripts
- **Seguridad**: En producción, solo permite scripts del mismo origen

### `style-src 'self' 'unsafe-inline'`
- **Propósito**: Controla hojas de estilos CSS
- **Seguridad**: Permite estilos inline para compatibilidad con Tailwind CSS

### `img-src 'self' data:`
- **Propósito**: Controla fuentes de imágenes
- **Seguridad**: Permite imágenes del mismo origen y datos embebidos

### `font-src 'self'`
- **Propósito**: Controla fuentes web
- **Seguridad**: Solo permite fuentes del mismo origen

### `connect-src`
- **Desarrollo**: `'self' ws: wss: localhost:*`
- **Producción**: `'self'`
- **Propósito**: Controla conexiones AJAX, WebSocket, etc.
- **Seguridad**: En desarrollo permite WebSocket para Hot Reload

### `frame-src`
- **Desarrollo**: `'self'`
- **Producción**: `'none'`
- **Propósito**: Controla embebidos de iframes
- **Seguridad**: En producción no permite iframes

### `object-src 'none'`
- **Propósito**: Controla plugins como Flash, Java, etc.
- **Seguridad**: Completamente deshabilitado para mayor seguridad

### `frame-ancestors 'none'`
- **Propósito**: Previene clickjacking
- **Seguridad**: No permite que la página sea embebida en iframes

### `upgrade-insecure-requests`
- **Propósito**: Fuerza HTTPS
- **Seguridad**: Convierte solicitudes HTTP a HTTPS automáticamente

## Implementación Técnica

### Archivos Clave

1. **`next.config.ts`**: Configuración principal de CSP
2. **`lib/csp.ts`**: Utilidades y validación CSP
3. **`lib/csp-middleware.ts`**: Middleware para Next.js
4. **`middleware/security.ts`**: Headers de seguridad adicionales

### Nonces para Scripts

En desarrollo, se implementa un sistema de nonces para mayor seguridad:

```typescript
// Generar nonce
const nonce = generateNonce();

// Aplicar a política CSP
const policyWithNonce = cspPolicy.replace(
  /script-src\s+([^;]+)/,
  `script-src 'self' 'nonce-${nonce}'`
);
```

## Validación CSP

### Validación Automática

```typescript
import { validateCSP } from '@/lib/csp';

const validation = validateCSP(policy);
if (!validation.isValid) {
  console.warn('Advertencias CSP:', validation.errors);
}
```

### Errores Comunes

1. **Directivas faltantes**: Verifica que todas las directivas obligatorias estén presentes
2. **Configuraciones inseguras**: Detecta uso de `'unsafe-eval'`, `*`, etc.
3. **Conflictos de directivas**: Identifica inconsistencias entre directivas

## Reportes de Violaciones

### Configuración de Reportes

```typescript
// En next.config.ts
{
  key: 'Content-Security-Policy',
  value: `${policy}; report-uri /api/csp-report`
}
```

### Endpoint de Reportes

```typescript
// app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json();
  console.warn('Violación CSP:', report);
  
  // En producción, enviar a servicio de monitoreo
  return NextResponse.json({ success: true });
}
```

## Mejores Prácticas

### 1. Desarrollo vs Producción

- **Desarrollo**: Permisivo para facilitar el desarrollo
- **Producción**: Restrictivo para máxima seguridad

### 2. Nonces Dinámicos

- Generar nonces únicos por solicitud
- Incluir nonces en scripts críticos
- Validar nonces en el servidor

### 3. Monitoreo Continuo

- Registrar violaciones CSP
- Analizar patrones de ataque
- Ajustar política según necesidades

### 4. Compatibilidad

- Verificar compatibilidad con navegadores
- Probar con extensiones de seguridad
- Validar con herramientas de auditoría

## Seguridad Adicional

### Headers de Seguridad Complementarios

```typescript
// X-Frame-Options: DENY
// X-Content-Type-Options: nosniff
// X-XSS-Protection: 1; mode=block
// Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Cookies Seguras

```typescript
// HttpOnly: Impide acceso desde JavaScript
// Secure: Solo en HTTPS
// SameSite=Strict: Previene CSRF
```

## Auditoría y Pruebas

### Herramientas Recomendadas

1. **CSP Evaluator** (Google)
2. **Security Headers** (securityheaders.com)
3. **OWASP ZAP**
4. **Burp Suite**

### Pruebas de Seguridad

```bash
# Verificar headers CSP
curl -I https://tu-dominio.com

# Probar violaciones CSP
# Intentar inyectar scripts en formularios
# Verificar reportes de violaciones
```

## Mantenimiento

### Revisiones Periódicas

- **Mensual**: Revisar reportes de violaciones
- **Trimestral**: Actualizar política según necesidades
- **Anual**: Auditoría de seguridad completa

### Actualizaciones

- Mantenerse actualizado con nuevas directivas CSP
- Probar compatibilidad con nuevos navegadores
- Ajustar política según cambios en la aplicación

## Conclusión

La implementación CSP en FinWise proporciona una capa robusta de protección contra ataques XSS y otras inyecciones de código. La combinación de políticas restrictivas en producción, validación automática, y monitoreo continuo asegura un alto nivel de seguridad para los usuarios de la aplicación.