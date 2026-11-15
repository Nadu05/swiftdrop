'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Terminal,
  Box,
  Server,
  Layers,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Settings,
  KeyRound,
  Users,
  Target,
  Building2,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentUser, useLogout } from '@/hooks/api/use-auth';
import {
  getDashboardRouteForRole,
  normalizeRoleName,
  resolvePrimaryRole,
} from '@/lib/auth/role-resolver';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const adminNavItems = [
  { name: 'Organization Admin Dashboard', href: '/organization', icon: LayoutDashboard },
  { name: 'Branch Network', href: '/organization/branches', icon: Building2 },
  { name: 'Merchant Approvals', href: '/organization/merchants', icon: Server },
  { name: 'Staff Management', href: '/organization/staff', icon: Users },
  { name: 'Customer Directory', href: '/customers', icon: Target },
  { name: 'Service Health', href: '/health', icon: Activity },
  { name: 'API Diagnostics', href: '/api-tester', icon: Terminal },
];

const accountNavItems = [
  { name: 'My Profile', href: '/profile', icon: UserIcon },
  { name: 'Account Settings', href: '/settings/account', icon: Settings },
  { name: 'Security & Password', href: '/settings/security', icon: KeyRound },
];

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname() || '';
  useCurrentUser();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const logoutMutation = useLogout();

  const userRoles = (user?.roles || []).map(normalizeRoleName);
  const isAdmin =
    userRoles.includes('ADMIN') ||
    userRoles.includes('HEAD_OFFICE_ADMIN') ||
    userRoles.includes('SYSTEM_ADMIN');
  const primaryRole = resolvePrimaryRole(user, activeRole);
  const roleDashboardHref = getDashboardRouteForRole(primaryRole);

  const sidebarContent = (
    <aside
      style={{
        width: '264px',
        minWidth: '264px',
        background: 'rgba(11, 17, 33, 0.98)',
        borderRight: '1px solid rgba(59, 130, 246, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        gap: '1.5rem',
        minHeight: '100vh',
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
        <Link
          href={roleDashboardHref}
          onClick={onCloseMobile}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)',
            }}
          >
            <Box size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>
              Swift<span style={{ color: '#38bdf8' }}>Drop</span>
            </h1>
            <p style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, margin: 0 }}>
              {isAdmin ? 'System Administration' : 'Account Center'}
            </p>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {!isAdmin && user && (
          <>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem 0.4rem' }}>
              Workspace
            </div>
            <Link
              href={roleDashboardHref}
              onClick={onCloseMobile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#ffffff',
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)',
                borderLeft: '3px solid #3b82f6',
                textDecoration: 'none',
              }}
            >
              <LayoutDashboard size={18} color="#60a5fa" />
              <span>Return to My Dashboard</span>
            </Link>
          </>
        )}

        {isAdmin && (
          <>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem 0.4rem' }}>
              System Administration
            </div>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/organization' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : '#94a3b8',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.22) 0%, rgba(59, 130, 246, 0.05) 100%)'
                      : 'transparent',
                    borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={18} color={isActive ? '#38bdf8' : '#64748b'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </>
        )}

        {user && (
          <>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.8rem 0.5rem 0.4rem' }}>
              Account &amp; Security
            </div>
            {accountNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
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
          </>
        )}
      </nav>

      {/* User Session / Auth Widget */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {user ? (
          <div
            style={{
              padding: '0.85rem',
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <Link
              href="/profile"
              onClick={onCloseMobile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                textDecoration: 'none',
                padding: '0.2rem',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  flexShrink: 0,
                }}
              >
                <UserIcon size={16} color="#60a5fa" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.email}
                </div>
              </div>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              {userRoles.map((role) => (
                <span
                  key={role}
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.45rem',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    borderRadius: '4px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <ShieldCheck size={10} />
                  {role}
                </span>
              ))}
            </div>

            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              style={{
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} />
              <span>{logoutMutation.isPending ? 'Logging out...' : 'Sign out'}</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Link
              href="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.55rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{sidebarContent}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
