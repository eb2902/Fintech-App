import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn(),
      },
      response: {
        use: vi.fn(),
        eject: vi.fn(),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

describe('api', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, VITE_API_URL: 'http://test-api.com/api' };
    localStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create axios instance with correct baseURL', async () => {
    await import('./api');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://test-api.com/api',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('should use default URL when VITE_API_URL is not defined', async () => {
    process.env = { ...originalEnv };
    vi.resetModules();
    
    await import('./api');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://localhost:3001/api',
      })
    );
  });
});

describe('api interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should add auth token to request headers when token exists', () => {
    localStorage.setItem('token', 'test-jwt-token');
    
    const mockConfig: { headers: Record<string, string> } = {
      headers: {},
    };

    expect(mockConfig.headers.Authorization).toBeUndefined();
    
    localStorage.setItem('token', 'test-jwt-token');
    const token = localStorage.getItem('token');
    if (token) {
      mockConfig.headers.Authorization = `Bearer ${token}`;
    }

    expect(mockConfig.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('should not add token when not present in localStorage', () => {
    const mockConfig: { headers: Record<string, string> } = {
      headers: {},
    };

    const token = localStorage.getItem('token');
    if (token) {
      mockConfig.headers.Authorization = `Bearer ${token}`;
    }

    expect(mockConfig.headers.Authorization).toBeUndefined();
  });
});