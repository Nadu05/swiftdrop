'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ChevronRight,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Menu,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/api/use-auth';
import { notificationsApi, type NotificationItemDto } from '@/api/services/notifications.api';
import {
  getDashboardRouteForRole,
  normalizeRoleName,
  resolvePrimaryRole,
  ROLE_LABELS,
} from '@/lib/auth/role-resolver';

interface DashboardTopBarProps {
  portalLabel?: string;
  theme?: 'dark' | 'light';
  onMobileMenuToggle?: () => void;
}

const SEGMENT_LABELS: Record<string, string> = {
  customer: 'Customer',
  merchant: 'Merchant',
  courier: 'Courier',
  dispatcher: 'Dispatcher',
  branch: 'Branch Operations',
  admin: 'System Admin',
  organization: 'Organization',
  dashboard: 'Dashboard',
  bookings: 'My Bookings',
  book: 'Book Delivery',
  tracking: 'Track Parcel',
  profile: 'Profile',
  settings: 'Settings',
  account: 'Account',
  security: 'Security',
  users: 'Users',
  roles: 'Roles & Permissions',
  merchants: 'Merchant Approvals',
  branches: 'Branches',
  couriers: 'Couriers',
  requests: 'Parcel Requests',
  transfers: 'Inter-Branch Transfers',
  pickups: 'Pickups',
  deliveries: 'Deliveries',
  history: 'History',
  health: 'Service Health',
  'api-tester': 'API Diagnostics',
  customers: 'Customers',
};

export function DashboardTopBar({
  portalLabel,
  theme = 'dark',
  onMobileMenuToggle,
}: DashboardTopBarProps) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);
  const logoutMutation = useLogout();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const currentRole = resolvePrimaryRole(user, activeRole);
  const userRoles = (user?.roles || []).map(normalizeRoleName);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user notifications
  const {
    data: notifications = [],
    isError: notificationsUnavailable,
  } = useQuery<NotificationItemDto[]>({
    queryKey: ['notifications', 'me', user?.userId],
    queryFn: () => notificationsApi.getMyNotifications(),
    enabled: !!user?.userId,
    staleTime: 45_000,
    retry: false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number | string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] });
    },
  });

  const unreadNotifications = notifications.filter((n) => !n.readAt);

  // Compute breadcrumb trail
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const label =
      SEGMENT_LABELS[seg.toLowerCase()] ||
      (seg.length > 20 ? `${seg.slice(0, 8)}…` : seg.replace(/-/g, ' '));
    return { href, label, isLast: idx === segments.length - 1 };
  });

  const handleRoleSwitch = (newRole: string) => {
    if (setActiveRole(newRole)) {
      setProfileOpen(false);
      router.push(getDashboardRouteForRole(newRole));
    }
  };

  const isDark = theme === 'dark';

  return (
    <header className={`sd-topbar ${isDark ? 'sd-topbar--dark' : ''}`}>
      {/* Left: Mobile toggle + Breadcrumbs */}
      <div className="sd-topbar__left">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Toggle navigation menu"
            className="sd-topbar__menu-btn lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <nav aria-label="Breadcrumb" className="sd-topbar__breadcrumbs">
          <Link
            href={getDashboardRouteForRole(currentRole)}
            className="sd-topbar__crumb-root"
          >
            {portalLabel || ROLE_LABELS[currentRole] || 'Workspace'}
          </Link>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.href}>
              <span className="sd-topbar__crumb-sep">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              </span>
              {crumb.isLast ? (
                <span className="sd-topbar__crumb--active">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="sd-topbar__crumb"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Role Switcher (if multi-role), Notifications, User Menu */}
      <div className="sd-topbar__right">
        {/* Multi-Role Switcher */}
        {userRoles.length > 1 && (
          <div className="hidden md:flex items-center gap-1.5">
            <Layers className={`h-3.5 w-3.5 ${isDark ? 'text-sky-400' : 'text-blue-600'}`} />
            <select
              aria-label="Switch active role"
              value={currentRole}
              onChange={(e) => handleRoleSwitch(e.target.value)}
              className="sd-topbar__role-select"
            >
              {userRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] || role}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notification Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Notifications"
            className="sd-topbar__icon-btn"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications.length > 0 && (
              <span className="sd-topbar__badge-counter">
                {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="sd-topbar__dropdown w-80 sm:w-96">
              <div className="sd-topbar__dropdown-header flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">Notifications</h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {notificationsUnavailable
                      ? 'Notification service offline'
                      : `${unreadNotifications.length} unread alert(s)`}
                  </p>
                </div>
                <Link
                  href="/tracking"
                  onClick={() => setNotifOpen(false)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300 inline-flex items-center gap-1"
                >
                  Track Parcel
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                {notificationsUnavailable ? (
                  <div className="p-4 text-center text-xs text-amber-500">
                    Notification Service is currently unavailable. Live alerts will resume automatically when online.
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    No notifications yet. Delivery status updates will appear here.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((item) => {
                    const isUnread = !item.readAt;
                    return (
                      <div
                        key={item.id || item.notificationCode}
                        className={`p-3.5 text-xs flex items-start justify-between gap-2.5 ${
                          isUnread
                            ? isDark
                              ? 'bg-blue-500/10'
                              : 'bg-blue-50/60'
                            : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{item.title}</div>
                          <p className="text-[11px] mt-0.5 line-clamp-2 text-slate-600 dark:text-slate-300">
                            {item.message}
                          </p>
                          <div className="text-[10px] mt-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            {item.trackingNumber && (
                              <span className="font-mono text-blue-600 dark:text-sky-400">{item.trackingNumber}</span>
                            )}
                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() =>
                              markReadMutation.mutate(item.notificationCode || item.id)
                            }
                            title="Mark as read"
                            className="p-1 rounded text-blue-600 dark:text-sky-400 hover:bg-blue-500/10 shrink-0 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        {user ? (
          <div className="sd-topbar__profile-wrapper" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="sd-topbar__profile-btn"
            >
              <div className="sd-topbar__avatar">
                {user.fullName
                  ? user.fullName
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'SD'}
              </div>
              <div className="hidden sm:block sd-topbar__user-meta">
                <div className="sd-topbar__user-name">
                  {user.fullName}
                </div>
                <div className="sd-topbar__user-role">
                  {ROLE_LABELS[currentRole] || currentRole}
                </div>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              />
            </button>

            {profileOpen && (
              <div className="sd-topbar__dropdown">
                <div className="sd-topbar__dropdown-header">
                  <div className="sd-topbar__dropdown-name">{user.fullName}</div>
                  <div className="sd-topbar__dropdown-email">{user.email}</div>
                  <div className="sd-topbar__dropdown-roles">
                    {userRoles.map((r) => (
                      <span key={r} className="sd-topbar__role-tag">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        {ROLE_LABELS[r] || r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="sd-topbar__dropdown-menu">
                  <Link
                    href={getDashboardRouteForRole(currentRole)}
                    onClick={() => setProfileOpen(false)}
                    className="sd-topbar__dropdown-item"
                  >
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-sky-400" />
                    <span>My Role Dashboard</span>
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="sd-topbar__dropdown-item"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/settings/account"
                    onClick={() => setProfileOpen(false)}
                    className="sd-topbar__dropdown-item"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Account Settings</span>
                  </Link>
                  <Link
                    href="/settings/security"
                    onClick={() => setProfileOpen(false)}
                    className="sd-topbar__dropdown-item"
                  >
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    <span>Security &amp; Password</span>
                  </Link>
                </div>

                <div className="sd-topbar__dropdown-divider" />

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logoutMutation.mutate();
                  }}
                  disabled={logoutMutation.isPending}
                  className="sd-topbar__signout-btn"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
export default DashboardTopBar;
