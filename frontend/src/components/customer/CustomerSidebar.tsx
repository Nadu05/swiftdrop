'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Compass,
  User,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { getCurrentUserProfile } from '@/api/services/auth.api';
import type { UserProfile } from '@/types/auth.types';

const customerNavItems = [
  { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard },
  { name: 'Create Delivery', href: '/book', icon: PlusCircle },
  { name: 'My Deliveries', href: '/bookings', icon: Package },
  { name: 'Track Parcel', href: '/tracking', icon: Compass },
  { name: 'My Profile', href: '/customer/profile', icon: User },
];

export default function CustomerSidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    getCurrentUserProfile()
      .then((p) => setProfile(p))
      .catch(() => null);
  }, [pathname]);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isItemActive = (href: string) => {
    if (href === '/customer/dashboard') {
      return pathname === '/customer/dashboard' || pathname === '/customer';
    }
    if (href === '/book') {
      return pathname.startsWith('/book');
    }
    if (href === '/bookings') {
      return pathname.startsWith('/bookings');
    }
    if (href === '/tracking') {
      return pathname.startsWith('/tracking');
    }
    if (href === '/customer/profile') {
      return pathname === '/customer/profile';
    }
    return false;
  };

  // User initials for avatar
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CU';

  const NavContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', justifyContent: 'space-between' }}>
      <div>
        {/* Brand Header */}
        <div style={{ padding: '0 0.5rem 1.25rem 0.5rem' }}>
          <Link href="/customer/dashboard" style={{ textDecoration: 'none' }}>
            <h1
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              SwiftDrop
            </h1>
          </Link>
          <div
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              color: '#38bdf8',
              letterSpacing: '0.08em',
              marginTop: '5px',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
            CUSTOMER PORTAL
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.75rem' }}>
          {customerNavItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);
            const isBookingAction = item.href === '/book';

            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 0.95rem',
                  borderRadius: '9px',
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#ffffff' : '#8da2be',
                  background: active
                    ? '#1d3c6e'
                    : isBookingAction
                    ? 'rgba(56, 189, 248, 0.05)'
                    : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  border: isBookingAction && !active ? '1px dashed rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Icon
                    size={17}
                    color={active ? '#38bdf8' : isBookingAction ? '#38bdf8' : '#6b7f9e'}
                    style={{ flexShrink: 0 }}
                  />
                  <span>{item.name}</span>
                </div>
                {isBookingAction && !active && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    New
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Customer Account / Footer Section */}
      <div
        style={{
          marginTop: 'auto',
          padding: '1rem 0 0 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        {/* Customer Profile Card */}
        <Link
          href="/customer/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            textDecoration: 'none',
            transition: 'background 0.15s ease',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {profile?.name || 'Customer'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Role: CUSTOMER</div>
          </div>
          <ChevronRight size={14} color="#64748b" />
        </Link>

        {/* Direct Access Mode Indicator */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              fontSize: '0.74rem',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              padding: '0.5rem 0.65rem',
              borderRadius: '8px',
              fontWeight: 600,
              userSelect: 'none',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)',
                display: 'inline-block',
              }}
            />
            Direct Access Active
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navigation Bar (Screen width < 768px) */}
      <div className="customer-mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation Menu"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>SwiftDrop</div>
            <div style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>Customer Portal</div>
          </div>
        </div>

        <Link
          href="/customer/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '0.35rem 0.65rem',
            borderRadius: '999px',
            textDecoration: 'none',
            fontSize: '0.75rem',
            color: '#38bdf8',
            fontWeight: 600,
          }}
        >
          <User size={13} />
          <span>{profile?.name ? profile.name.split(' ')[0] : 'Customer'}</span>
        </Link>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="customer-drawer-backdrop"
        />
      )}

      {/* Sidebar: Desktop fixed / Mobile off-canvas drawer */}
      <aside
        className={`customer-sidebar-root ${mobileOpen ? 'open' : ''}`}
        style={{
          width: '240px',
          minWidth: '240px',
          background: '#0c1829',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '1.75rem 1rem 1.5rem 1rem',
        }}
      >
        {NavContent}
      </aside>

      {/* Responsive Styles */}
      <style jsx global>{`
        .customer-mobile-topbar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          background: #0c1829;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        @media (max-width: 768px) {
          .customer-mobile-topbar {
            display: flex;
          }

          .customer-sidebar-root {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 100;
            transform: translateX(-100%);
            transition: transform 0.25s ease-in-out;
            box-shadow: 0 0 24px rgba(0, 0, 0, 0.6);
          }

          .customer-sidebar-root.open {
            transform: translateX(0);
          }

          .customer-drawer-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(2px);
            z-index: 90;
          }
        }
      `}</style>
    </>
  );
}

