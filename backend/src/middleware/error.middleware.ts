import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

/**
 * Middleware global para manejo centralizado de errores
 * Detecta y formatea diferentes tipos de errores automáticamente
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log en consola para desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.error('\n❌ ERROR:');
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);
    console.error('----------------------------------------\n');
  }

  let statusCode = 500;
  const response: Record<string, unknown> = {
    status: 'error',
    message: 'Error interno del servidor'
  };

  // 1. Errores personalizados de la aplicación
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    response.message = err.message;
    response.code = err.code;

    if (err.details) {
      response.details = err.details;
    }
  }

  // 2. Errores de validación Zod
  else if (err instanceof z.ZodError) {
    statusCode = 400;
    response.code = 'VALIDATION_ERROR';
    response.message = 'Datos de entrada inválidos';
    response.details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }

  // 3. Errores de Prisma
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        statusCode = 409;
        response.code = 'UNIQUE_CONSTRAINT';
        response.message = 'El recurso ya existe';
        break;
      case 'P2025': // Record not found
        statusCode = 404;
        response.code = 'NOT_FOUND';
        response.message = 'Recurso no encontrado';
        break;
      case 'P2003': // Foreign key constraint
        statusCode = 400;
        response.code = 'FOREIGN_KEY_ERROR';
        response.message = 'Referencia inválida';
        break;
      default:
        response.message = 'Error en base de datos';
    }
  }

  // 4. Errores de JWT
  else if (err instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    response.code = 'INVALID_TOKEN';
    response.message = 'Token inválido';
  } else if (err instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    response.code = 'TOKEN_EXPIRED';
    response.message = 'Token expirado';
  }

  // En desarrollo devolver stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Wrapper para capturar errores en funciones asincrónicas
 * Elimina la necesidad de try/catch en cada controlador
 */
export const asyncHandler = (fn: (req: Request, res: Response, next?: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next?: NextFunction) => {
    const promise = fn(req, res, next);
    
    if (next) {
      // En Express: propagar errores al middleware global
      promise.catch(next);
      return promise;
    } else {
      // En tests unitarios: devolver la promesa original para que pueda ser capturada con .rejects
      return promise;
    }
  };
};

/**
 * Middleware para rutas no encontradas
 */
export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    status: 'fail',
    code: 'ENDPOINT_NOT_FOUND',
    message: 'El endpoint solicitado no existe'
  });
};