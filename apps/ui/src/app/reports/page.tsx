'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Topbar  from '@/components/layout/Topbar';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ReportsPage() {
  const { data: perf } = useQuery<{ rows: any[] }>({
    queryKey: ['perf-report'],
    queryFn: () => api.get('/api/reports/products/performance?days=30'),
  });

  const { data: low } = useQuery<{ items: any[]; total: number }>({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/api/reports/stock/low'),
  });

  const { data: dash } = useQuery<any>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/reports/dashboard'),
  });

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="app-layout">
        <Topbar title="Reports" />
        <div className="main-content">

          <div className="page-header">
            <div>
              <h2>Reports</h2>
              <p>Business performance overview</p>
            </div>
          </div>

          {/* Summary Row */}
          <div className="card-grid card-grid-4" style={{ marginBottom: 24 }}>
            {[
              { label: "Today's Revenue", value: `Rs. ${(dash?.today?.revenue ?? 0).toLocaleString()}` },
              { label: "Today's Profit",  value: `Rs. ${(dash?.today?.profit  ?? 0).toLocaleString()}` },
              { label: 'Month Revenue',   value: `Rs. ${(dash?.thisMonth?.revenue ?? 0).toLocaleString()}` },
              { label: 'Low Stock Items', value: String(dash?.lowStockItems ?? 0) },
            ].map((s) => (
              <div key={s.label} className="card stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
            {/* Product Performance Chart */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                Top Products by Revenue (Last 30 Days)
              </div>
              {(perf?.rows ?? []).length === 0 ? (
                <div className="empty-state"><p>No sales data yet</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(perf?.rows ?? []).slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="productName" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#0F8B8D" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Low Stock Alerts */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
                <AlertTriangle size={18} color="#B7791F" />
                Low Stock Alerts ({low?.total ?? 0})
              </div>
              {(low?.items ?? []).length === 0 ? (
                <div className="empty-state"><p style={{ color: 'var(--success)' }}>✅ All stock levels OK</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>In Stock</th>
                        <th>Reorder At</th>
                        <th>Needed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(low?.items ?? []).slice(0, 8).map((i: any) => (
                        <tr key={i.variantId}>
                          <td>{i.productName}</td>
                          <td className="text-muted">{i.sku}</td>
                          <td>
                            <span className={`badge ${i.quantity === 0 ? 'badge-red' : 'badge-amber'}`}>
                              {i.quantity}
                            </span>
                          </td>
                          <td className="text-muted">{i.reorderLevel}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: 600 }}>+{i.deficit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Product Performance Table */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
              Product Performance — Last 30 Days
            </div>
            {(perf?.rows ?? []).length === 0 ? (
              <div className="empty-state"><p>No data. Start making sales to see performance here.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Units Sold</th>
                      <th>Revenue</th>
                      <th>Cost</th>
                      <th>Profit</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(perf?.rows ?? []).map((r: any) => (
                      <tr key={r.sku}>
                        <td><strong>{r.productName}</strong></td>
                        <td className="text-muted">{r.sku}</td>
                        <td>{r.unitsSold}</td>
                        <td>Rs. {r.revenue.toLocaleString()}</td>
                        <td className="text-muted">Rs. {r.cost.toLocaleString()}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>Rs. {r.profit.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${r.margin >= 30 ? 'badge-green' : r.margin >= 15 ? 'badge-amber' : 'badge-red'}`}>
                            {r.margin}%
                          </span>
                        </td>
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
  );
}
