import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockRequest, MockResponse, MockDeleteResponse, CategoryData } from '../test/types';

vi.mock('../config/database', () => ({
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

describe('category.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const { createCategory } = await import('./category.controller');

      mockedPrisma.category.create.mockResolvedValue({
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

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Food',
          type: 'EXPENSE',
        })
      );
    });

    it('should return 400 for invalid input', async () => {
      const { createCategory } = await import('./category.controller');

      const req = createMockReq({
        body: {
          name: '',
          type: 'INVALID',
        },
      });
      const res = createMockRes();

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const { getCategories } = await import('./category.controller');

      mockedPrisma.category.findMany.mockResolvedValue([
        { id: '1', name: 'Food', type: 'EXPENSE' },
        { id: '2', name: 'Salary', type: 'INCOME' },
      ] as CategoryData[]);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await getCategories(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Food' }),
          expect.objectContaining({ name: 'Salary' }),
        ])
      );
    });

    it('should filter categories by type', async () => {
      const { getCategories } = await import('./category.controller');

      mockedPrisma.category.findMany.mockResolvedValue([
        { id: '1', name: 'Food', type: 'EXPENSE' },
      ] as CategoryData[]);

      const req = createMockReq({ query: { type: 'EXPENSE' } });
      const res = createMockRes();

      await getCategories(req, res);

      expect(mockedPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'EXPENSE' },
        })
      );
    });
  });

  describe('getCategoryById', () => {
    it('should return category by ID', async () => {
      const { getCategoryById } = await import('./category.controller');

      mockedPrisma.category.findUnique.mockResolvedValue({
        id: '1',
        name: 'Food',
        type: 'EXPENSE',
      } as CategoryData);

      const req = createMockReq({ params: { id: '1' } });
      const res = createMockRes();

      await getCategoryById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Food',
        })
      );
    });

    it('should return 404 if category not found', async () => {
      const { getCategoryById } = await import('./category.controller');

      mockedPrisma.category.findUnique.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const res = createMockRes();

      await getCategoryById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const { updateCategory } = await import('./category.controller');

      mockedPrisma.category.findUnique.mockResolvedValue({ id: '1', name: 'Food' } as CategoryData);
      mockedPrisma.category.update.mockResolvedValue({
        id: '1',
        name: 'Updated Food',
        type: 'EXPENSE',
      } as CategoryData);

      const req = createMockReq({
        params: { id: '1' },
        body: { name: 'Updated Food' },
      });
      const res = createMockRes();

      await updateCategory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Food',
        })
      );
    });

    it('should return 404 if category not found', async () => {
      const { updateCategory } = await import('./category.controller');

      mockedPrisma.category.findUnique.mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        body: { name: 'Updated' },
      });
      const res = createMockRes();

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      const { deleteCategory } = await import('./category.controller');

      mockedPrisma.category.findUnique.mockResolvedValue({ id: '1', name: 'Food' } as CategoryData);
      mockedPrisma.category.delete.mockResolvedValue({} as CategoryData);

      const req = createMockReq({ params: { id: '1' } });
      const res = createMockDeleteRes();

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 if category not found', async () => {
      const { deleteCategory } = await import('./category.controller');

      mockedPrisma.category.findUnique.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const res = createMockRes();

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});