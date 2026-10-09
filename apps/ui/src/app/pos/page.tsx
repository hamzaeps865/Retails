'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Sidebar from '@/components/layout/Sidebar';
import { useCartStore } from '@/stores';
import { Trash2, Plus, Minus, Search, ShoppingCart } from 'lucide-react';

interface Variant {
  id: number; sku: string; salePrice: number;
  productName?: string; quantity?: number;
}

interface ProductResult {
  products: Array<{
    id: number; name: string;
    variants?: Variant[];
  }>;
}

function fmt(n: number) { return `Rs. ${n.toLocaleString()}`; }

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { items, addItem, updateQty, removeItem, clearCart, discount } = useCartStore();

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // F2 = focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F8') { e.preventDefault(); if (cartTotal > 0) setPaying(true); }
      if (e.key === 'Escape') setPaying(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data } = useQuery<ProductResult>({
    queryKey: ['pos-search', search],
    queryFn: () => api.get(`/api/products?search=${encodeURIComponent(search)}&limit=40`),
    enabled: search.length > 0,
  });

  const subtotal   = items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
  const cartTotal  = Math.max(0, subtotal - discount);
  const cashNum    = parseFloat(cashReceived) || 0;
  const change     = Math.max(0, cashNum - cartTotal);

  const saleMutation = useMutation({
    mutationFn: () =>
      api.post('/api/sales', {
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, discount: i.discount })),
        payments: [{ method: 'cash', amount: cartTotal }],
        discount,
      }),
    onSuccess: (res: any) => {
      setMessage({ type: 'success', text: `✅ Sale complete! Invoice: ${res.invoiceNo}` });
      clearCart();
      setPaying(false);
      setCashReceived('');
      setTimeout(() => setMessage(null), 4000);
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: `❌ ${err.message}` });
      setPaying(false);
    },
  });

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="app-layout" style={{ padding: 0 }}>
        <Topbar title="POS — Point of Sale  [F2: Search  F8: Pay  Esc: Cancel]" />

        {message && (
          <div style={{
            position: 'fixed', top: 16, right: 16, zIndex: 999,
            background: message.type === 'success' ? '#D1FAE5' : '#FEE2E2',
            color: message.type === 'success' ? '#065F46' : '#991B1B',
            padding: '12px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            {message.text}
          </div>
        )}

        <div className="pos-layout">
          {/* LEFT — Product Search */}
          <div className="pos-left">
            <div className="pos-search">
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search products by name or SKU... (F2)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </div>

            {search.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 60 }}>
                <Search style={{ width: 48, height: 48, display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Search for products</p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>Type a product name or scan a barcode</p>
              </div>
            ) : (
              <div className="product-grid">
                {(data?.products ?? []).map((product) =>
                  // Show first variant for each product in the grid
                  product.variants ? product.variants.map((v) => (
                    <div
                      key={v.id}
                      className="product-tile"
                      onClick={() => addItem({
                        variantId: v.id,
                        sku: v.sku,
                        productName: product.name,
                        unitPrice: v.salePrice,
                      })}
                    >
                      <div className="product-tile-name">{product.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{v.sku}</div>
                      <div className="product-tile-price">{fmt(v.salePrice)}</div>
                    </div>
                  )) : null
                )}
              </div>
            )}
          </div>

          {/* RIGHT — Cart */}
          <div className="pos-right">
            <div className="cart-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} />
              Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
            </div>

            <div className="cart-items">
              {items.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <ShoppingCart style={{ width: 32, height: 32, display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ fontSize: 13 }}>Cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.variantId} className="cart-item">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cart-item-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.productName}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.sku}</div>
                    </div>
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => updateQty(item.variantId, item.quantity - 1)}>
                        <Minus size={12} />
                      </button>
                      <span style={{ width: 28, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
                        {item.quantity}
                      </span>
                      <button className="qty-btn" onClick={() => updateQty(item.variantId, item.quantity + 1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="cart-item-price" style={{ width: 80, textAlign: 'right' }}>
                      {fmt(item.unitPrice * item.quantity)}
                    </div>
                    <button
                      onClick={() => removeItem(item.variantId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-row">
                <span className="text-muted">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="cart-row">
                <span className="text-muted">Discount</span>
                <span style={{ color: 'var(--danger)' }}>- {fmt(discount)}</span>
              </div>
              <div className="cart-row cart-total">
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{fmt(cartTotal)}</span>
              </div>

              {paying && (
                <div style={{ marginTop: 8, padding: '12px', background: 'var(--bg)', borderRadius: 6 }}>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Cash Received</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={String(cartTotal)}
                      autoFocus
                      style={{ fontSize: 18, fontWeight: 700, textAlign: 'right' }}
                    />
                  </div>
                  {cashNum >= cartTotal && (
                    <div className="cart-row" style={{ fontWeight: 700, color: 'var(--success)' }}>
                      <span>Change</span>
                      <span>{fmt(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {paying ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => { setPaying(false); setCashReceived(''); }}
                  >
                    Cancel (Esc)
                  </button>
                  <button
                    className="pay-btn"
                    style={{ flex: 2 }}
                    disabled={cashNum < cartTotal || saleMutation.isPending}
                    onClick={() => saleMutation.mutate()}
                  >
                    {saleMutation.isPending ? 'Processing...' : `Confirm — ${fmt(cartTotal)}`}
                  </button>
                </div>
              ) : (
                <button
                  className="pay-btn"
                  onClick={() => { if (items.length > 0) setPaying(true); }}
                  disabled={items.length === 0}
                >
                  Pay (F8) — {fmt(cartTotal)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
