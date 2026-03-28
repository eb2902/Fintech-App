import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      headers: {},
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('debería llamar next() si el token es válido', async () => {
      const mockDecoded = { userId: '123', email: 'test@example.com' };
      mockReq.headers.authorization = 'Bearer valid.jwt.token';
      
      const verifySpy = jest.spyOn(jwt, 'verify').mockReturnValue(mockDecoded);

      const { authenticate } = await import('../../src/middleware/authMiddleware.js');

      authenticate(mockReq, mockRes, mockNext);

      expect(verifySpy).toHaveBeenCalledWith('valid.jwt.token', process.env.JWT_SECRET);
      expect(mockReq.user).toEqual(mockDecoded);
      expect(mockNext).toHaveBeenCalled();

      verifySpy.mockRestore();
    });

    it('debería retornar error 401 si no hay header de autorización', async () => {
      const { authenticate } = await import('../../src/middleware/authMiddleware.js');

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token de acceso requerido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar error 401 si el formato del token es inválido', async () => {
      mockReq.headers.authorization = 'InvalidFormat';

      const { authenticate } = await import('../../src/middleware/authMiddleware.js');

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar error 401 si el token es inválido', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token';
      
      const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const { authenticate } = await import('../../src/middleware/authMiddleware.js');

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token inválido o expirado',
      });
      expect(mockNext).not.toHaveBeenCalled();

      verifySpy.mockRestore();
    });

    it('debería retornar error 401 si el token ha expirado', async () => {
      mockReq.headers.authorization = 'Bearer expired.token';
      
      const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const { authenticate } = await import('../../src/middleware/authMiddleware.js');

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token inválido o expirado',
      });
      expect(mockNext).not.toHaveBeenCalled();

      verifySpy.mockRestore();
    });

    it('debería manejar header con múltiples espacios', async () => {
      const mockDecoded = { userId: '123', email: 'test@example.com' };
      mockReq.headers.authorization = 'Bearer  valid.token.with.spaces';
      
      const verifySpy = jest.spyOn(jwt, 'verify').mockReturnValue(mockDecoded);

      const { authenticate } = await import('../../src/middleware/authMiddleware.js');

      authenticate(mockReq, mockRes, mockNext);

      // El token se extrae con split(' ')[1], que para 'Bearer  valid.token.with.spaces' 
      // devuelve '' (cadena vacía) porque split(' ')[1] toma el segundo elemento
      // que es una cadena vacía entre los dos espacios
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();

      verifySpy.mockRestore();
    });
  });
});
