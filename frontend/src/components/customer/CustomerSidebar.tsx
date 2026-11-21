'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  PlusCircle,
  Package,
  Compass,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  Home,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentUser, useLogout } from '@/hooks/api/use-auth';
import { getDashboardRouteForRole, resolvePrimaryRole } from '@/lib/auth/role-resolver';

const customerNavItems = [
  { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutGrid },
  { name: 'Create Delivery', href: '/book', icon: PlusCircle },
  { name: 'My Deliveries', href: '/bookings', icon: Package },
  { name: 'Track Parcel', href: '/tracking', icon: Compass },
  { name: 'My Profile', href: '/customer/profile', icon: User },
];

export default function CustomerSidebar() {
  const pathname = usePathname() || '';
  useCurrentUser();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryRole = resolvePrimaryRole(user, activeRole);
  const dashboardHref = user ? getDashboardRouteForRole(primaryRole) : '/';

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

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'NP';

  const NavContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', justifyContent: 'space-between' }}>
      <div>
        {/* Brand Header matching Screenshot */}
        <div style={{ padding: '0 0.5rem 2rem 0.5rem' }}>
          <Link href={dashboardHref} style={{ textDecoration: 'none' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              {/* Isometric 3D Cube Icon in pure white */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                SwiftDrop
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {user ? (
            customerNavItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);
              const isBookingAction = item.href === '/book';
              const targetHref =
                item.href === '/customer/dashboard' ? dashboardHref : item.href;

              return (
                <Link
                  key={item.name}
                  href={targetHref}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.95rem',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 500,
                    color: active ? '#ffffff' : '#8fa0be',
                    background: active ? '#1d68f2' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <Icon
                      size={18}
                      color={active ? '#ffffff' : '#6b7f9e'}
                      style={{ flexShrink: 0 }}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isBookingAction && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                      }}
                    >
                      New
                    </span>
                  )}
                </Link>
              );
            })
          ) : (
            <>
              <Link
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.7rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#8fa0be',
                  textDecoration: 'none',
                }}
              >
                <Home size={18} color="#6b7f9e" />
                <span>Landing Page</span>
              </Link>
              <Link
                href="/tracking"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.7rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: '#1d68f2',
                  textDecoration: 'none',
                }}
              >
                <Compass size={18} color="#ffffff" />
                <span>Track Parcel</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Customer Account / Footer Section matching Screenshot */}
      <div
        style={{
          marginTop: 'auto',
          padding: '1rem 0 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {user ? (
          <>
            <Link
              href="/customer/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '6px',
                  background: '#2563eb',
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
                  {user.fullName || 'Nimal Perera (Custo...'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Role, CUSTOMER
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              <LogOut size={14} />
              <span>{logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}</span>
            </button>
          </>
        ) : (
          <Link
            href="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              padding: '0.6rem',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
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
            <div style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
              Customer Portal
            </div>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="customer-drawer-backdrop"
        />
      )}

      <aside
        className={`customer-sidebar-root ${mobileOpen ? 'open' : ''}`}
        style={{
          width: '240px',
          minWidth: '240px',
          background: '#0b1329',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '1.5rem 1rem 1.5rem 1rem',
          position: 'relative',
        }}
      >
        {NavContent}

        {/* Edge Collapse Button matching Screenshot */}
        <button
          type="button"
          aria-label="Collapse Sidebar"
          style={{
            position: 'absolute',
            right: '-14px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#0b1329',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
            zIndex: 30,
          }}
        >
          <ChevronLeft size={16} />
        </button>
      </aside>

      <style jsx global>{`
        .customer-mobile-topbar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          background: #0b1329;
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
