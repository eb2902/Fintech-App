import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockRequest, UserData } from '../test/types';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ConflictError, UnauthorizedError, NotFoundError } from '../errors/AppError';

// Mock dependencies BEFORE importing the controller
vi.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: vi.fn(),
  },
}));

// Import mocked dependencies
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authController from './auth.controller';

type MockFn = ReturnType<typeof vi.fn>;

const mockedPrisma = vi.mocked(prisma, true);
const mockedBcrypt = vi.mocked(bcrypt, true);
const mockedJwt = vi.mocked(jwt, true);

// Save original env
const originalEnv = process.env;

const createMockReq = (overrides: Partial<MockRequest> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides,
});

const createMockRes = (): Partial<Response> => {
  const mock = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return mock;
};

describe('auth.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '7d' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('register', () => {
    it('should throw ConflictError if user already exists', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue({ id: '1', email: 'test@example.com' } as UserData);

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await expect(
        authController.register(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(ConflictError);

      await expect(
        authController.register(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow('Usuario ya registrado');
    });

    it('should create user and return token on successful registration', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue(null);
      (mockedPrisma.user.create as MockFn).mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      } as UserData);
      (mockedBcrypt.hash as MockFn).mockResolvedValue('hashed-password');
      (mockedJwt.sign as MockFn).mockReturnValue('mock-token');

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await authController.register(req as unknown as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
        }),
        token: 'mock-token',
      });
    });

    it('should throw ZodError for invalid input (short name)', async () => {
      const req = createMockReq({
        body: {
          name: 'T',
          email: 'valid@email.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await expect(
        authController.register(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(z.ZodError);
    });

    it('should throw ZodError for invalid email', async () => {
      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await expect(
        authController.register(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(z.ZodError);
    });

    it('should throw ZodError for short password', async () => {
      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'valid@email.com',
          password: '123',
        },
      });
      const res = createMockRes();

      await expect(
        authController.register(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(z.ZodError);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError for non-existent user', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue(null);

      const req = createMockReq({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await expect(
        authController.login(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(UnauthorizedError);
      
      await expect(
        authController.login(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'correct-hash',
      } as UserData);
      (mockedBcrypt.compare as MockFn).mockResolvedValue(false);

      const req = createMockReq({
        body: {
          email: 'test@example.com',
          password: 'wrong-password',
        },
      });
      const res = createMockRes();

      await expect(
        authController.login(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(UnauthorizedError);
      
      await expect(
        authController.login(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should return user and token on successful login', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        password: 'correct-hash',
      } as UserData);
      (mockedBcrypt.compare as MockFn).mockResolvedValue(true);
      (mockedJwt.sign as MockFn).mockReturnValue('mock-token');

      const req = createMockReq({
        body: {
          email: 'test@example.com',
          password: 'correct-password',
        },
      });
      const res = createMockRes();

      await authController.login(req as unknown as Request, res as unknown as Response);

      expect(res.json).toHaveBeenCalledWith({
        token: 'mock-token',
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
        },
      });
    });
  });

  describe('getMe', () => {
    it('should return user by ID', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      } as UserData);

      const req = createMockReq({
        userId: '1',
      });
      const res = createMockRes();

      await authController.getMe(req as unknown as Request, res as unknown as Response);

      expect(res.json).toHaveBeenCalledWith({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(Date),
      });
    });

    it('should throw NotFoundError if user not found', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue(null);

      const req = createMockReq({
        userId: 'nonexistent',
      });
      const res = createMockRes();

      await expect(
        authController.getMe(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(NotFoundError);
      
      await expect(
        authController.getMe(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('error handling', () => {
    it('should use default JWT_SECRET when not configured', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue(null);
      (mockedPrisma.user.create as MockFn).mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      } as UserData);
      (mockedBcrypt.hash as MockFn).mockResolvedValue('hashed-password');
      (mockedJwt.sign as MockFn).mockReturnValue('mock-token');

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await authController.register(req as unknown as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.anything(),
        'default-secret',
        expect.anything()
      );

      process.env.JWT_SECRET = originalSecret;
    });

    it('should use default JWT_SECRET for login when not configured', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        password: 'correct-hash',
      } as UserData);
      (mockedBcrypt.compare as MockFn).mockResolvedValue(true);
      (mockedJwt.sign as MockFn).mockReturnValue('mock-token');

      const req = createMockReq({
        body: {
          email: 'test@example.com',
          password: 'correct-password',
        },
      });
      const res = createMockRes();

      await authController.login(req as unknown as Request, res as unknown as Response);

      expect(res.json).toHaveBeenCalled();
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.anything(),
        'default-secret',
        expect.anything()
      );

      process.env.JWT_SECRET = originalSecret;
    });

    it('should propagate database errors when register fails', async () => {
      const testError = new Error('Database connection error');
      (mockedPrisma.user.findUnique as MockFn).mockRejectedValue(testError);

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await expect(
        authController.register(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(testError);
    });

    it('should propagate database errors when login fails', async () => {
      const testError = new Error('Database connection error');
      (mockedPrisma.user.findUnique as MockFn).mockRejectedValue(testError);

      const req = createMockReq({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await expect(
        authController.login(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(testError);
    });

    it('should propagate database errors when getMe fails', async () => {
      const testError = new Error('Database connection error');
      (mockedPrisma.user.findUnique as MockFn).mockRejectedValue(testError);

      const req = createMockReq({
        userId: '1',
      });
      const res = createMockRes();

      await expect(
        authController.getMe(req as unknown as Request, res as unknown as Response)
      ).rejects.toThrow(testError);
    });

    it('should throw ZodError with validation errors for register', async () => {
      const req = createMockReq({
        body: {
          name: '',
          email: 'invalid-email-format',
          password: '12',
        },
      });
      const res = createMockRes();

      const error = await authController.register(req as unknown as Request, res as unknown as Response)
        .catch(e => e);

      expect(error).toBeInstanceOf(z.ZodError);
      expect(error.errors).toHaveLength(3);
      expect(error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.any(String) }),
      ]));
    });

    it('should throw ZodError with validation errors for login', async () => {
      const req = createMockReq({
        body: {
          email: 'not-an-email',
          password: '',
        },
      });
      const res = createMockRes();

      const error = await authController.login(req as unknown as Request, res as unknown as Response)
        .catch(e => e);

      expect(error).toBeInstanceOf(z.ZodError);
      expect(error.errors).toHaveLength(2);
      expect(error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.any(String) }),
      ]));
    });
  });
});