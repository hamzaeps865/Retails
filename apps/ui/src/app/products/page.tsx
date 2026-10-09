'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Topbar  from '@/components/layout/Topbar';
import { Package, Plus, Search } from 'lucide-react';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useQuery<{ products: any[]; total: number; page: number }>({
    queryKey: ['products', search, page],
    queryFn:  () => api.get(`/api/products?search=${encodeURIComponent(search)}&page=${page}&limit=20`),
  });

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="app-layout">
        <Topbar title="Products" />
        <div className="main-content">

          <div className="page-header">
            <div>
              <h2>Products</h2>
              <p>{data?.total ?? 0} products in your catalog</p>
            </div>
            <button className="btn btn-primary">
              <Plus size={16} /> Add Product
            </button>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                placeholder="Search by name, SKU, or barcode..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div className="card">
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner" />
              </div>
            ) : (data?.products ?? []).length === 0 ? (
              <div className="empty-state">
                <Package />
                <p style={{ fontWeight: 600, marginBottom: 4 }}>No products yet</p>
                <p>Add your first product to get started</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Category</th>
                      <th>Return Rule</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.products ?? []).map((p: any) => (
                      <tr key={p.id} style={{ cursor: 'pointer' }}>
                        <td><strong>{p.name}</strong></td>
                        <td style={{ textTransform: 'capitalize' }}>{p.gender}</td>
                        <td>{p.categoryId}</td>
                        <td>
                          <span className={`badge ${p.returnRule === 'allowed' ? 'badge-green' : p.returnRule === 'never' ? 'badge-red' : 'badge-amber'}`}>
                            {p.returnRule}
                          </span>
                        </td>
                        <td className="text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(data?.total ?? 0) > 20 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  ← Prev
                </button>
                <span style={{ padding: '8px 12px', fontSize: 14 }}>Page {page}</span>
                <button className="btn btn-outline" onClick={() => setPage((p) => p + 1)}>
                  Next →
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
