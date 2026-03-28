import { jest } from '@jest/globals';

// Configurar variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fintech_test';

// Mock de console.error para evitar logs en tests
global.console = {
  ...console,
  error: jest.fn(),
  log: jest.fn(),
};

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});