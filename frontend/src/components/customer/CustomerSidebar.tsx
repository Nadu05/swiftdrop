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
  ChevronRight,
  LogOut,
  LogIn,
  Home,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentUser, useLogout } from '@/hooks/api/use-auth';
import { getDashboardRouteForRole, resolvePrimaryRole } from '@/lib/auth/role-resolver';

const customerNavItems = [
  { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard },
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
    : 'SD';

  const NavContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', justifyContent: 'space-between' }}>
      <div>
        {/* Brand Header */}
        <div style={{ padding: '0 0.5rem 1.25rem 0.5rem' }}>
          <Link href={dashboardHref} style={{ textDecoration: 'none' }}>
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
              Swift<span style={{ color: '#38bdf8' }}>Drop</span>
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
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
            {user ? `${primaryRole} PORTAL` : 'PUBLIC TRACKING'}
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.75rem' }}>
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
                    border:
                      isBookingAction && !active
                        ? '1px dashed rgba(56, 189, 248, 0.25)'
                        : '1px solid transparent',
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
                  borderRadius: '9px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#8da2be',
                  textDecoration: 'none',
                }}
              >
                <Home size={17} color="#6b7f9e" />
                <span>Landing Page</span>
              </Link>
              <Link
                href="/tracking"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.7rem 0.95rem',
                  borderRadius: '9px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: '#1d3c6e',
                  textDecoration: 'none',
                }}
              >
                <Compass size={17} color="#38bdf8" />
                <span>Track Parcel</span>
              </Link>
            </>
          )}
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
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                textDecoration: 'none',
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
                  {user.fullName}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Role: {primaryRole}
                </div>
              </div>
              <ChevronRight size={14} color="#64748b" />
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
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
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
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
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
          background: '#0c1829',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '1.75rem 1rem 1.5rem 1rem',
        }}
      >
        {NavContent}
      </aside>

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
