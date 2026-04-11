import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';

const idParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID')
});

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().default('#6366f1'),
  icon: z.string().default('tag'),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, color, icon } = createCategorySchema.parse(req.body);

    const category = await prisma.category.create({
      data: { name, type, color, icon },
    });

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.query;

    const where = type && ['INCOME', 'EXPENSE'].includes(type as string)
      ? { type: type as 'INCOME' | 'EXPENSE' }
      : {};

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateCategorySchema.parse(req.body);

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    await prisma.category.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
