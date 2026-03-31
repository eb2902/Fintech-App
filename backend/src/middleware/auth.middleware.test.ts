import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction } from 'express';
import * as authMiddleware from './auth.middleware';

vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
type MockFn = ReturnType<typeof vi.fn>;
const mockedJwt = vi.mocked(jwt, true);

const originalEnv = process.env;

const createMockReq = (overrides: Record<string, unknown> = {}): unknown => ({
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

describe('auth.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key' };
  });

  describe('authenticateToken', () => {
    it('should return 401 if no authorization header', async () => {
      const req = createMockReq({
        headers: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      authMiddleware.authenticateToken(req as unknown as Parameters<typeof authMiddleware.authenticateToken>[0], res as unknown as Parameters<typeof authMiddleware.authenticateToken>[1], next as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for malformed authorization header', async () => {
      (mockedJwt.verify as MockFn).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const req = createMockReq({
        headers: {
          authorization: 'Basic somecredentials',
        },
      });
      const res = createMockRes();
      const next = vi.fn();

      authMiddleware.authenticateToken(req as unknown as Parameters<typeof authMiddleware.authenticateToken>[0], res as unknown as Parameters<typeof authMiddleware.authenticateToken>[1], next as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid', async () => {
      (mockedJwt.verify as MockFn).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const req = createMockReq({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      const res = createMockRes();
      const next = vi.fn();

      authMiddleware.authenticateToken(req as unknown as Parameters<typeof authMiddleware.authenticateToken>[0], res as unknown as Parameters<typeof authMiddleware.authenticateToken>[1], next as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with valid token', async () => {
      (mockedJwt.verify as MockFn).mockReturnValue({ userId: 'user-123' });
      
      const req = createMockReq({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });
      const res = createMockRes();
      const next = vi.fn();

      authMiddleware.authenticateToken(req as unknown as Parameters<typeof authMiddleware.authenticateToken>[0], res as unknown as Parameters<typeof authMiddleware.authenticateToken>[1], next as unknown as NextFunction);

      expect((req as { userId?: string }).userId).toBe('user-123');
      expect(next).toHaveBeenCalled();
    });
  });
});