import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import authRoutes from '../../routes/auth.routes';
import categoryRoutes from '../../routes/category.routes';
import transactionRoutes from '../../routes/transaction.routes';
import { authenticateToken } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

// Mock completo del módulo Prisma Client
vi.mock('../../config/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn()
    },
    category: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn()
    },
    transaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn()
    }
  }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);

describe('🔄 Flujo Completo de Integración', () => {
  let authToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configure JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key';
    
    // Reset authToken for each test
    authToken = '';
  });

  it('1. ✅ Debe registrar un usuario correctamente', async () => {
    // Mock: No existing user
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    
    // Mock: Create user
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'test-user-id-123',
      name: 'Usuario Test',
      email: 'test@integracion.com',
      password: await bcrypt.hash('passwordSegura123', 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Usuario Test',
        email: 'test@integracion.com',
        password: 'passwordSegura123'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('id');
    
    authToken = response.body.token;
  });

  it('2. ✅ Debe iniciar sesión con credenciales correctas', async () => {
    const hashedPassword = await bcrypt.hash('passwordSegura123', 10);
    
    // Mock: Find existing user
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id-123',
      name: 'Usuario Test',
      email: 'test@integracion.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@integracion.com',
        password: 'passwordSegura123'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    authToken = response.body.token;
  });

  it('3. ✅ Debe obtener el perfil del usuario autenticado', async () => {
    // Mock: Find user by ID (for auth middleware)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id-123',
      name: 'Usuario Test',
      email: 'test@integracion.com',
      password: await bcrypt.hash('passwordSegura123', 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Generate a valid token for the test
    authToken = jwt.sign(
      { userId: 'test-user-id-123' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe('test@integracion.com');
  });

  it('4. ✅ Debe crear una nueva categoría', async () => {
    // Mock: Find user by ID (for auth middleware)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id-123',
      name: 'Usuario Test',
      email: 'test@integracion.com',
      password: await bcrypt.hash('passwordSegura123', 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock: Create category
    vi.mocked(prisma.category.create).mockResolvedValue({
      id: 'category-id-123',
      name: 'Alimentación',
      type: 'EXPENSE',
      color: '#6366f1',
      icon: 'food',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Generate a valid token
    authToken = jwt.sign(
      { userId: 'test-user-id-123' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Alimentación',
        type: 'EXPENSE',
        icon: 'food'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.name).toBe('Alimentación');
  });

  it('5. ✅ Debe listar las categorías del usuario', async () => {
    // Mock: Find user by ID (for auth middleware)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id-123',
      name: 'Usuario Test',
      email: 'test@integracion.com',
      password: await bcrypt.hash('passwordSegura123', 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock: Find many categories
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      {
        id: 'category-id-123',
        name: 'Alimentación',
        type: 'EXPENSE',
        color: '#6366f1',
        icon: 'food',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);

    // Generate a valid token
    authToken = jwt.sign(
      { userId: 'test-user-id-123' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    const response = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('6. ❌ No debe permitir acceder sin token', async () => {
    const response = await request(app)
      .get('/api/categories');

    expect(response.statusCode).toBe(401);
  });
});