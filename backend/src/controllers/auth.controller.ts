import { Response } from 'express';
import type { Request } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/error.middleware';
import { ConflictError, UnauthorizedError, NotFoundError } from '../errors/AppError';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = registerSchema.parse(req.body);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError('Usuario ya registrado');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  // Generate token
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
  );

  res.status(201).json({ user, token });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = loginSchema.parse(req.body);

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Generate token
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...userWithoutPassword } = user;

  res.json({ user: userWithoutPassword, token });
});

export interface AuthRequest extends Request {
  userId?: string;
}

export const getMe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.json(user);
});
