export interface MockRequest {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  userId?: string;
  headers?: Record<string, string>;
}

export interface UserData {
  id: string;
  name?: string;
  email: string;
  password?: string;
  createdAt?: Date;
}

export interface CategoryData {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
  icon?: string;
}

export interface TransactionCategoryData {
  id?: string;
  name: string;
}

export interface TransactionData {
  id: string;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  category?: TransactionCategoryData;
  userId?: string;
  date?: Date;
}