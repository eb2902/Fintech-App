import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CategoryData } from '../test/types';
import * as categoryController from './category.controller';

vi.mock('../config/database', () => ({
  __esModule: true,
  default: {
    category: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

describe('category.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      (mockedPrisma.category.create as MockFn).mockResolvedValue({
        id: '1',
        name: 'Food',
        type: 'EXPENSE',
        color: '#ff0000',
        icon: 'food',
      } as CategoryData);

      const req = createMockReq({
        body: {
          name: 'Food',
          type: 'EXPENSE',
          color: '#ff0000',
          icon: 'food',
        },
      });
      const res = createMockRes();

      await categoryController.createCategory(req as unknown as Parameters<typeof categoryController.createCategory>[0], res as unknown as Parameters<typeof categoryController.createCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Food',
          type: 'EXPENSE',
        })
      );
    });

    it('should return 400 for invalid input', async () => {
      const req = createMockReq({
        body: {
          name: '',
          type: 'INVALID',
        },
      });
      const res = createMockRes();

      await categoryController.createCategory(req as unknown as Parameters<typeof categoryController.createCategory>[0], res as unknown as Parameters<typeof categoryController.createCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      (mockedPrisma.category.findMany as MockFn).mockResolvedValue([
        { id: '1', name: 'Food', type: 'EXPENSE' },
        { id: '2', name: 'Salary', type: 'INCOME' },
      ] as CategoryData[]);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await categoryController.getCategories(req as unknown as Parameters<typeof categoryController.getCategories>[0], res as unknown as Parameters<typeof categoryController.getCategories>[1]);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Food' }),
          expect.objectContaining({ name: 'Salary' }),
        ])
      );
    });

    it('should filter categories by type', async () => {
      (mockedPrisma.category.findMany as MockFn).mockResolvedValue([
        { id: '1', name: 'Food', type: 'EXPENSE' },
      ] as CategoryData[]);

      const req = createMockReq({ query: { type: 'EXPENSE' } });
      const res = createMockRes();

      await categoryController.getCategories(req as unknown as Parameters<typeof categoryController.getCategories>[0], res as unknown as Parameters<typeof categoryController.getCategories>[1]);

      expect(mockedPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'EXPENSE' },
        })
      );
    });
  });

  describe('getCategoryById', () => {
    it('should return category by ID', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockResolvedValue({
        id: '1',
        name: 'Food',
        type: 'EXPENSE',
      } as CategoryData);

      const req = createMockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const res = createMockRes();

      await categoryController.getCategoryById(req as unknown as Parameters<typeof categoryController.getCategoryById>[0], res as unknown as Parameters<typeof categoryController.getCategoryById>[1]);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Food',
        })
      );
    });

    it('should return 400 for INVALID ID format', async () => {
      const req = createMockReq({ params: { id: 'nonexistent' } });
      const res = createMockRes();

      await categoryController.getCategoryById(req as unknown as Parameters<typeof categoryController.getCategoryById>[0], res as unknown as Parameters<typeof categoryController.getCategoryById>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if category not found with VALID ID', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockResolvedValue(null);

      const req = createMockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440099' } });
      const res = createMockRes();

      await categoryController.getCategoryById(req as unknown as Parameters<typeof categoryController.getCategoryById>[0], res as unknown as Parameters<typeof categoryController.getCategoryById>[1]);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockResolvedValue({ id: '1', name: 'Food' } as CategoryData);
      (mockedPrisma.category.update as MockFn).mockResolvedValue({
        id: '1',
        name: 'Updated Food',
        type: 'EXPENSE',
      } as CategoryData);

      const req = createMockReq({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Updated Food' },
      });
      const res = createMockRes();

      await categoryController.updateCategory(req as unknown as Parameters<typeof categoryController.updateCategory>[0], res as unknown as Parameters<typeof categoryController.updateCategory>[1]);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Food',
        })
      );
    });

    it('should return 400 for INVALID ID format on update', async () => {
      const req = createMockReq({
        params: { id: 'nonexistent' },
        body: { name: 'Updated' },
      });
      const res = createMockRes();

      await categoryController.updateCategory(req as unknown as Parameters<typeof categoryController.updateCategory>[0], res as unknown as Parameters<typeof categoryController.updateCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if category not found with VALID ID on update', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockResolvedValue(null);

      const req = createMockReq({
        params: { id: '550e8400-e29b-41d4-a716-446655440099' },
        body: { name: 'Updated' },
      });
      const res = createMockRes();

      await categoryController.updateCategory(req as unknown as Parameters<typeof categoryController.updateCategory>[0], res as unknown as Parameters<typeof categoryController.updateCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid update data', async () => {
      const req = createMockReq({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: '' },
      });
      const res = createMockRes();

      await categoryController.updateCategory(req as unknown as Parameters<typeof categoryController.updateCategory>[0], res as unknown as Parameters<typeof categoryController.updateCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockResolvedValue({ id: '1', name: 'Food' } as CategoryData);
      (mockedPrisma.category.delete as MockFn).mockResolvedValue({} as CategoryData);

      const req = createMockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const res = createMockRes();

      await categoryController.deleteCategory(req as unknown as Parameters<typeof categoryController.deleteCategory>[0], res as unknown as Parameters<typeof categoryController.deleteCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 400 for INVALID ID format on delete', async () => {
      const req = createMockReq({ params: { id: 'nonexistent' } });
      const res = createMockRes();

      await categoryController.deleteCategory(req as unknown as Parameters<typeof categoryController.deleteCategory>[0], res as unknown as Parameters<typeof categoryController.deleteCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if category not found with VALID ID on delete', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockResolvedValue(null);

      const req = createMockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440099' } });
      const res = createMockRes();

      await categoryController.deleteCategory(req as unknown as Parameters<typeof categoryController.deleteCategory>[0], res as unknown as Parameters<typeof categoryController.deleteCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('error handling', () => {
    it('should return 500 when createCategory database throws an error', async () => {
      (mockedPrisma.category.create as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        body: {
          name: 'Food',
          type: 'EXPENSE',
          color: '#ff0000',
          icon: 'food',
        },
      });
      const res = createMockRes();

      await categoryController.createCategory(req as unknown as Parameters<typeof categoryController.createCategory>[0], res as unknown as Parameters<typeof categoryController.createCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when getCategories database throws an error', async () => {
      (mockedPrisma.category.findMany as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await categoryController.getCategories(req as unknown as Parameters<typeof categoryController.getCategories>[0], res as unknown as Parameters<typeof categoryController.getCategories>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when getCategoryById database throws an error', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const res = createMockRes();

      await categoryController.getCategoryById(req as unknown as Parameters<typeof categoryController.getCategoryById>[0], res as unknown as Parameters<typeof categoryController.getCategoryById>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when updateCategory database throws an error', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockResolvedValue({ id: '1', name: 'Food' } as CategoryData);
      (mockedPrisma.category.update as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Updated Food' },
      });
      const res = createMockRes();

      await categoryController.updateCategory(req as unknown as Parameters<typeof categoryController.updateCategory>[0], res as unknown as Parameters<typeof categoryController.updateCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should return 500 when deleteCategory database throws an error', async () => {
      (mockedPrisma.category.findUnique as MockFn).mockResolvedValue({ id: '1', name: 'Food' } as CategoryData);
      (mockedPrisma.category.delete as MockFn).mockRejectedValue(new Error('Database connection error'));

      const req = createMockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const res = createMockRes();

      await categoryController.deleteCategory(req as unknown as Parameters<typeof categoryController.deleteCategory>[0], res as unknown as Parameters<typeof categoryController.deleteCategory>[1]);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
