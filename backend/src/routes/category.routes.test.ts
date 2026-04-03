import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import categoryRoutes from './category.routes';
import * as categoryController from '../controllers/category.controller';

vi.mock('../controllers/category.controller', () => ({
  getCategories: vi.fn((_req, res) => res.status(200).json([])),
  getCategoryById: vi.fn((_req, res) => res.status(200).json({})),
  createCategory: vi.fn((_req, res) => res.status(201).json({ success: true })),
  updateCategory: vi.fn((_req, res) => res.status(200).json({ success: true })),
  deleteCategory: vi.fn((_req, res) => res.status(204).send()),
}));

vi.mock('../middleware/auth.middleware', () => ({
  authenticateToken: vi.fn((_req, _res, next) => next()),
}));

const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);

describe('category.routes', () => {
  it('GET /api/categories should call getCategories controller', async () => {
    const response = await request(app).get('/api/categories');
    expect(response.statusCode).toBe(200);
    expect(categoryController.getCategories).toHaveBeenCalled();
  });

  it('GET /api/categories/:id should call getCategoryById controller', async () => {
    const response = await request(app).get('/api/categories/123');
    expect(response.statusCode).toBe(200);
    expect(categoryController.getCategoryById).toHaveBeenCalled();
  });

  it('POST /api/categories should call createCategory controller', async () => {
    const response = await request(app)
      .post('/api/categories')
      .send({ name: 'Test', type: 'expense' });

    expect(response.statusCode).toBe(201);
    expect(categoryController.createCategory).toHaveBeenCalled();
  });

  it('PUT /api/categories/:id should call updateCategory controller', async () => {
    const response = await request(app)
      .put('/api/categories/1')
      .send({ name: 'Actualizado' });

    expect(response.statusCode).toBe(200);
    expect(categoryController.updateCategory).toHaveBeenCalled();
  });

  it('DELETE /api/categories/:id should call deleteCategory controller', async () => {
    const response = await request(app).delete('/api/categories/1');
    expect(response.statusCode).toBe(204);
    expect(categoryController.deleteCategory).toHaveBeenCalled();
  });
});