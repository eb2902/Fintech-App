import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { generateToken, verifyToken } from '../../src/utils/jwt.js';

describe('JWT Utils', () => {
  const mockPayload = { userId: '123', email: 'test@example.com' };
  const mockToken = 'mock.jwt.token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('debería generar un token JWT válido', () => {
      // Mock de jwt.sign
      const signSpy = jest.spyOn(jwt, 'sign').mockReturnValue(mockToken);

      const result = generateToken(mockPayload);

      expect(signSpy).toHaveBeenCalledWith(
        mockPayload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      expect(result).toBe(mockToken);

      signSpy.mockRestore();
    });
  });

  describe('verifyToken', () => {
    it('debería verificar y decodificar un token válido', () => {
      const decodedPayload = { ...mockPayload, iat: Date.now(), exp: Date.now() + 86400 };
      const verifySpy = jest.spyOn(jwt, 'verify').mockReturnValue(decodedPayload);

      const result = verifyToken(mockToken);

      expect(verifySpy).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET);
      expect(result).toEqual(decodedPayload);

      verifySpy.mockRestore();
    });

    it('debería lanzar error para token inválido', () => {
      const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => verifyToken('invalid-token')).toThrow('Token inválido o expirado');

      verifySpy.mockRestore();
    });

    it('debería lanzar error para token expirado', () => {
      const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => verifyToken('expired-token')).toThrow('Token inválido o expirado');

      verifySpy.mockRestore();
    });
  });
});
