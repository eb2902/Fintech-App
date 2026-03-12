'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger, ErrorCategory } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar el estado para que el siguiente renderizado muestre la UI de reemplazo
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registrar el error en el logger
    logger.error(
      ErrorCategory.UI,
      `Error no controlado en componente React: ${error.message}`,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
        props: this.props
      },
      error
    );

    // Llamar al callback de error si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReportError = () => {
    if (this.state.error) {
      // Intentar reportar el error manualmente
      logger.error(
        ErrorCategory.UI,
        `Reporte manual de error: ${this.state.error.message}`,
        {
          manualReport: true,
          timestamp: new Date().toISOString()
        },
        this.state.error
      );
    }
  };

  render() {
    if (this.state.hasError) {
      // Renderizar UI de reemplazo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900">Oops! Algo salió mal</h3>
              <p className="mt-2 text-sm text-gray-600">
                Lo sentimos, pero se ha producido un error inesperado. Nuestro equipo ha sido notificado.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Intentar de nuevo
              </button>
              
              <button
                onClick={this.handleReportError}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                Reportar error
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer font-medium">Detalles del error (desarrollo)</summary>
                  <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;