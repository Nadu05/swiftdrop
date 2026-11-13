'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  ArrowDownRight,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Target,
  Columns,
  Settings,
} from 'lucide-react';

/**
 * SwiftDrop Navigation Sidebar
 * 
 * Accurately reproduces the visual design reference screenshot.
 * The "Customers" tab opens the complete Member 06 Customer Portal (/customer/dashboard).
 */
const navItems = [
  { name: 'Overview', href: '/', icon: LayoutGrid },
  { name: 'Incoming requests', href: '#', icon: ArrowDownRight },
  { name: 'Order management', href: '#', icon: Calendar },
  { name: 'Courier assignment', href: '#', icon: ArrowUpRight },
  { name: 'Couriers', href: '#', icon: Sparkles },
  { name: 'Customers', href: '/customers', icon: Target },
  { name: 'Reports', href: '#', icon: Columns },
  { name: 'Settings', href: '#', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Helper to determine if a route is currently active
  const isItemActive = (href: string) => {
    if (href === '/customers') {
      return pathname === '/customers' || pathname.startsWith('/customers/');
    }
    if (href === '/') {
      return pathname === '/';
    }
    return false;
  };

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        background: '#0c1829',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.75rem 1rem 1.5rem 1rem',
        minHeight: '100vh',
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '0 0.5rem 1.25rem 0.5rem' }}>
        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          SwiftDrop
        </h1>
        <div
          style={{
            fontSize: '0.625rem',
            fontWeight: 700,
            color: '#7088a8',
            letterSpacing: '0.08em',
            marginTop: '4px',
            textTransform: 'uppercase',
          }}
        >
          BRANCH OPERATIONS
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.65rem 0.95rem',
                borderRadius: '9px',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 500,
                color: active ? '#ffffff' : '#8da2be',
                background: active ? '#1d3c6e' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              <Icon
                size={17}
                color={active ? '#38bdf8' : '#6b7f9e'}
                style={{ flexShrink: 0 }}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Branch Identifier */}
      <div
        style={{
          marginTop: 'auto',
          padding: '1rem 0.5rem 0 0.5rem',
          fontSize: '0.75rem',
          color: '#627d98',
        }}
      >
        Branch: Colombo Central
      </div>
    </aside>
  );
}
