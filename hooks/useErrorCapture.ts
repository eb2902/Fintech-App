'use client';

import { useEffect } from 'react';
import { logger, ErrorCategory } from '@/lib/logger';

interface ErrorCaptureOptions {
  enableGlobalErrors?: boolean;
  enableUnhandledRejections?: boolean;
  enablePerformanceErrors?: boolean;
  customErrorHandler?: (error: ErrorEvent | PromiseRejectionEvent) => void;
}

/**
 * Hook para capturar errores no controlados en el frontend
 */
export function useErrorCapture(options: ErrorCaptureOptions = {}) {
  const {
    enableGlobalErrors = true,
    enableUnhandledRejections = true,
    enablePerformanceErrors = true,
    customErrorHandler
  } = options;

  useEffect(() => {
    let globalErrorHandler: ((event: ErrorEvent) => void) | null = null;
    let unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
    let performanceErrorHandler: (() => void) | null = null;

    if (enableGlobalErrors) {
      globalErrorHandler = (event: ErrorEvent) => {
        // Evitar registrar errores duplicados si ya están siendo manejados por ErrorBoundary
        if (event.defaultPrevented) return;

        logger.error(
          ErrorCategory.UI,
          `Error JavaScript no controlado: ${event.message}`,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            errorType: event.error?.constructor?.name,
            url: window.location.href,
            userAgent: navigator.userAgent
          },
          event.error
        );

        // Llamar al handler personalizado si existe
        if (customErrorHandler) {
          customErrorHandler(event);
        }
      };

      window.addEventListener('error', globalErrorHandler);
    }

    if (enableUnhandledRejections) {
      unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        logger.error(
          ErrorCategory.UI,
          `Promesa rechazada no controlada: ${event.reason?.message || event.reason}`,
          {
            reason: event.reason,
            type: typeof event.reason,
            stack: event.reason?.stack,
            url: window.location.href
          }
        );

        // Llamar al handler personalizado si existe
        if (customErrorHandler) {
          customErrorHandler(event);
        }
      };

      window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    }

    if (enablePerformanceErrors) {
      performanceErrorHandler = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
          const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
          
          // Reportar tiempos de carga lentos
          if (loadTime > 5000) { // Más de 5 segundos
            logger.warn(
              ErrorCategory.PERFORMANCE,
              `Tiempo de carga lento detectado: ${loadTime}ms`,
              {
                loadTime,
                domContentLoaded,
                url: window.location.href,
                connection: (navigator as any).connection?.effectiveType || 'unknown'
              }
            );
          }

          // Reportar errores de red
          if (navigation.type === 'reload' && loadTime > 10000) {
            logger.warn(
              ErrorCategory.NETWORK,
              `Posible problema de red detectado durante recarga`,
              {
                loadTime,
                navigationType: navigation.type,
                url: window.location.href
              }
            );
          }
        }
      };

      // Escuchar eventos de performance
      window.addEventListener('load', performanceErrorHandler);
      window.addEventListener('pageshow', performanceErrorHandler);
    }

    // Cleanup
    return () => {
      if (globalErrorHandler) {
        window.removeEventListener('error', globalErrorHandler);
      }
      if (unhandledRejectionHandler) {
        window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      }
      if (performanceErrorHandler) {
        window.removeEventListener('load', performanceErrorHandler);
        window.removeEventListener('pageshow', performanceErrorHandler);
      }
    };
  }, [enableGlobalErrors, enableUnhandledRejections, enablePerformanceErrors, customErrorHandler]);
}

/**
 * Función para registrar errores manualmente desde cualquier parte de la aplicación
 */
export function captureError(
  category: ErrorCategory,
  message: string,
  details?: Record<string, unknown>,
  error?: Error
): void {
  logger.error(category, message, details, error);
}

/**
 * Función para registrar advertencias manualmente
 */
export function captureWarning(
  category: ErrorCategory,
  message: string,
  details?: Record<string, unknown>
): void {
  logger.warn(category, message, details);
}

/**
 * Función para registrar eventos informativos manualmente
 */
export function captureInfo(
  category: ErrorCategory,
  message: string,
  details?: Record<string, unknown>
): void {
  logger.info(category, message, details);
}

/**
 * Hook para registrar eventos de usuario importantes
 */
export function useUserEventLogger() {
  const logUserEvent = (event: string, details?: Record<string, unknown>) => {
    logger.info(
      ErrorCategory.BUSINESS,
      `Evento de usuario: ${event}`,
      {
        ...details,
        timestamp: Date.now(),
        url: window.location.href
      }
    );
  };

  return { logUserEvent };
}

/**
 * Hook para registrar eventos de seguridad
 */
export function useSecurityLogger() {
  const logSecurityEvent = (event: string, details?: Record<string, unknown>) => {
    logger.security(
      `Evento de seguridad: ${event}`,
      {
        ...details,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    );
  };

  return { logSecurityEvent };
}