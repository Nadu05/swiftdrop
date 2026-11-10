'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Activity, 
  Terminal, 
  GitBranch, 
  Box, 
  Server,
  Layers,
  PlusCircle,
  Clock,
  Compass
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Track Parcel', href: '/tracking', icon: Compass },
  { name: 'Book Delivery', href: '/book', icon: PlusCircle },
  { name: 'My Deliveries', href: '/bookings', icon: Clock },
  { name: 'Service Health', href: '/health', icon: Activity },
  { name: 'API Tester', href: '/api-tester', icon: Terminal },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: '260px',
      background: 'rgba(11, 17, 33, 0.95)',
      borderRight: '1px solid rgba(59, 130, 246, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      gap: '2rem'
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)'
        }}>
          <Box size={20} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Swift<span style={{ color: '#60a5fa' }}>Drop</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>Microservices Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem 0.4rem' }}>
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)' : 'transparent',
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

      {/* Infrastructure Status Summary */}
      <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Architecture</span>
          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>5 + 1 SERVICES</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.72rem', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Server size={12} color="#3b82f6" />
            <span>Spring Cloud Gateway (8080)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={12} color="#10b981" />
            <span>5x PostgreSQL + RabbitMQ</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
