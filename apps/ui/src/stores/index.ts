'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  fullName: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('token', token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null });
      },
    }),
    { name: 'auth-store' }
  )
);

// ── Cart store for POS ──────────────────────────────────────
export interface CartItem {
  variantId: number;
  sku: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  customerId: number | null;
  addItem: (item: Omit<CartItem, 'quantity' | 'discount'>) => void;
  updateQty: (variantId: number, qty: number) => void;
  removeItem: (variantId: number) => void;
  setDiscount: (discount: number) => void;
  setCustomer: (id: number | null) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  discount: 0,
  customerId: null,
  addItem: (newItem) =>
    set((state) => {
      const existing = state.items.find((i) => i.variantId === newItem.variantId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === newItem.variantId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...newItem, quantity: 1, discount: 0 }] };
    }),
  updateQty: (variantId, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((i) => i.variantId !== variantId)
          : state.items.map((i) => (i.variantId === variantId ? { ...i, quantity: qty } : i)),
    })),
  removeItem: (variantId) =>
    set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
  setDiscount: (discount) => set({ discount }),
  setCustomer: (customerId) => set({ customerId }),
  clearCart: () => set({ items: [], discount: 0, customerId: null }),
}));
