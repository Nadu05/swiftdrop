'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, History, LayoutDashboard, Navigation, Package, User, Wallet, Layers } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/courier', icon: LayoutDashboard },
  { name: 'Active Delivery', href: '/courier/active', icon: Navigation },
  { name: 'My Deliveries', href: '/courier/deliveries', icon: Package },
  { name: 'Job History', href: '/courier/history', icon: History },
  { name: 'Earnings', href: '/courier/earnings', icon: Wallet },
  { name: 'My Profile', href: '/courier/profile', icon: User },
];

/**
 * Courier portal navigation. Same look as the shared platform Sidebar
 * (components/Sidebar.tsx) so the courier area matches the rest of the app.
 */
export default function CourierSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '260px',
        flexShrink: 0,
        background: 'rgba(11, 17, 33, 0.95)',
        borderRight: '1px solid rgba(59, 130, 246, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        gap: '2rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)',
          }}
        >
          <Box size={20} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Swift<span style={{ color: '#60a5fa' }}>Drop</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>Courier Portal</p>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }} aria-label="Courier navigation">
        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0 0.5rem 0.4rem',
          }}
        >
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/courier' ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)'
                  : 'transparent',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={18} color={isActive ? '#60a5fa' : '#64748b'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          fontSize: '0.8rem',
          color: '#94a3b8',
          textDecoration: 'none',
        }}
      >
        <Layers size={14} color="#3b82f6" />
        Platform Overview
      </Link>
    </aside>
  );
}
