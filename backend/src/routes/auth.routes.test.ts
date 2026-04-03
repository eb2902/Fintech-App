import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from './auth.routes';
import * as authController from '../controllers/auth.controller';

vi.mock('../controllers/auth.controller', () => ({
  register: vi.fn((_req, res) => res.status(201).json({ success: true })),
  login: vi.fn((_req, res) => res.status(200).json({ success: true })),
  getMe: vi.fn((_req, res) => res.status(200).json({ success: true })),
}));

vi.mock('../middleware/auth.middleware', () => ({
  authenticateToken: vi.fn((_req, _res, next) => next()),
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('auth.routes', () => {
  it('POST /api/auth/register should call register controller', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: 'password123' });

    expect(response.statusCode).toBe(201);
    expect(authController.register).toHaveBeenCalled();
  });

  it('POST /api/auth/login should call login controller', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(response.statusCode).toBe(200);
    expect(authController.login).toHaveBeenCalled();
  });

  it('GET /api/auth/me should call getMe controller', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.statusCode).toBe(200);
    expect(authController.getMe).toHaveBeenCalled();
  });
});