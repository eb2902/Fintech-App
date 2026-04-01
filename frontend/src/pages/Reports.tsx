import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import api from '../lib/api';
import { SkeletonCard, SkeletonChartCard } from '../components/ui/SkeletonCard';
import DateFilter from '../components/ui/DateFilter';

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: Record<string, number>;
  transactionCount: number;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: {
    id: string;
    name: string;
    color: string;
  };
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

export default function Reports() {
  const { isDark } = useTheme();
  const chartTextColor = isDark ? '#d1d5db' : '#6b7280';
  const chartGridColor = isDark ? '#374151' : '#e5e7eb';
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      color: isDark ? '#f9fafb' : '#111827',
    },
  };

  // Estado para filtros de fecha
  const [startDate, setStartDate] = useState(getDaysAgo(90)); // Últimos 90 días por defecto
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>({
    queryKey: ['summary', startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/transactions/summary?startDate=${startDate}&endDate=${endDate}`);
      return response.data;
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['transactions', { limit: 500, startDate, endDate }],
    queryFn: async () => {
      const response = await api.get(`/transactions?limit=500&startDate=${startDate}&endDate=${endDate}`);
      return response.data;
    },
  });

  const isLoading = summaryLoading || transactionsLoading;

  const categoryData = summary?.byCategory
    ? Object.entries(summary.byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  // Group transactions by month for trend analysis
  const monthlyData = transactions?.transactions
    ? transactions.transactions.reduce((acc: Record<string, { income: number; expense: number }>, t) => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) {
          acc[monthKey] = { income: 0, expense: 0 };
        }
        if (t.type === 'INCOME') {
          acc[monthKey].income += Number(t.amount);
        } else {
          acc[monthKey].expense += Number(t.amount);
        }
        return acc;
      }, {})
    : {};

  const chartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      Ingresos: data.income,
      Gastos: data.expense,
      Balance: data.income - data.expense,
    }));

  const savingsRate = summary?.totalIncome
    ? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100
    : 0;

  const expenseTransactions = transactions?.transactions?.filter((t) => t.type === 'EXPENSE') || [];
  const avgTransaction = expenseTransactions.length > 0
    ? expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0) / expenseTransactions.length
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reportes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis detallado de tus finanzas</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChartCard />
          <SkeletonChartCard />
        </div>
        <SkeletonChartCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reportes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis detallado de tus finanzas</p>
        </div>
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tasa de Ahorro</p>
              <p className="text-xl font-bold text-green-600">{savingsRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Promedio/Gasto</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">${avgTransaction.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Meses Registrados</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{chartData.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mayor Gasto</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {categoryData.length > 0 ? categoryData[0].name : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tendencia Mensual</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
              <XAxis dataKey="month" tick={{ fill: chartTextColor }} />
              <YAxis tick={{ fill: chartTextColor }} />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} contentStyle={tooltipStyle.contentStyle} />
              <Legend />
              <Line type="monotone" dataKey="Ingresos" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Balance" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[350px] text-gray-400 gap-2">
            <TrendingUp className="h-12 w-12 opacity-50" />
            <p>No hay datos suficientes para mostrar la tendencia</p>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución por Categoría</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} contentStyle={tooltipStyle.contentStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 gap-2">
              <PieChart className="h-12 w-12 opacity-50" />
              <p>No hay datos de categorías</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gastos por Categoría</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartGridColor} />
                <XAxis type="number" tick={{ fill: chartTextColor }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: chartTextColor }} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} contentStyle={tooltipStyle.contentStyle} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {categoryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 gap-2">
              <BarChart className="h-12 w-12 opacity-50" />
              <p>No hay datos de categorías</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Details Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalle por Categoría</h2>
        </div>
        {categoryData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {categoryData.map((category, index) => {
                  const percentage = summary?.totalExpenses
                    ? (category.value / summary.totalExpenses) * 100
                    : 0;
                  return (
                    <tr key={category.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                        ${category.value.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-gray-600 dark:text-gray-400 w-12">{percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
            <BarChart3 className="h-12 w-12 opacity-50" />
            <p>No hay datos de categorías disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}