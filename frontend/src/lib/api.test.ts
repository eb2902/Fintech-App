/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios completamente
const mockInterceptors = {
  request: {
    use: vi.fn(),
    eject: vi.fn(),
  },
  response: {
    use: vi.fn(),
    eject: vi.fn(),
  },
};

const mockAxiosInstance = {
  interceptors: mockInterceptors,
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('api', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('API instance configuration', () => {
    it('should create axios instance with correct baseURL from env', async () => {
      process.env.VITE_API_URL = 'http://custom-api.com/api';
      await import('./api');
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom-api.com/api',
        })
      );
    });

    it('should use default URL when VITE_API_URL is not defined', async () => {
      delete process.env.VITE_API_URL;
      await import('./api');
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3001/api',
        })
      );
    });

    it('should create instance with JSON content-type header', async () => {
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  describe('request interceptor', () => {
    it('should register request interceptor', async () => {
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      expect(mockInterceptors.request.use).toHaveBeenCalled();
    });

    it('should add Authorization header when token exists', async () => {
      localStorage.setItem('token', 'test-jwt-token');
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      
      // Obtenemos la función interceptor que se registró
      const interceptorFn = mockInterceptors.request.use.mock.calls[0][0];
      const mockConfig = { headers: {} };
      const result = interceptorFn(mockConfig);

      expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
      // Restore localStorage
      localStorage.clear();
    });

    it('should not add Authorization header when no token exists', async () => {
      localStorage.clear();
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      
      const interceptorFn = mockInterceptors.request.use.mock.calls[0][0];
      const mockConfig = { headers: { 'Custom-Header': 'value' } };
      const result = interceptorFn(mockConfig);

      expect(result.headers.Authorization).toBeUndefined();
      expect(result.headers['Custom-Header']).toBe('value');
    });
  });

  describe('response interceptor', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/', replace: vi.fn() },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('should register response interceptor', async () => {
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      expect(mockInterceptors.response.use).toHaveBeenCalled();
    });

    it('should return response on success through interceptor', async () => {
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      
      const interceptorFn = mockInterceptors.response.use.mock.calls[0][0];
      const mockResponse = {
        data: { user: { id: '1', name: 'Test' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      const result = interceptorFn(mockResponse);
      expect(result).toBe(mockResponse);
      expect(result.data.user).toEqual({ id: '1', name: 'Test' });
    });

    it('should remove token and redirect to login on 401 error', async () => {
      localStorage.setItem('token', 'test-jwt-token');
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      
      const interceptorFn = mockInterceptors.response.use.mock.calls[0][1];
      const mockError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
        message: 'Request failed with status code 401',
      };

      await interceptorFn(mockError).catch(() => { /* expected rejection */ });
      
      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.href).toBe('/login');
      
      localStorage.clear();
    });

    it('should NOT redirect on 500 error', async () => {
      localStorage.setItem('token', 'test-jwt-token');
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      
      const interceptorFn = mockInterceptors.response.use.mock.calls[0][1];
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error' },
        },
        message: 'Request failed with status code 500',
      };

      await interceptorFn(mockError).catch(() => { /* expected rejection */ });
      
      expect(localStorage.getItem('token')).toBe('test-jwt-token');
      expect(window.location.href).not.toBe('/login');
      
      localStorage.clear();
    });

    it('should NOT redirect on 403 error', async () => {
      localStorage.setItem('token', 'test-jwt-token');
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      
      const interceptorFn = mockInterceptors.response.use.mock.calls[0][1];
      const mockError = {
        response: {
          status: 403,
          data: { error: 'Forbidden' },
        },
        message: 'Request failed with status code 403',
      };

      await interceptorFn(mockError).catch(() => { /* expected rejection */ });
      
      expect(localStorage.getItem('token')).toBe('test-jwt-token');
      expect(window.location.href).not.toBe('/login');
      
      localStorage.clear();
    });

    it('should handle network errors without response object', async () => {
      process.env.VITE_API_URL = 'http://test-api.com/api';
      await import('./api');
      
      const interceptorFn = mockInterceptors.response.use.mock.calls[0][1];
      const mockError = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
      };

      await interceptorFn(mockError).catch(() => { /* expected rejection */ });
      // Token and location should be unchanged
    });
  });
});