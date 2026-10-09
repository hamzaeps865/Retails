'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Topbar  from '@/components/layout/Topbar';
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface DashboardData {
  today: { revenue: number; profit: number; salesCount: number; itemsSold: number };
  thisMonth: { revenue: number; profit: number; salesCount: number };
  lowStockItems: number;
  topProducts: Array<{ productId: number; productName: string; unitsSold: number; revenue: number }>;
}

function fmt(n: number) {
  return `Rs. ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/reports/dashboard'),
  });

  const { data: dailyData } = useQuery<{ rows: any[] }>({
    queryKey: ['daily-sales'],
    queryFn: () => {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      return api.get(`/api/reports/sales/daily?from=${from}&to=${to}`);
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="app-layout">
          <Topbar title="Dashboard" />
          <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Today's Revenue",
      value: fmt(data?.today.revenue ?? 0),
      sub: `${data?.today.salesCount ?? 0} sales`,
      icon: <TrendingUp size={20} color="#fff" />,
      color: '#0F8B8D',
    },
    {
      label: "Today's Profit",
      value: fmt(data?.today.profit ?? 0),
      sub: `${data?.today.itemsSold ?? 0} items sold`,
      icon: <TrendingUp size={20} color="#fff" />,
      color: '#1E8E5A',
    },
    {
      label: 'Monthly Revenue',
      value: fmt(data?.thisMonth.revenue ?? 0),
      sub: `${data?.thisMonth.salesCount ?? 0} sales this month`,
      icon: <ShoppingCart size={20} color="#fff" />,
      color: '#2563EB',
    },
    {
      label: 'Low Stock Alerts',
      value: String(data?.lowStockItems ?? 0),
      sub: 'items need restocking',
      icon: <AlertTriangle size={20} color="#fff" />,
      color: '#B7791F',
    },
  ];

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="app-layout">
        <Topbar title="Dashboard" />
        <div className="main-content">

          {/* Stat Cards */}
          <div className="card-grid card-grid-4" style={{ marginBottom: 24 }}>
            {stats.map((s) => (
              <div key={s.label} className="card stat-card">
                <div className="stat-icon" style={{ background: s.color }}>
                  {s.icon}
                </div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
            {/* Sales chart */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                Sales (Last 30 Days)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData?.rows ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#0F8B8D" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top Products */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                Top Products (Last 30 Days)
              </div>
              {(data?.topProducts ?? []).length === 0 ? (
                <div className="empty-state">
                  <Package />
                  <p>No sales data yet</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.topProducts ?? []).map((p) => (
                        <tr key={p.productId}>
                          <td>{p.productName}</td>
                          <td>{p.unitsSold}</td>
                          <td>{fmt(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
