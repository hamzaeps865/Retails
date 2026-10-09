'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse,
  Users, BarChart3, Settings, LogOut, ShoppingBag, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores';

const NAV = [
  {
    group: 'Main',
    links: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/pos',       icon: ShoppingCart,    label: 'POS / Billing' },
    ],
  },
  {
    group: 'Stock',
    links: [
      { href: '/products',  icon: Package,        label: 'Products' },
      { href: '/inventory', icon: Warehouse,       label: 'Inventory' },
      { href: '/purchases', icon: ShoppingBag,    label: 'Purchases' },
    ],
  },
  {
    group: 'People',
    links: [
      { href: '/customers', icon: Users,          label: 'Customers' },
    ],
  },
  {
    group: 'Analytics',
    links: [
      { href: '/reports',   icon: BarChart3,      label: 'Reports' },
    ],
  },
  {
    group: 'System',
    links: [
      { href: '/settings',  icon: Settings,       label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>🛍️ Retail Manager</h1>
        <p>{user?.fullName ?? 'Loading...'}</p>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="nav-group-label">{group.group}</div>
            {group.links.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${pathname.startsWith(href) ? 'active' : ''}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="nav-link" onClick={logout} style={{ width: '100%' }}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
