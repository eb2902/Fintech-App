import { jest } from '@jest/globals';

// Mock de Prisma
const mockPrisma = {
  blacklistedToken: {
    findUnique: jest.fn(),
  },
};

// Mock de verifyToken
const mockVerifyToken = jest.fn();

// Mock de los módulos antes de importar
jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  verifyToken: mockVerifyToken,
}));

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let authenticate;

  beforeAll(async () => {
    // Importar después de los mocks
    const middleware = await import('../../src/middleware/authMiddleware.js');
    authenticate = middleware.authenticate;
  });

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
      
      mockPrisma.blacklistedToken.findUnique.mockResolvedValue(null);
      mockVerifyToken.mockReturnValue(mockDecoded);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockPrisma.blacklistedToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid.jwt.token' }
      });
      expect(mockVerifyToken).toHaveBeenCalledWith('valid.jwt.token');
      expect(mockReq.user).toEqual(mockDecoded);
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería retornar error 401 si no hay header de autorización', async () => {
      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token de acceso requerido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar error 401 si el formato del token es inválido', async () => {
      mockReq.headers.authorization = 'InvalidFormat';

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar error 401 si el token es inválido', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token';
      
      mockPrisma.blacklistedToken.findUnique.mockResolvedValue(null);
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Token inválido o expirado');
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token inválido o expirado',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar error 401 si el token ha expirado', async () => {
      mockReq.headers.authorization = 'Bearer expired.token';
      
      mockPrisma.blacklistedToken.findUnique.mockResolvedValue(null);
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Token inválido o expirado');
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token inválido o expirado',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar error 401 si el token está en la blacklist', async () => {
      mockReq.headers.authorization = 'Bearer blacklisted.token';
      
      mockPrisma.blacklistedToken.findUnique.mockResolvedValue({
        id: '1',
        token: 'blacklisted.token',
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token revocado. Por favor, inicia sesión nuevamente.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería manejar header con múltiples espacios', async () => {
      mockReq.headers.authorization = 'Bearer  valid.token.with.spaces';
      
      await authenticate(mockReq, mockRes, mockNext);

      // El token se extrae con split(' ')[1], que para 'Bearer  valid.token.with.spaces' 
      // devuelve '' (cadena vacía) porque split(' ')[1] toma el segundo elemento
      // que es una cadena vacía entre los dos espacios
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
