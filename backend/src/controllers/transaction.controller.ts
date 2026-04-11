import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

const transactionIdParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID')
});

const dateFilterSchema = z.object({
  startDate: z.union([z.string().datetime({ precision: 3, offset: true }), z.string().date()]).optional(),
  endDate: z.union([z.string().datetime({ precision: 3, offset: true }), z.string().date()]).optional()
});

const updateTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  date: z.union([z.string().datetime({ precision: 3, offset: true }), z.string().date()]).optional(),
});

const createTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
  date: z.union([z.string().datetime({ precision: 3, offset: true }), z.string().date()]).optional(),
});

interface TransactionWhere {
  userId: string;
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  date?: {
    gte?: Date;
    lte?: Date;
  };
}

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, description, type, categoryId, date } = createTransactionSchema.parse(req.body);
    const userId = req.userId!;

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        description,
        type,
        categoryId,
        userId,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { type, categoryId, page = '1', limit = '10' } = req.query;
    const { startDate, endDate } = dateFilterSchema.parse(req.query);

    const where: TransactionWhere = { userId };

    if (type && ['INCOME', 'EXPENSE'].includes(type as string)) {
      where.type = type as 'INCOME' | 'EXPENSE';
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = transactionIdParamSchema.parse(req.params);

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = transactionIdParamSchema.parse(req.params);
    const data = updateTransactionSchema.parse(req.body);

    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!existingTransaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined
      },
      include: { category: true },
    });

    res.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = transactionIdParamSchema.parse(req.params);

    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!existingTransaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    await prisma.transaction.delete({
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

export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { month, year } = req.query;

    const startDate = month && year
      ? new Date(parseInt(year as string), parseInt(month as string) - 1, 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: { category: true },
    });

    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const byCategory = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        const categoryName = t.category.name;
        acc[categoryName] = (acc[categoryName] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    res.json({
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      byCategory,
      transactionCount: transactions.length,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};