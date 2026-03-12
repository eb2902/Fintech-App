/**
 * Middleware para Content Security Policy (CSP) en Next.js
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCSP, generateNonce, getCSPForEnvironment, CSPViolation } from './csp';

// Extensión de NextRequest para incluir el nonce CSP
interface NextRequestWithCSPNonce extends NextRequest {
  cspNonce: string;
}

/**
 * Middleware CSP para Next.js
 */
export function cspMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Generar nonce para scripts
  const nonce = generateNonce();
  
  // Obtener política CSP según el entorno
  const isDevelopment = process.env.NODE_ENV === 'development';
  let cspPolicy = getCSPForEnvironment(isDevelopment);
  
  // Añadir nonce a la política
  cspPolicy = cspPolicy.replace(
    /script-src\s+([^;]+)/,
    `script-src 'self' 'nonce-${nonce}'`
  );

  // Validar la política CSP
  const validation = validateCSP(cspPolicy);
  if (!validation.isValid) {
    console.warn('Política CSP con advertencias:', validation.errors);
  }

  // Aplicar header CSP
  response.headers.set('Content-Security-Policy', cspPolicy);
  
  // Adjuntar nonce al request para que las páginas lo puedan usar
  (request as NextRequestWithCSPNonce).cspNonce = nonce;

  return response;
}


/**
 * Validar CSP en tiempo de desarrollo
 */
export function validateCSPDevelopment() {
  if (process.env.NODE_ENV === 'development') {
    const csp = getCSPForEnvironment(true);
    const validation = validateCSP(csp);
    
    if (!validation.isValid) {
      console.warn('Advertencias CSP en desarrollo:', validation.errors);
    }
  }
}

/**
 * Reporte de violaciones CSP
 */
export function handleCSPViolation(request: NextRequest) {
  if (request.headers.get('content-type')?.includes('application/csp-report')) {
    return request.json().then((report: CSPViolation) => {
      console.warn('Violación CSP:', report);
      
      // En producción, enviar a servicio de monitoreo
      if (process.env.NODE_ENV === 'production') {
        // sendToMonitoringService(report);
      }
      
      return NextResponse.json({ success: true });
    });
  }
  
  return null;
}
