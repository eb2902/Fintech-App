import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockRequest, MockResponse, MockDeleteResponse, TransactionData } from '../test/types';

vi.mock('../config/database', () => ({
  default: {
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import prisma from '../config/database';
const mockedPrisma = vi.mocked(prisma);

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

const createMockDeleteRes = (): MockDeleteResponse => ({
  status: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe('transaction.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should create a transaction successfully', async () => {
      const { createTransaction } = await import('./transaction.controller');

      const validCategoryId = '550e8400-e29b-41d4-a716-446655440000';

      mockedPrisma.transaction.create.mockResolvedValue({
        id: '1',
        amount: 100.00,
        description: 'Test transaction',
        type: 'EXPENSE',
        categoryId: validCategoryId,
        userId: 'user-1',
        date: new Date('2024-01-01'),
        category: { id: validCategoryId, name: 'Food' },
      } as TransactionData);

      const req = createMockReq({
        body: {
          amount: 100,
          description: 'Test transaction',
          type: 'EXPENSE',
          categoryId: validCategoryId,
          date: '2024-01-01T00:00:00.000Z',
        },
        userId: 'user-1',
      });
      const res = createMockRes();

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          amount: 100.00,
          description: 'Test transaction',
          type: 'EXPENSE',
        })
      );
    });

    it('should return 400 for invalid input', async () => {
      const { createTransaction } = await import('./transaction.controller');

      const req = createMockReq({
        body: {
          amount: -50,
          description: '',
          type: 'INVALID',
        },
        userId: 'user-1',
      });
      const res = createMockRes();

      await createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const { getTransactions } = await import('./transaction.controller');

      mockedPrisma.transaction.findMany.mockResolvedValue([
        {
          id: '1',
          amount: 50.00,
          description: 'Groceries',
          type: 'EXPENSE',
          category: { name: 'Food' },
        },
      ] as TransactionData[]);
      mockedPrisma.transaction.count.mockResolvedValue(1);

      const req = createMockReq({
        query: { page: '1', limit: '10' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await getTransactions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          transactions: expect.any(Array),
          pagination: expect.objectContaining({
            total: 1,
            page: 1,
            limit: 10,
          }),
        })
      );
    });

    it('should filter transactions by type', async () => {
      const { getTransactions } = await import('./transaction.controller');

      mockedPrisma.transaction.findMany.mockResolvedValue([]);
      mockedPrisma.transaction.count.mockResolvedValue(0);

      const req = createMockReq({
        query: { type: 'INCOME' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await getTransactions(req, res);

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            type: 'INCOME',
          }),
        })
      );
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction by ID', async () => {
      const { getTransactionById } = await import('./transaction.controller');

      mockedPrisma.transaction.findFirst.mockResolvedValue({
        id: '1',
        amount: 100.00,
        description: 'Test',
        type: 'EXPENSE',
        category: { name: 'Food' },
      } as TransactionData);

      const req = createMockReq({
        params: { id: '1' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await getTransactionById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          amount: 100.00,
        })
      );
    });

    it('should return 404 if transaction not found', async () => {
      const { getTransactionById } = await import('./transaction.controller');

      mockedPrisma.transaction.findFirst.mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await getTransactionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction successfully', async () => {
      const { updateTransaction } = await import('./transaction.controller');

      mockedPrisma.transaction.findFirst.mockResolvedValue({ id: '1', userId: 'user-1' } as TransactionData);
      mockedPrisma.transaction.update.mockResolvedValue({
        id: '1',
        amount: 200.00,
        description: 'Updated',
        type: 'EXPENSE',
        category: { name: 'Food' },
      } as TransactionData);

      const req = createMockReq({
        params: { id: '1' },
        body: { amount: 200, description: 'Updated' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await updateTransaction(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 200.00,
          description: 'Updated',
        })
      );
    });

    it('should return 404 if transaction not found', async () => {
      const { updateTransaction } = await import('./transaction.controller');

      mockedPrisma.transaction.findFirst.mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        body: { amount: 100 },
        userId: 'user-1',
      });
      const res = createMockRes();

      await updateTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction successfully', async () => {
      const { deleteTransaction } = await import('./transaction.controller');

      mockedPrisma.transaction.findFirst.mockResolvedValue({ id: '1', userId: 'user-1' } as TransactionData);
      mockedPrisma.transaction.delete.mockResolvedValue({} as TransactionData);

      const req = createMockReq({
        params: { id: '1' },
        userId: 'user-1',
      });
      const res = createMockDeleteRes();

      await deleteTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 if transaction not found', async () => {
      const { deleteTransaction } = await import('./transaction.controller');

      mockedPrisma.transaction.findFirst.mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await deleteTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getSummary', () => {
    it('should return financial summary', async () => {
      const { getSummary } = await import('./transaction.controller');

      mockedPrisma.transaction.findMany.mockResolvedValue([
        { id: '1', amount: 1000, type: 'INCOME', category: { name: 'Salary' } },
        { id: '2', amount: 200, type: 'EXPENSE', category: { name: 'Food' } },
        { id: '3', amount: 300, type: 'EXPENSE', category: { name: 'Transport' } },
      ] as TransactionData[]);

      const req = createMockReq({
        query: { month: '1', year: '2024' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await getSummary(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalIncome: 1000,
        totalExpenses: 500,
        balance: 500,
        byCategory: {
          Food: 200,
          Transport: 300,
        },
        transactionCount: 3,
      });
    });
  });
});