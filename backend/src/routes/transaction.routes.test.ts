import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import transactionRoutes from './transaction.routes';
import * as transactionController from '../controllers/transaction.controller';

vi.mock('../controllers/transaction.controller', () => ({
  getTransactions: vi.fn((_req, res) => res.status(200).json([])),
  getTransactionById: vi.fn((_req, res) => res.status(200).json({})),
  createTransaction: vi.fn((_req, res) => res.status(201).json({ success: true })),
  updateTransaction: vi.fn((_req, res) => res.status(200).json({ success: true })),
  deleteTransaction: vi.fn((_req, res) => res.status(204).send()),
  getSummary: vi.fn((_req, res) => res.status(200).json({})),
}));

vi.mock('../middleware/auth.middleware', () => ({
  authenticateToken: vi.fn((_req, _res, next) => next()),
}));

const app = express();
app.use(express.json());
app.use('/api/transactions', transactionRoutes);

describe('transaction.routes', () => {
  it('GET /api/transactions should call getTransactions controller', async () => {
    const response = await request(app).get('/api/transactions');
    expect(response.statusCode).toBe(200);
    expect(transactionController.getTransactions).toHaveBeenCalled();
  });

  it('GET /api/transactions/summary should call getSummary controller', async () => {
    const response = await request(app).get('/api/transactions/summary');
    expect(response.statusCode).toBe(200);
    expect(transactionController.getSummary).toHaveBeenCalled();
  });

  it('GET /api/transactions/:id should call getTransactionById controller', async () => {
    const response = await request(app).get('/api/transactions/123');
    expect(response.statusCode).toBe(200);
    expect(transactionController.getTransactionById).toHaveBeenCalled();
  });

  it('POST /api/transactions should call createTransaction controller', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({ amount: 100, description: 'Test', type: 'expense', categoryId: 1 });

    expect(response.statusCode).toBe(201);
    expect(transactionController.createTransaction).toHaveBeenCalled();
  });

  it('PUT /api/transactions/:id should call updateTransaction controller', async () => {
    const response = await request(app)
      .put('/api/transactions/1')
      .send({ description: 'Actualizado' });

    expect(response.statusCode).toBe(200);
    expect(transactionController.updateTransaction).toHaveBeenCalled();
  });

  it('DELETE /api/transactions/:id should call deleteTransaction controller', async () => {
    const response = await request(app).delete('/api/transactions/1');
    expect(response.statusCode).toBe(204);
    expect(transactionController.deleteTransaction).toHaveBeenCalled();
  });
});