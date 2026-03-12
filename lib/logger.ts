/**
 * Sistema de logging centralizado para el frontend
 * Basado en mejores prácticas para aplicaciones FinTech
 */

export enum LogLevel {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UI = 'ui',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BUSINESS = 'business'
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: ErrorCategory;
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  userAgent: string;
  url: string;
  stack?: string;
  fingerprint?: string;
}

export interface LoggerConfig {
  maxBufferSize: number;
  flushInterval: number;
  enableConsole: boolean;
  enableRemote: boolean;
  endpoint: string;
}

class Logger {
  private buffer: LogEntry[] = [];
  private config: LoggerConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      maxBufferSize: 50,
      flushInterval: 5000, // 5 segundos
      enableConsole: true,
      enableRemote: true,
      endpoint: '/api/logs/frontend',
      ...config
    };

    this.startFlushTimer();
    this.generateSessionId();
  }

  private generateSessionId(): void {
    if (typeof window !== 'undefined') {
      this.sessionId = sessionStorage.getItem('logger_session_id') || this.generateId();
      sessionStorage.setItem('logger_session_id', this.sessionId);
    }
  }

  private generateId(): string {
    // Use cryptographically secure randomness when available
    let randomPart: string;

    const globalCrypto = this.getGlobalCrypto();

    if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
      const bytes = new Uint32Array(2);
      globalCrypto.getRandomValues(bytes);
      // Convert to base36 to keep ID compact and similar to previous format
      randomPart =
        (bytes[0].toString(36) + bytes[1].toString(36)).substr(0, 9);
    } else {
      // Fallback for environments without crypto; not cryptographically secure
      randomPart = Math.random().toString(36).substr(2, 9);
    }

    return 'log_' + randomPart + '_' + Date.now();
  }

  private getGlobalCrypto(): Crypto | undefined {
    if (typeof crypto !== 'undefined') {
      return crypto;
    }
    if (typeof window !== 'undefined' && window.crypto) {
      return window.crypto;
    }
    return undefined;
  }

  private createLogEntry(
    level: LogLevel,
    category: ErrorCategory,
    message: string,
    details?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      details,
      sessionId: this.sessionId || undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      stack: error?.stack
    };

    // Generar fingerprint para agrupación de errores similares
    entry.fingerprint = this.generateFingerprint(entry);

    return entry;
  }

  private generateFingerprint(entry: LogEntry): string {
    // Crear un fingerprint basado en el mensaje, categoría y stack trace
    const components = [
      entry.category,
      entry.message,
      entry.stack ? entry.stack.split('\n')[0] : ''
    ];
    return this.hashString(components.join('|'));
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.details, entry.stack);
        break;
      case LogLevel.WARNING:
        console.warn(prefix, entry.message, entry.details);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.details);
        break;
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    
    // Mantener solo los últimos N logs en el buffer
    if (this.buffer.length > this.config.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.config.maxBufferSize);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logsToFlush = [...this.buffer];
    this.buffer = [];

    if (this.config.enableRemote) {
      await this.sendToServer(logsToFlush);
    }
  }

  private async sendToServer(logs: LogEntry[]): Promise<void> {
    try {
      // Obtener token CSRF para la solicitud
      const csrfToken = this.getCSRFToken();
      if (!csrfToken) {
        console.warn('No CSRF token available, storing logs for later');
        // Si no hay token CSRF, volver a poner los logs en el buffer
        this.buffer.unshift(...logs);
        return;
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ logs }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await response.json();
    } catch (error) {
      console.error('Failed to send logs to server:', error);
      // Si falla el envío, volver a poner los logs en el buffer
      this.buffer.unshift(...logs);
      
      // Intentar reenviar después de un tiempo
      setTimeout(() => this.flushBuffer(), 10000);
    }
  }

  private getCSRFToken(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === '__Host-csrf-token') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.flushInterval);
  }

  // Métodos públicos para logging

  error(category: ErrorCategory, message: string, details?: Record<string, unknown>, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.ERROR, category, message, details, error);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  warn(category: ErrorCategory, message: string, details?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.WARNING, category, message, details);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  info(category: ErrorCategory, message: string, details?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.INFO, category, message, details);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  // Métodos abreviados para categorías comunes
  auth(message: string, details?: Record<string, unknown>, error?: Error): void {
    this.error(ErrorCategory.AUTHENTICATION, message, details, error);
  }

  network(message: string, details?: Record<string, unknown>, error?: Error): void {
    this.error(ErrorCategory.NETWORK, message, details, error);
  }

  validation(message: string, details?: Record<string, unknown>): void {
    this.warn(ErrorCategory.VALIDATION, message, details);
  }

  security(message: string, details?: Record<string, unknown>): void {
    this.error(ErrorCategory.SECURITY, message, details);
  }

  business(message: string, details?: Record<string, unknown>): void {
    this.info(ErrorCategory.BUSINESS, message, details);
  }

  // Obtener logs del buffer (para debugging)
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  // Limpiar buffer
  clearBuffer(): void {
    this.buffer = [];
  }

  // Forzar envío de logs
  async flush(): Promise<void> {
    await this.flushBuffer();
  }

  // Actualizar configuración
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Instancia singleton del logger
export const logger = new Logger();
