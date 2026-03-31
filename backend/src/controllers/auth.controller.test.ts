import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockRequest, MockResponse, UserData } from '../test/types';

// Mock dependencies BEFORE importing the controller
vi.mock('../config/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
  },
}));

// Import mocked dependencies
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const mockedPrisma = vi.mocked(prisma);
const mockedBcrypt = vi.mocked(bcrypt);
const mockedJwt = vi.mocked(jwt);

// Save original env
const originalEnv = process.env;

const createMockReq = (overrides: Partial<MockRequest> = {}): MockRequest => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides,
});

const createMockRes = (): MockResponse => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

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
      const { register } = await import('./auth.controller');
      
      mockedPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' } as UserData);

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
    });

    it('should create user and return token on successful registration', async () => {
      const { register } = await import('./auth.controller');

      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedPrisma.user.create.mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      } as UserData);
      mockedBcrypt.hash.mockResolvedValue('hashed-password');
      mockedJwt.sign.mockReturnValue('mock-token');

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await register(req, res);

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
      const { register } = await import('./auth.controller');

      const req = createMockReq({
        body: {
          name: 'T',
          email: 'valid@email.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid email', async () => {
      const { register } = await import('./auth.controller');

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for short password', async () => {
      const { register } = await import('./auth.controller');

      const req = createMockReq({
        body: {
          name: 'Test User',
          email: 'valid@email.com',
          password: '123',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('should return 401 for non-existent user', async () => {
      const { login } = await import('./auth.controller');

      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const req = createMockReq({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });
      const res = createMockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 401 for wrong password', async () => {
      const { login } = await import('./auth.controller');

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'correct-hash',
      } as UserData);
      mockedBcrypt.compare.mockResolvedValue(false);

      const req = createMockReq({
        body: {
          email: 'test@example.com',
          password: 'wrong-password',
        },
      });
      const res = createMockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return user and token on successful login', async () => {
      const { login } = await import('./auth.controller');

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        password: 'correct-hash',
      } as UserData);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedJwt.sign.mockReturnValue('mock-token');

      const req = createMockReq({
        body: {
          email: 'test@example.com',
          password: 'correct-password',
        },
      });
      const res = createMockRes();

      await login(req, res);

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
      const { getMe } = await import('./auth.controller');

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      } as UserData);

      const req = createMockReq({
        userId: '1',
      });
      const res = createMockRes();

      await getMe(req, res);

      expect(res.json).toHaveBeenCalledWith({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(Date),
      });
    });

    it('should return 404 if user not found', async () => {
      const { getMe } = await import('./auth.controller');

      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const req = createMockReq({
        userId: 'nonexistent',
      });
      const res = createMockRes();

      await getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});