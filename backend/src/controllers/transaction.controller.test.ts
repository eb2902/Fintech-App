import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TransactionData } from '../test/types';
import * as transactionController from './transaction.controller';

vi.mock('../config/database', () => ({
  __esModule: true,
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
type MockFn = ReturnType<typeof vi.fn>;
const mockedPrisma = vi.mocked(prisma, true);

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

describe('transaction.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should create a transaction successfully', async () => {
      const validCategoryId = '550e8400-e29b-41d4-a716-446655440000';

      (mockedPrisma.transaction.create as MockFn).mockResolvedValue({
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

      await transactionController.createTransaction(req as unknown as Parameters<typeof transactionController.createTransaction>[0], res as unknown as Parameters<typeof transactionController.createTransaction>[1]);

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
      const req = createMockReq({
        body: {
          amount: -50,
          description: '',
          type: 'INVALID',
        },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.createTransaction(req as unknown as Parameters<typeof transactionController.createTransaction>[0], res as unknown as Parameters<typeof transactionController.createTransaction>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockResolvedValue([
        {
          id: '1',
          amount: 50.00,
          description: 'Groceries',
          type: 'EXPENSE',
          category: { name: 'Food' },
        },
      ] as TransactionData[]);
      (mockedPrisma.transaction.count as MockFn).mockResolvedValue(1);

      const req = createMockReq({
        query: { page: '1', limit: '10' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getTransactions(req as unknown as Parameters<typeof transactionController.getTransactions>[0], res as unknown as Parameters<typeof transactionController.getTransactions>[1]);

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
      (mockedPrisma.transaction.findMany as MockFn).mockResolvedValue([]);
      (mockedPrisma.transaction.count as MockFn).mockResolvedValue(0);

      const req = createMockReq({
        query: { type: 'INCOME' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getTransactions(req as unknown as Parameters<typeof transactionController.getTransactions>[0], res as unknown as Parameters<typeof transactionController.getTransactions>[1]);

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            type: 'INCOME',
          }),
        })
      );
    });

    it('should filter transactions by date range', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockResolvedValue([]);
      (mockedPrisma.transaction.count as MockFn).mockResolvedValue(0);

      const req = createMockReq({
        query: { startDate: '2024-01-01', endDate: '2024-12-31' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getTransactions(req as unknown as Parameters<typeof transactionController.getTransactions>[0], res as unknown as Parameters<typeof transactionController.getTransactions>[1]);

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction by ID', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockResolvedValue({
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

      await transactionController.getTransactionById(req as unknown as Parameters<typeof transactionController.getTransactionById>[0], res as unknown as Parameters<typeof transactionController.getTransactionById>[1]);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          amount: 100.00,
        })
      );
    });

    it('should return 404 if transaction not found', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getTransactionById(req as unknown as Parameters<typeof transactionController.getTransactionById>[0], res as unknown as Parameters<typeof transactionController.getTransactionById>[1]);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction successfully', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockResolvedValue({ id: '1', userId: 'user-1' } as TransactionData);
      (mockedPrisma.transaction.update as MockFn).mockResolvedValue({
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

      await transactionController.updateTransaction(req as unknown as Parameters<typeof transactionController.updateTransaction>[0], res as unknown as Parameters<typeof transactionController.updateTransaction>[1]);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 200.00,
          description: 'Updated',
        })
      );
    });

    it('should return 404 if transaction not found', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        body: { amount: 100 },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.updateTransaction(req as unknown as Parameters<typeof transactionController.updateTransaction>[0], res as unknown as Parameters<typeof transactionController.updateTransaction>[1]);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid update data', async () => {
      const req = createMockReq({
        params: { id: '1' },
        body: { amount: -50 },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.updateTransaction(req as unknown as Parameters<typeof transactionController.updateTransaction>[0], res as unknown as Parameters<typeof transactionController.updateTransaction>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction successfully', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockResolvedValue({ id: '1', userId: 'user-1' } as TransactionData);
      (mockedPrisma.transaction.delete as MockFn).mockResolvedValue({} as TransactionData);

      const req = createMockReq({
        params: { id: '1' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.deleteTransaction(req as unknown as Parameters<typeof transactionController.deleteTransaction>[0], res as unknown as Parameters<typeof transactionController.deleteTransaction>[1]);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 if transaction not found', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.deleteTransaction(req as unknown as Parameters<typeof transactionController.deleteTransaction>[0], res as unknown as Parameters<typeof transactionController.deleteTransaction>[1]);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getSummary', () => {
    it('should return financial summary', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockResolvedValue([
        { id: '1', amount: 1000, type: 'INCOME', category: { name: 'Salary' } },
        { id: '2', amount: 200, type: 'EXPENSE', category: { name: 'Food' } },
        { id: '3', amount: 300, type: 'EXPENSE', category: { name: 'Transport' } },
      ] as TransactionData[]);

      const req = createMockReq({
        query: { month: '1', year: '2024' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getSummary(req as unknown as Parameters<typeof transactionController.getSummary>[0], res as unknown as Parameters<typeof transactionController.getSummary>[1]);

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

    it('should return summary with zero values when no transactions exist', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockResolvedValue([]);

      const req = createMockReq({
        query: { month: '1', year: '2024' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getSummary(req as unknown as Parameters<typeof transactionController.getSummary>[0], res as unknown as Parameters<typeof transactionController.getSummary>[1]);

      expect(res.json).toHaveBeenCalledWith({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        byCategory: {},
        transactionCount: 0,
      });
    });

    it('should return summary for current month when no month/year provided', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockResolvedValue([]);

      const req = createMockReq({
        query: {},
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getSummary(req as unknown as Parameters<typeof transactionController.getSummary>[0], res as unknown as Parameters<typeof transactionController.getSummary>[1]);

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should return 500 when createTransaction database throws an error', async () => {
      const validCategoryId = '550e8400-e29b-41d4-a716-446655440000';
      (mockedPrisma.transaction.create as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        body: {
          amount: 100,
          description: 'Test',
          type: 'EXPENSE',
          categoryId: validCategoryId,
        },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.createTransaction(req as unknown as Parameters<typeof transactionController.createTransaction>[0], res as unknown as Parameters<typeof transactionController.createTransaction>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when getTransactions database throws an error', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        query: { page: '1', limit: '10' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getTransactions(req as unknown as Parameters<typeof transactionController.getTransactions>[0], res as unknown as Parameters<typeof transactionController.getTransactions>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when getTransactionById database throws an error', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        params: { id: '1' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getTransactionById(req as unknown as Parameters<typeof transactionController.getTransactionById>[0], res as unknown as Parameters<typeof transactionController.getTransactionById>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when updateTransaction database throws an error', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockResolvedValue({ id: '1', userId: 'user-1' } as TransactionData);
      (mockedPrisma.transaction.update as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        params: { id: '1' },
        body: { amount: 200 },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.updateTransaction(req as unknown as Parameters<typeof transactionController.updateTransaction>[0], res as unknown as Parameters<typeof transactionController.updateTransaction>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when deleteTransaction database throws an error', async () => {
      (mockedPrisma.transaction.findFirst as MockFn).mockResolvedValue({ id: '1', userId: 'user-1' } as TransactionData);
      (mockedPrisma.transaction.delete as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        params: { id: '1' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.deleteTransaction(req as unknown as Parameters<typeof transactionController.deleteTransaction>[0], res as unknown as Parameters<typeof transactionController.deleteTransaction>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when getSummary database throws an error', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        query: { month: '1', year: '2024' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getSummary(req as unknown as Parameters<typeof transactionController.getSummary>[0], res as unknown as Parameters<typeof transactionController.getSummary>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should handle pagination edge cases (page 2 skips first page)', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockResolvedValue([]);
      (mockedPrisma.transaction.count as MockFn).mockResolvedValue(0);

      const req = createMockReq({
        query: { page: '2', limit: '10' },
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getTransactions(req as unknown as Parameters<typeof transactionController.getTransactions>[0], res as unknown as Parameters<typeof transactionController.getTransactions>[1]);

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          include: { category: true },
          orderBy: { date: 'desc' },
        })
      );
    });

    it('should use default limit when not provided', async () => {
      (mockedPrisma.transaction.findMany as MockFn).mockResolvedValue([]);
      (mockedPrisma.transaction.count as MockFn).mockResolvedValue(0);

      const req = createMockReq({
        query: {},
        userId: 'user-1',
      });
      const res = createMockRes();

      await transactionController.getTransactions(req as unknown as Parameters<typeof transactionController.getTransactions>[0], res as unknown as Parameters<typeof transactionController.getTransactions>[1]);

      expect(mockedPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });
});
