'use client';

import React, { useEffect } from 'react';
import { useErrorCapture } from '@/hooks/useErrorCapture';
import { logger, ErrorCategory } from '@/lib/logger';
import { useUserEventLogger, useSecurityLogger } from '@/hooks/useErrorCapture';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoggingExample from '@/components/LoggingExample';

export default function LoggingTestPage() {
  const { logUserEvent } = useUserEventLogger();
  const { logSecurityEvent } = useSecurityLogger();

  // Inicializar captura de errores globales
  useErrorCapture({
    enableGlobalErrors: true,
    enableUnhandledRejections: true,
    enablePerformanceErrors: true
  });

  useEffect(() => {
    // Registrar visita a la página de pruebas
    logUserEvent('visita_pagina_pruebas_logging', {
      page: 'logging-test',
      timestamp: Date.now()
    });

    // Simular un error de red para pruebas
    setTimeout(() => {
      logger.network(
        'Conexión de prueba al servidor',
        {
          endpoint: '/api/test',
          method: 'GET',
          status: 'success'
        }
      );
    }, 1000);

    // Simular un evento de seguridad para pruebas
    setTimeout(() => {
      logSecurityEvent('Acceso a página de pruebas de logging', {
        page: 'logging-test',
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      });
    }, 2000);

  }, [logUserEvent, logSecurityEvent]);

  // Función para generar un error controlado
  const triggerControlledError = () => {
    try {
      throw new Error('Error controlado para pruebas del ErrorBoundary');
    } catch (error) {
      logger.error(
        ErrorCategory.UI,
        'Error controlado en página de pruebas',
        {
          page: 'logging-test',
          action: 'triggerControlledError'
        },
        error as Error
      );
    }
  };

  // Función para generar un error no controlado
  const triggerUnhandledError = () => {
    // Esto generará un error no controlado que será capturado por el ErrorBoundary
    throw new Error('Error no controlado para pruebas del ErrorBoundary');
  };

  // Función para generar una promesa rechazada no controlada
  const triggerUnhandledRejection = () => {
    Promise.reject(new Error('Promesa rechazada no controlada para pruebas'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Sistema de Logging - Pruebas</h1>
              <p className="text-white/70 mt-1">Prueba y valida el sistema de logging centralizado</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => logger.flush()}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors"
              >
                Enviar Logs
              </button>
              <button
                onClick={() => logger.clearBuffer()}
                className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-200 rounded-lg transition-colors"
              >
                Limpiar Buffer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Sección de pruebas de ErrorBoundary */}
        <ErrorBoundary
          onError={(error, errorInfo) => {
            logger.error(
              ErrorCategory.UI,
              'Error capturado por ErrorBoundary',
              {
                page: 'logging-test',
                componentStack: errorInfo.componentStack
              },
              error
            );
          }}
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h2 className="text-white text-xl font-semibold mb-4">Pruebas de ErrorBoundary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={triggerControlledError}
                className="p-4 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg transition-colors"
              >
                Error Controlado
              </button>
              
              <button
                onClick={triggerUnhandledError}
                className="p-4 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
              >
                Error No Controlado
              </button>
              
              <button
                onClick={triggerUnhandledRejection}
                className="p-4 bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 rounded-lg transition-colors"
              >
                Promesa Rechazada
              </button>
            </div>
            <p className="text-white/70 text-sm mt-4">
              Los errores no controlados serán capturados automáticamente por el ErrorBoundary y registrados en el logger.
            </p>
          </div>
        </ErrorBoundary>

        {/* Sección de captura de errores */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h2 className="text-white text-xl font-semibold mb-4">Captura de Errores Globales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-white font-medium mb-2">Errores JavaScript</h3>
              <p className="text-white/70 text-sm mb-4">
                Los errores no controlados de JavaScript serán capturados automáticamente.
              </p>
              <button
                onClick={() => {
                  // Generar un error intencional
                  const element = document.getElementById('non-existent-element');
                  element!.click(); // Esto generará un error
                }}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 rounded-lg transition-colors"
              >
                Generar Error JS
              </button>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-2">Errores de Red</h3>
              <p className="text-white/70 text-sm mb-4">
                Los errores de red serán detectados y registrados automáticamente.
              </p>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/non-existent-endpoint');
                  } catch (error) {
                    logger.network('Error de red en endpoint inexistente', {}, error as Error);
                  }
                }}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors"
              >
                Probar Error Red
              </button>
            </div>
          </div>
        </div>

        {/* Sección de ejemplo interactivo */}
        <LoggingExample />

        {/* Información del sistema */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h2 className="text-white text-xl font-semibold mb-4">Estado del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-black/20 p-4 rounded-lg">
              <h3 className="text-white font-medium">Buffer de Logs</h3>
              <p className="text-white/70 text-sm mt-1">
                {logger.getBuffer().length} logs en buffer
              </p>
            </div>
            
            <div className="bg-black/20 p-4 rounded-lg">
              <h3 className="text-white font-medium">Consola</h3>
              <p className="text-white/70 text-sm mt-1">
                Habilitada para desarrollo
              </p>
            </div>
            
            <div className="bg-black/20 p-4 rounded-lg">
              <h3 className="text-white font-medium">Envío Remoto</h3>
              <p className="text-white/70 text-sm mt-1">
                Activado cada 5 segundos
              </p>
            </div>
            
            <div className="bg-black/20 p-4 rounded-lg">
              <h3 className="text-white font-medium">Categorías</h3>
              <p className="text-white/70 text-sm mt-1">
                7 categorías configuradas
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-black/20 rounded-lg">
            <h4 className="text-white font-medium mb-2">Instrucciones:</h4>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• Abre la consola del navegador para ver los logs en tiempo real</li>
              <li>• Los logs se envían automáticamente al servidor cada 5 segundos</li>
              <li>• Los errores críticos se registran inmediatamente</li>
              <li>• Los eventos de seguridad tienen prioridad alta</li>
              <li>• Los logs se agrupan por fingerprint para análisis de patrones</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}