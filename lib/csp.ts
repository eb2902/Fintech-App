/**
 * Content Security Policy (CSP) utilities and validation
 */

export interface CSPConfig {
  development: string;
  production: string;
}

export interface CSPViolation {
  blockedURI: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
}

/**
 * Configuración CSP para diferentes entornos
 */
export const CSP_CONFIG: CSPConfig = {
  development: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' ws: wss: localhost:*",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),

  production: [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
};

/**
 * Valida una política CSP
 */
export function validateCSP(policy: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Verificar directivas obligatorias
  const requiredDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];
  for (const directive of requiredDirectives) {
    if (!policy.includes(directive)) {
      errors.push(`Directiva obligatoria faltante: ${directive}`);
    }
  }

  // Verificar configuraciones inseguras
  const unsafePatterns = [
    { pattern: /script-src.*'unsafe-eval'/, message: "'unsafe-eval' en script-src es inseguro" },
    { pattern: /script-src.*\*/, message: "script-src con '*' es inseguro" },
    { pattern: /connect-src.*\*/, message: "connect-src con '*' es inseguro" },
    { pattern: /frame-src.*\*/, message: "frame-src con '*' es inseguro" },
    { pattern: /object-src.*[^'none']/, message: "object-src debe ser 'none' para mayor seguridad" }
  ];

  for (const { pattern, message } of unsafePatterns) {
    if (pattern.test(policy)) {
      errors.push(message);
    }
  }

  // Verificar consistencia entre directivas
  if (policy.includes("script-src 'none'") && policy.includes("default-src 'self'")) {
    errors.push("Conflicto: script-src es 'none' pero default-src permite 'self'");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Genera un nonce para scripts
 */
export function generateNonce(): string {
  return crypto.randomUUID();
}

/**
 * Crea una política CSP con nonces para scripts
 */
export function createCSPWithNonces(nonce: string, isDevelopment: boolean = false): string {
  const basePolicy = isDevelopment ? CSP_CONFIG.development : CSP_CONFIG.production;
  
  // Reemplazar script-src para incluir el nonce
  const nonceScriptSrc = `'nonce-${nonce}'`;
  const policyWithNonce = basePolicy.replace(
    /script-src\s+([^;]+)/,
    `script-src 'self' ${nonceScriptSrc}`
  );

  return policyWithNonce;
}

/**
 * Procesa reportes de violaciones CSP
 */
export function processCSPViolation(violation: CSPViolation): void {
  console.warn('Violación CSP detectada:', {
    blockedURI: violation.blockedURI,
    violatedDirective: violation.violatedDirective,
    effectiveDirective: violation.effectiveDirective,
    sourceFile: violation.sourceFile,
    lineNumber: violation.lineNumber,
    columnNumber: violation.columnNumber
  });

  // En producción, podrías enviar estos reportes a un servicio de monitoreo
  if (process.env.NODE_ENV === 'production') {
    // sendToMonitoringService(violation);
  }
}

/**
 * Middleware para validar CSP en solicitudes
 */
export function validateCSPHeaders(request: Request): Response | null {
  const cspHeader = request.headers.get('content-security-policy');
  
  if (cspHeader) {
    const validation = validateCSP(cspHeader);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          error: 'Política CSP inválida',
          violations: validation.errors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  return null;
}

/**
 * Obtiene la política CSP según el entorno
 */
export function getCSPForEnvironment(isDevelopment: boolean = process.env.NODE_ENV === 'development'): string {
  return isDevelopment ? CSP_CONFIG.development : CSP_CONFIG.production;
}

/**
 * Verifica si una URL está permitida por la política CSP
 */
export function isURIPermitted(uri: string, cspPolicy: string): boolean {
  // Extraer las directivas de la política
  const directives = cspPolicy.split(';').map(d => d.trim());
  
  // Buscar directivas que puedan permitir esta URI
  const allowedSources = new Set<string>();
  
  for (const directive of directives) {
    const [name, ...sources] = directive.split(/\s+/);
    
    if (['default-src', 'script-src', 'style-src', 'img-src', 'connect-src', 'font-src'].includes(name)) {
      sources.forEach(source => allowedSources.add(source));
    }
  }

  // Verificar si la URI está permitida
  if (allowedSources.has("'self'") && uri.startsWith(window.location.origin)) {
    return true;
  }
  
  if (allowedSources.has("'unsafe-inline'") && uri.startsWith('data:')) {
    return true;
  }

  for (const source of allowedSources) {
    if (source.startsWith('http') && uri.startsWith(source)) {
      return true;
    }
  }

  return false;
}