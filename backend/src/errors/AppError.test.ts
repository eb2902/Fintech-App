import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} from './AppError';

describe('AppError', () => {
  describe('Clase base AppError', () => {
    it('debe crear instancia correctamente con todos los parametros', () => {
      const error = new AppError('Mensaje de prueba', 400, 'TEST_ERROR', { campo: 'valor' });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Mensaje de prueba');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ campo: 'valor' });
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('debe establecer status "error" para codigos 5xx', () => {
      const error = new AppError('Error servidor', 500);
      expect(error.status).toBe('error');
    });

    it('debe establecer status "fail" para codigos 4xx', () => {
      const error = new AppError('Error cliente', 404);
      expect(error.status).toBe('fail');
    });

    it('debe aceptar instancia sin codigo ni detalles', () => {
      const error = new AppError('Mensaje simple', 400);
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
  });

  describe('Subclases de errores especificos', () => {
    it('ValidationError debe crear error 400 correctamente', () => {
      const details = { campo: 'invalido' };
      const error = new ValidationError('Datos invalidos', details);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toBe(details);
      expect(error.status).toBe('fail');
    });

    it('UnauthorizedError debe crear error 401 con mensaje por defecto', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('No autorizado');
    });

    it('ForbiddenError debe crear error 403 con mensaje por defecto', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Permisos insuficientes');
    });

    it('NotFoundError debe crear error 404 con mensaje por defecto', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Recurso no encontrado');
    });

    it('ConflictError debe crear error 409 correctamente', () => {
      const error = new ConflictError('Recurso ya existe');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Recurso ya existe');
    });

    it('TooManyRequestsError debe crear error 429 con mensaje por defecto', () => {
      const error = new TooManyRequestsError();
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('TOO_MANY_REQUESTS');
      expect(error.message).toBe('Demasiadas solicitudes');
    });
  });
});