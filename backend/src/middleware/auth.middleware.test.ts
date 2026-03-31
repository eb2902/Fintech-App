import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockRequest, MockResponse } from '../test/types';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
const mockedJwt = vi.mocked(jwt);

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

describe('auth.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key' };
  });

  describe('authenticateToken', () => {
    it('should return 401 if no authorization header', async () => {
      const { authenticateToken } = await import('./auth.middleware');
      
      const req = createMockReq({
        headers: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for malformed authorization header', async () => {
      const { authenticateToken } = await import('./auth.middleware');
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const req = createMockReq({
        headers: {
          authorization: 'Basic somecredentials',
        },
      });
      const res = createMockRes();
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid', async () => {
      const { authenticateToken } = await import('./auth.middleware');
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const req = createMockReq({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      const res = createMockRes();
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with valid token', async () => {
      const { authenticateToken } = await import('./auth.middleware');
      mockedJwt.verify.mockReturnValue({ userId: 'user-123' });
      
      const req = createMockReq({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });
      const res = createMockRes();
      const next = vi.fn();

      authenticateToken(req, res, next);

      expect(req.userId).toBe('user-123');
      expect(next).toHaveBeenCalled();
    });
  });
});