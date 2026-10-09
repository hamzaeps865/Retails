'use client';
import { Bell, User } from 'lucide-react';
import { useAuthStore } from '@/stores';

export default function Topbar({ title }: { title: string }) {
  const { user } = useAuthStore();
  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Bell size={18} color="#64748B" style={{ cursor: 'pointer' }} />
        <div className="topbar-user">
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
          }}>
            {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span>{user?.fullName ?? ''}</span>
        </div>
      </div>
    </div>
  );
}
