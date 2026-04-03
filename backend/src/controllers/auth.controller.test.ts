import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockRequest, UserData } from '../test/types';

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

const createMockReq = (overrides: Partial<MockRequest> = {}): unknown => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides,
});

const createMockRes = (): Record<string, MockFn> => {
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
    it('should return 400 if user already exists', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue({ id: '1', email: 'test@example.com' } as UserData);

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await authController.register(req as unknown as Parameters<typeof authController.register>[0], res as unknown as Parameters<typeof authController.register>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
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

      await authController.register(req as unknown as Parameters<typeof authController.register>[0], res as unknown as Parameters<typeof authController.register>[1]);

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

    it('should return 400 for invalid input (short name)', async () => {
      const req = createMockReq({
        body: {
          name: 'T',
          email: 'valid@email.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await authController.register(req as unknown as Parameters<typeof authController.register>[0], res as unknown as Parameters<typeof authController.register>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid email', async () => {
      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await authController.register(req as unknown as Parameters<typeof authController.register>[0], res as unknown as Parameters<typeof authController.register>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for short password', async () => {
      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'valid@email.com',
          password: '123',
        },
      });
      const res = createMockRes();

      await authController.register(req as unknown as Parameters<typeof authController.register>[0], res as unknown as Parameters<typeof authController.register>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('should return 401 for non-existent user', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue(null);

      const req = createMockReq({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await authController.login(req as unknown as Parameters<typeof authController.login>[0], res as unknown as Parameters<typeof authController.login>[1]);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 401 for wrong password', async () => {
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

      await authController.login(req as unknown as Parameters<typeof authController.login>[0], res as unknown as Parameters<typeof authController.login>[1]);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
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

      await authController.login(req as unknown as Parameters<typeof authController.login>[0], res as unknown as Parameters<typeof authController.login>[1]);

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

      await authController.getMe(req as unknown as Parameters<typeof authController.getMe>[0], res as unknown as Parameters<typeof authController.getMe>[1]);

      expect(res.json).toHaveBeenCalledWith({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(Date),
      });
    });

    it('should return 404 if user not found', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockResolvedValue(null);

      const req = createMockReq({
        userId: 'nonexistent',
      });
      const res = createMockRes();

      await authController.getMe(req as unknown as Parameters<typeof authController.getMe>[0], res as unknown as Parameters<typeof authController.getMe>[1]);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
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

      await authController.register(req as unknown as Parameters<typeof authController.register>[0], res as unknown as Parameters<typeof authController.register>[1]);

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

      await authController.login(req as unknown as Parameters<typeof authController.login>[0], res as unknown as Parameters<typeof authController.login>[1]);

      expect(res.json).toHaveBeenCalled();
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.anything(),
        'default-secret',
        expect.anything()
      );

      process.env.JWT_SECRET = originalSecret;
    });

    it('should return 500 when register database throws an error', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await authController.register(req as unknown as Parameters<typeof authController.register>[0], res as unknown as Parameters<typeof authController.register>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when login database throws an error', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await authController.login(req as unknown as Parameters<typeof authController.login>[0], res as unknown as Parameters<typeof authController.login>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when getMe database throws an error', async () => {
      (mockedPrisma.user.findUnique as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        userId: '1',
      });
      const res = createMockRes();

      await authController.getMe(req as unknown as Parameters<typeof authController.getMe>[0], res as unknown as Parameters<typeof authController.getMe>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 400 with ZodError details for register validation failure', async () => {
      const req = createMockReq({
        body: {
          name: '',
          email: 'invalid-email-format',
          password: '12',
        },
      });
      const res = createMockRes();

      await authController.register(req as unknown as Parameters<typeof authController.register>[0], res as unknown as Parameters<typeof authController.register>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.arrayContaining([
          expect.objectContaining({ message: expect.any(String) }),
        ]),
      });
    });

    it('should return 400 with ZodError details for login validation failure', async () => {
      const req = createMockReq({
        body: {
          email: 'not-an-email',
          password: '',
        },
      });
      const res = createMockRes();

      await authController.login(req as unknown as Parameters<typeof authController.login>[0], res as unknown as Parameters<typeof authController.login>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.arrayContaining([
          expect.objectContaining({ message: expect.any(String) }),
        ]),
      });
    });
  });
});
