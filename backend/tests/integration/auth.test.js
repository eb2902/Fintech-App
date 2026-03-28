import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
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
  blacklistedToken: {
    findUnique: jest.fn(),
  },
};

// Mock de database.js
jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: mockPrisma,
}));

// Importar después de los mocks
const { default: authRoutes } = await import('../../src/routes/authRoutes.js');

// Crear app de Express para tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('debería registrar un usuario exitosamente', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue({
        id: '123',
        email: userData.email,
        name: userData.name,
        createdAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: '1',
        token: 'mock.refresh.token',
        userId: '123',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Usuario registrado exitosamente');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user).not.toHaveProperty('password');

      hashSpy.mockRestore();
    });

    it('debería retornar error 400 si faltan campos requeridos', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'El nombre es requerido');
    });

    it('debería retornar error 400 si la contraseña es muy corta', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '12345',
          name: 'Test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'La contraseña debe tener al menos 8 caracteres');
    });

    it('debería retornar error 400 si la contraseña no es fuerte', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&#+_-)');
    });

    it('debería retornar error 400 si el email ya existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '456' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password123!',
          name: 'Test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Ya existe un usuario con este email');
    });

    it('debería retornar error 500 si ocurre un error interno', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error interno del servidor');
    });
  });

  describe('POST /api/auth/login', () => {
    it('debería hacer login exitosamente', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '123',
        email: loginData.email,
        password: 'hashedPassword',
        name: 'Test User',
        createdAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: '1',
        token: 'mock.refresh.token',
        userId: '123',
      });
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Inicio de sesión exitoso');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);

      compareSpy.mockRestore();
    });

    it('debería retornar error 400 si faltan email o contraseña', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'La contraseña es requerida');
    });

    it('debería retornar error 401 si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
    });

    it('debería retornar error 401 si la contraseña es incorrecta', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '123',
        email: 'test@example.com',
        password: 'hashedPassword',
      });
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Credenciales inválidas');

      compareSpy.mockRestore();
    });
  });

  describe('GET /api/auth/profile', () => {
    it('debería retornar error 401 sin token de autenticación', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token de acceso requerido');
    });

    it('debería retornar error 401 con token inválido', async () => {
      mockPrisma.blacklistedToken.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token inválido o expirado');
    });
  });
});