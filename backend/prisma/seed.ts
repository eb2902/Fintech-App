import { PrismaClient, TransactionType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default categories
  const expenseCategories = [
    { name: 'Alimentación', type: TransactionType.EXPENSE, color: '#22c55e', icon: 'utensils' },
    { name: 'Transporte', type: TransactionType.EXPENSE, color: '#3b82f6', icon: 'car' },
    { name: 'Entretenimiento', type: TransactionType.EXPENSE, color: '#8b5cf6', icon: 'film' },
    { name: 'Salud', type: TransactionType.EXPENSE, color: '#ef4444', icon: 'heart' },
    { name: 'Educación', type: TransactionType.EXPENSE, color: '#f59e0b', icon: 'book' },
    { name: 'Vivienda', type: TransactionType.EXPENSE, color: '#6366f1', icon: 'home' },
    { name: 'Servicios', type: TransactionType.EXPENSE, color: '#06b6d4', icon: 'zap' },
    { name: 'Ropa', type: TransactionType.EXPENSE, color: '#ec4899', icon: 'shirt' },
  ];

  const incomeCategories = [
    { name: 'Salario', type: TransactionType.INCOME, color: '#22c55e', icon: 'briefcase' },
    { name: 'Freelance', type: TransactionType.INCOME, color: '#3b82f6', icon: 'laptop' },
    { name: 'Inversiones', type: TransactionType.INCOME, color: '#8b5cf6', icon: 'trending-up' },
    { name: 'Otros ingresos', type: TransactionType.INCOME, color: '#f59e0b', icon: 'plus' },
  ];

  console.log('Creating categories...');
  
  const categoryMap: Record<string, string> = {};
  
  for (const cat of [...expenseCategories, ...incomeCategories]) {
    const categoryId = cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, '-');
    categoryMap[cat.name] = categoryId;
    
    await prisma.category.upsert({
      where: { id: categoryId },
      update: {},
      create: {
        id: categoryId,
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
      },
    });
  }

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123456', 10);
  
  console.log('Creating demo user...');
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      id: 'demo-user-001',
      name: 'Usuario Demo',
      email: 'demo@example.com',
      password: hashedPassword,
    },
  });

  // Create sample transactions
  console.log('Creating sample transactions...');
  
  const now = new Date();
  const transactions = [
    // Income
    { amount: 3500, description: 'Salario mensual', type: TransactionType.INCOME, categoryName: 'Salario', date: new Date(now.getFullYear(), now.getMonth(), 1) },
    { amount: 500, description: 'Proyecto freelance', type: TransactionType.INCOME, categoryName: 'Freelance', date: new Date(now.getFullYear(), now.getMonth(), 5) },
    { amount: 150, description: 'Dividendos', type: TransactionType.INCOME, categoryName: 'Inversiones', date: new Date(now.getFullYear(), now.getMonth(), 10) },
    
    // Expenses
    { amount: 800, description: 'Alquiler apartamento', type: TransactionType.EXPENSE, categoryName: 'Vivienda', date: new Date(now.getFullYear(), now.getMonth(), 1) },
    { amount: 150, description: 'Supermercado semanal', type: TransactionType.EXPENSE, categoryName: 'Alimentación', date: new Date(now.getFullYear(), now.getMonth(), 3) },
    { amount: 45, description: 'Gasolina', type: TransactionType.EXPENSE, categoryName: 'Transporte', date: new Date(now.getFullYear(), now.getMonth(), 4) },
    { amount: 30, description: 'Netflix + Spotify', type: TransactionType.EXPENSE, categoryName: 'Entretenimiento', date: new Date(now.getFullYear(), now.getMonth(), 5) },
    { amount: 120, description: 'Consulta médica', type: TransactionType.EXPENSE, categoryName: 'Salud', date: new Date(now.getFullYear(), now.getMonth(), 7) },
    { amount: 200, description: 'Curso online', type: TransactionType.EXPENSE, categoryName: 'Educación', date: new Date(now.getFullYear(), now.getMonth(), 8) },
    { amount: 85, description: 'Electricidad', type: TransactionType.EXPENSE, categoryName: 'Servicios', date: new Date(now.getFullYear(), now.getMonth(), 10) },
    { amount: 60, description: 'Ropa nueva', type: TransactionType.EXPENSE, categoryName: 'Ropa', date: new Date(now.getFullYear(), now.getMonth(), 12) },
    { amount: 95, description: 'Restaurante', type: TransactionType.EXPENSE, categoryName: 'Alimentación', date: new Date(now.getFullYear(), now.getMonth(), 14) },
    { amount: 25, description: 'Uber', type: TransactionType.EXPENSE, categoryName: 'Transporte', date: new Date(now.getFullYear(), now.getMonth(), 15) },
    { amount: 40, description: 'Cine', type: TransactionType.EXPENSE, categoryName: 'Entretenimiento', date: new Date(now.getFullYear(), now.getMonth(), 18) },
    { amount: 180, description: 'Supermercado quincenal', type: TransactionType.EXPENSE, categoryName: 'Alimentación', date: new Date(now.getFullYear(), now.getMonth(), 20) },
  ];

  for (const t of transactions) {
    const categoryId = categoryMap[t.categoryName];
    await prisma.transaction.create({
      data: {
        amount: t.amount,
        description: t.description,
        type: t.type,
        categoryId,
        userId: user.id,
        date: t.date,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Demo credentials:');
  console.log('   Email: demo@example.com');
  console.log('   Password: demo123456');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });