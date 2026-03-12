'use client';

import React, { useState } from 'react';
import { logger, ErrorCategory } from '@/lib/logger';
import { 
  captureError, 
  useUserEventLogger,
  useSecurityLogger 
} from '@/hooks/useErrorCapture';

export default function LoggingExample() {
  const [logs, setLogs] = useState<string[]>([]);
  const { logUserEvent } = useUserEventLogger();
  const { logSecurityEvent } = useSecurityLogger();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Ejemplos de logging de diferentes tipos de errores
  const handleTestError = () => {
    try {
      throw new Error('Este es un error de prueba para el sistema de logging');
    } catch {
      logger.error(
        ErrorCategory.UI,
        'Error de prueba capturado',
        {
          component: 'LoggingExample',
          action: 'handleTestError',
          userId: 'test_user_123'
        },
        new Error('Error de prueba')
      );
      addLog('Error registrado en el logger');
    }
  };

  const handleTestWarning = () => {
    logger.warn(
      ErrorCategory.PERFORMANCE,
      'Advertencia de rendimiento detectada',
      {
        component: 'LoggingExample',
        metric: 'load_time',
        value: 5000,
        threshold: 3000
      }
    );
    addLog('Advertencia registrada');
  };

  const handleTestInfo = () => {
    logger.info(
      ErrorCategory.BUSINESS,
      'Evento de usuario registrado',
      {
        action: 'button_click',
        component: 'LoggingExample',
        timestamp: Date.now()
      }
    );
    addLog('Evento informativo registrado');
  };

  const handleTestAuthError = () => {
    logger.auth(
      'Intento de acceso no autorizado detectado',
      {
        attemptedAction: 'access_protected_resource',
        ip: '192.168.1.100',
        userAgent: navigator.userAgent
      }
    );
    addLog('Error de autenticación registrado');
  };

  const handleTestNetworkError = () => {
    logger.network(
      'Error de red al intentar conectar con el servidor',
      {
        url: '/api/data',
        method: 'GET',
        timeout: 5000
      },
      new Error('Network timeout')
    );
    addLog('Error de red registrado');
  };

  const handleTestValidationError = () => {
    logger.validation(
      'Validación de formulario fallida',
      {
        field: 'email',
        value: 'invalid-email',
        rule: 'email_format'
      }
    );
    addLog('Error de validación registrado');
  };

  const handleTestSecurityEvent = () => {
    logSecurityEvent('Intento de inyección SQL detectado', {
      payload: "'; DROP TABLE users; --",
      source: 'user_input',
      sanitized: true
    });
    addLog('Evento de seguridad registrado');
  };

  const handleTestUserEvent = () => {
    logUserEvent('Navegación a dashboard', {
      from: 'login',
      to: 'dashboard',
      duration: 2500
    });
    addLog('Evento de usuario registrado');
  };

  const handleManualCapture = () => {
    captureError(
      ErrorCategory.UI,
      'Error capturado manualmente desde función externa',
      { context: 'external_function' },
      new Error('Manual error capture')
    );
    addLog('Error capturado manualmente');
  };

  const handleFlushLogs = async () => {
    try {
      await logger.flush();
      addLog('Logs enviados al servidor exitosamente');
    } catch {
      addLog('Error al enviar logs al servidor');
    }
  };

  const handleClearLogs = () => {
    logger.clearBuffer();
    setLogs([]);
    addLog('Buffer de logs limpiado');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h2 className="text-white text-xl font-semibold mb-4">Sistema de Logging - Ejemplos de Uso</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={handleTestError}
            className="p-4 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
          >
            Registrar Error
          </button>
          
          <button
            onClick={handleTestWarning}
            className="p-4 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 rounded-lg transition-colors"
          >
            Registrar Advertencia
          </button>
          
          <button
            onClick={handleTestInfo}
            className="p-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors"
          >
            Registrar Info
          </button>
          
          <button
            onClick={handleTestAuthError}
            className="p-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg transition-colors"
          >
            Error de Autenticación
          </button>
          
          <button
            onClick={handleTestNetworkError}
            className="p-4 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg transition-colors"
          >
            Error de Red
          </button>
          
          <button
            onClick={handleTestValidationError}
            className="p-4 bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 rounded-lg transition-colors"
          >
            Error de Validación
          </button>
          
          <button
            onClick={handleTestSecurityEvent}
            className="p-4 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors"
          >
            Evento de Seguridad
          </button>
          
          <button
            onClick={handleTestUserEvent}
            className="p-4 bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 rounded-lg transition-colors"
          >
            Evento de Usuario
          </button>
          
          <button
            onClick={handleManualCapture}
            className="p-4 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 rounded-lg transition-colors"
          >
            Captura Manual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-white text-lg font-semibold mb-4">Acciones de Logger</h3>
          <div className="space-y-3">
            <button
              onClick={handleFlushLogs}
              className="w-full p-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors"
            >
              Enviar Logs al Servidor
            </button>
            
            <button
              onClick={handleClearLogs}
              className="w-full p-3 bg-gray-500/20 hover:bg-gray-500/30 text-gray-200 rounded-lg transition-colors"
            >
              Limpiar Buffer de Logs
            </button>
            
            <div className="mt-4 p-4 bg-black/20 rounded-lg">
              <h4 className="text-white font-medium mb-2">Configuración Actual:</h4>
              <p className="text-white/70 text-sm">
                - Buffer máximo: 50 logs<br />
                - Intervalo de envío: 5 segundos<br />
                - Consola habilitada: Sí<br />
                - Envío remoto: Sí
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-white text-lg font-semibold mb-4">Logs Generados</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-white/60 text-sm">No hay logs generados aún. Haz clic en los botones para probar el sistema.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="p-2 bg-black/20 rounded text-white/80 text-sm font-mono">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-white text-lg font-semibold mb-4">Guía de Uso</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
          <div>
            <h4 className="font-medium text-white mb-2">Métodos Principales:</h4>
            <ul className="space-y-1">
              <li><span className="text-blue-300">logger.error()</span> - Errores críticos</li>
              <li><span className="text-yellow-300">logger.warn()</span> - Advertencias</li>
              <li><span className="text-green-300">logger.info()</span> - Eventos informativos</li>
              <li><span className="text-purple-300">logger.auth()</span> - Errores de autenticación</li>
              <li><span className="text-red-300">logger.security()</span> - Eventos de seguridad</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">Hooks Disponibles:</h4>
            <ul className="space-y-1">
              <li><span className="text-blue-300">useErrorCapture()</span> - Captura global de errores</li>
              <li><span className="text-green-300">useUserEventLogger()</span> - Eventos de usuario</li>
              <li><span className="text-red-300">useSecurityLogger()</span> - Eventos de seguridad</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}