import { NextRequest, NextResponse } from 'next/server';
import { verifyCSRFToken } from '@/lib/csrf';
import { getSession } from '@/lib/session';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  userAgent: string;
  url: string;
  stack?: string;
  fingerprint?: string;
}

interface RequestBody {
  logs: LogEntry[];
}

export async function POST(request: NextRequest) {
  try {
    // Verificar token CSRF
    const csrfValid = await verifyCSRFToken(request);
    if (!csrfValid) {
      return NextResponse.json(
        { error: 'Token CSRF inválido' },
        { status: 403 }
      );
    }

    // Obtener sesión del usuario
    const session = await getSession(request);
    
    // Parsear el cuerpo de la solicitud
    const body: RequestBody = await request.json();
    
    if (!body.logs || !Array.isArray(body.logs)) {
      return NextResponse.json(
        { error: 'Formato de solicitud inválido' },
        { status: 400 }
      );
    }

    // Validar y procesar cada log
    const processedLogs = body.logs.map(log => ({
      ...log,
      // Asegurar que el userId venga de la sesión autenticada
      userId: session?.userId || log.userId,
      // Normalizar la categoría
      category: normalizeCategory(log.category),
      // Sanitizar detalles sensibles
      details: sanitizeDetails(log.details || {}),
      // Asegurar timestamp válido
      timestamp: log.timestamp || Date.now(),
      // Asegurar ID único
      id: log.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));

    // Guardar logs en la base de datos o sistema de logging
    await saveLogs(processedLogs);

    // Registrar en consola para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('Logs recibidos del frontend:', processedLogs.length);
      processedLogs.forEach(log => {
        console.log(`[${log.level}] ${log.category}: ${log.message}`);
      });
    }

    return NextResponse.json({
      success: true,
      processed: processedLogs.length
    });

  } catch (error) {
    console.error('Error procesando logs del frontend:', error);
    
    return NextResponse.json(
      { error: 'Error procesando logs' },
      { status: 500 }
    );
  }
}

function normalizeCategory(category: string): string {
  const validCategories = [
    'authentication',
    'network', 
    'validation',
    'ui',
    'security',
    'performance',
    'business'
  ];

  const normalized = category.toLowerCase().trim();
  return validCategories.includes(normalized) ? normalized : 'ui';
}

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  if (!details || typeof details !== 'object') {
    return details;
  }

  // Eliminar información sensible
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'cookie',
    'headers'
  ];

  const sanitized = { ...details };
  
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }

  // Limitar el tamaño de los detalles
  const stringified = JSON.stringify(sanitized);
  if (stringified.length > 10000) { // 10KB limit
    return {
      ...sanitized,
      _truncated: true,
      _originalSize: stringified.length
    };
  }

  return sanitized;
}

async function saveLogs(logs: LogEntry[]): Promise<void> {
  // En una implementación real, aquí guardarías los logs en:
  // - Base de datos (PostgreSQL, MongoDB, etc.)
  // - Sistema de logging externo (ELK Stack, Datadog, etc.)
  // - Archivo de logs estructurado
  
  // Por ahora, simplemente los registramos en consola
  // En producción, esto debería ser reemplazado por una implementación real
  
  for (const log of logs) {
    const logEntry = {
      timestamp: new Date(log.timestamp).toISOString(),
      level: log.level,
      category: log.category,
      message: log.message,
      userId: log.userId,
      sessionId: log.sessionId,
      userAgent: log.userAgent,
      url: log.url,
      fingerprint: log.fingerprint,
      details: log.details,
      stack: log.stack
    };

    // En desarrollo, mostrar en consola
    if (process.env.NODE_ENV === 'development') {
      console.log('Frontend Log:', JSON.stringify(logEntry, null, 2));
    }

    // Aquí iría la lógica para guardar en tu sistema de logging real
    // Por ejemplo:
    // await database.logs.create(logEntry);
    // await loggingService.send(logEntry);
  }
}