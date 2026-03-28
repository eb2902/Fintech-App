import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';

// Mock de Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
  },
};

// Mock de jwt.js
const mockGenerateToken = jest.fn(() => 'mock.jwt.token');
const mockGenerateRefreshToken = jest.fn(() => 'mock.refresh.token');
const mockDecodeToken = jest.fn();
const mockGetTokenExpiration = jest.fn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

// Mock de los módulos
jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  generateToken: mockGenerateToken,
  generateRefreshToken: mockGenerateRefreshToken,
  decodeToken: mockDecodeToken,
  getTokenExpiration: mockGetTokenExpiration,
}));

// Importar después de los mocks
const { register, login, getProfile } = await import('../../src/controllers/authController.js');

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      user: { userId: '123', email: 'test@example.com' },
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('register', () => {
    it('debería registrar un usuario exitosamente', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'Test User',
      };
      
      mockReq.body = userData;
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue({
        id: '123',
        email: userData.email,
        name: userData.name,
        createdAt: new Date(),
      });

      await register(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(hashSpy).toHaveBeenCalledWith(userData.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Usuario registrado exitosamente',
          token: 'mock.jwt.token',
        })
      );

      hashSpy.mockRestore();
    });

    it('debería retornar error 400 si el email ya existe', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test',
      };
      mockPrisma.user.findUnique.mockResolvedValue({ id: '456' });

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Ya existe un usuario con este email',
      });
    });

    it('debería retornar error 500 si ocurre un error interno', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      };
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error interno del servidor',
      });
    });
  });

  describe('login', () => {
    it('debería hacer login exitosamente', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      mockReq.body = loginData;
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '123',
        email: loginData.email,
        password: 'hashedPassword',
        name: 'Test User',
        createdAt: new Date(),
      });
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await login(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });
      expect(compareSpy).toHaveBeenCalledWith(loginData.password, 'hashedPassword');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Inicio de sesión exitoso',
          token: 'mock.jwt.token',
        })
      );

      compareSpy.mockRestore();
    });

    it('debería retornar error 401 si el usuario no existe', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Credenciales inválidas',
      });
    });

    it('debería retornar error 401 si la contraseña es incorrecta', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '123',
        email: 'test@example.com',
        password: 'hashedPassword',
      });
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Credenciales inválidas',
      });

      compareSpy.mockRestore();
    });
  });

  describe('getProfile', () => {
    it('debería obtener el perfil del usuario', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await getProfile(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockReq.user.userId },
        select: expect.any(Object),
      });
      expect(mockRes.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it('debería retornar error 404 si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuario no encontrado',
      });
    });
  });
});