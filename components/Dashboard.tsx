
import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Transaction } from '../types';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const monthlyData = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalExpense = monthlyData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = monthlyData
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryDataMap = monthlyData
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const pieData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));

    const trendMap: Record<string, { income: number; expense: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.getFullYear()}/${d.getMonth() + 1}`;
      trendMap[key] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}/${d.getMonth() + 1}`;
      if (trendMap[key]) {
        if (t.type === 'income') trendMap[key].income += t.amount;
        else trendMap[key].expense += t.amount;
      }
    });

    const trendData = Object.entries(trendMap).map(([name, vals]) => ({
      name,
      ...vals
    }));

    return { totalExpense, totalIncome, pieData, trendData };
  }, [transactions, currentMonth, currentYear]);

  return (
    <div className="p-4 pb-24 space-y-6 overflow-x-hidden">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">今月の売上</p>
          <p className="text-xl font-bold text-indigo-600">¥{stats.totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">今月の経費</p>
          <p className="text-xl font-bold text-rose-500">¥{stats.totalExpense.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">支出トレンド (半年間)</h3>
        {/* 親要素に relative w-full h-[300px] を指定してサイズを固定 */}
        <div className="relative w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `¥${val/1000}k`} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="income" name="売上" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="経費" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">支出カテゴリ内訳</h3>
        {stats.pieData.length > 0 ? (
          <div className="relative w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm italic">
            データがありません
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
