'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AdminGuard from '@/components/auth/AdminGuard';
import {
  useAdminUsers,
  useCreateAdminUser,
  useSuspendUser,
  useActivateUser,
} from '@/hooks/api/use-admin';
import { adminCreateUserSchema, type AdminCreateUserFormValues } from '@/schema/admin.schema';
import { getApiErrorMessage } from '@/api/services/auth.api';
import type { AdminUser, UserFilterParams } from '@/types/admin.types';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Eye,
  Check,
  AlertTriangle,
} from 'lucide-react';

const CANONICAL_ROLES = ['CUSTOMER', 'MERCHANT', 'COURIER', 'DISPATCHER', 'ADMIN'] as const;
const STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING_VERIFICATION'] as const;

function UserManagementView() {
  const [params, setParams] = useState<UserFilterParams>({
    page: 0,
    size: 15,
    search: '',
    role: '',
    status: '',
  });

  const [searchInput, setSearchInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ user: AdminUser; action: 'suspend' | 'activate' } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: pageData, isLoading, error: fetchError } = useAdminUsers(params);
  const createMutation = useCreateAdminUser();
  const suspendMutation = useSuspendUser();
  const activateMutation = useActivateUser();

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<AdminCreateUserFormValues>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      roles: ['CUSTOMER'],
      accountStatus: 'ACTIVE',
      emailVerified: false,
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((prev) => ({ ...prev, search: searchInput.trim(), page: 0 }));
  };

  const handleRoleFilter = (role: string) => {
    setParams((prev) => ({ ...prev, role, page: 0 }));
  };

  const handleStatusFilter = (status: string) => {
    setParams((prev) => ({ ...prev, status, page: 0 }));
  };

  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({ ...prev, page: newPage }));
  };

  const onSubmitCreate = async (values: AdminCreateUserFormValues) => {
    setNotification(null);
    try {
      await createMutation.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        roles: values.roles,
        accountStatus: values.accountStatus,
        emailVerified: values.emailVerified,
      });
      setNotification({ type: 'success', text: `User ${values.email} created successfully.` });
      resetCreate();
      setShowCreateModal(false);
    } catch (err) {
      setNotification({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    setNotification(null);
    try {
      if (actionTarget.action === 'suspend') {
        await suspendMutation.mutateAsync(actionTarget.user.userId);
        setNotification({ type: 'success', text: `User ${actionTarget.user.email} suspended.` });
      } else {
        await activateMutation.mutateAsync(actionTarget.user.userId);
        setNotification({ type: 'success', text: `User ${actionTarget.user.email} activated.` });
      }
      setActionTarget(null);
    } catch (err) {
      setNotification({ type: 'error', text: getApiErrorMessage(err) });
      setActionTarget(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            User Administration
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Search, inspect, provision, and govern SwiftDrop user identities and role assignments
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <UserPlus size={16} />
          <span>Create User</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: notification.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '14px',
          padding: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, or phone..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Search size={16} color="#64748b" />
            </div>
          </div>
          <button
            type="submit"
            style={{
              padding: '0.6rem 1rem',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '8px',
              color: '#60a5fa',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Search
          </button>
        </form>

        {/* Dropdowns */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Role Filter */}
          <select
            value={params.role || ''}
            onChange={(e) => handleRoleFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Roles</option>
            {CANONICAL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={params.status || ''}
            onChange={(e) => handleStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
            <Loader2 size={32} color="#3b82f6" className="animate-spin" />
          </div>
        ) : fetchError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
            {getApiErrorMessage(fetchError)}
          </div>
        ) : pageData?.content.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
            <Users size={40} color="#64748b" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>No users found</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try clearing filters or adjusting your search term.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)', background: 'rgba(15, 23, 42, 0.6)' }}>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Roles</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Registered</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData?.content.map((user) => (
                  <tr
                    key={user.userId}
                    style={{
                      borderBottom: '1px solid rgba(59, 130, 246, 0.08)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* User */}
                    <td style={tdStyle}>
                      <div>
                        <Link
                          href={`/admin/users/${user.userId}`}
                          style={{ fontWeight: 600, color: '#f8fafc', textDecoration: 'none' }}
                        >
                          {user.fullName}
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email}</div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td style={tdStyle}>
                      <span style={{ color: user.phone ? '#cbd5e1' : '#64748b' }}>
                        {user.phone || '—'}
                      </span>
                    </td>

                    {/* Roles */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {user.roles?.map((r) => (
                          <span
                            key={r}
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontWeight: 700,
                          background:
                            user.accountStatus === 'ACTIVE'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color: user.accountStatus === 'ACTIVE' ? '#10b981' : '#f87171',
                          border: `1px solid ${user.accountStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        }}
                      >
                        {user.accountStatus}
                      </span>
                    </td>

                    {/* Created */}
                    <td style={tdStyle}>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Link
                          href={`/admin/users/${user.userId}`}
                          style={{
                            padding: '0.35rem 0.7rem',
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '6px',
                            color: '#60a5fa',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          View
                        </Link>

                        {user.accountStatus === 'ACTIVE' ? (
                          <button
                            onClick={() => setActionTarget({ user, action: 'suspend' })}
                            style={{
                              padding: '0.35rem 0.7rem',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              color: '#f87171',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => setActionTarget({ user, action: 'activate' })}
                            style={{
                              padding: '0.35rem 0.7rem',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '6px',
                              color: '#34d399',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {pageData && pageData.totalPages > 1 && (
          <div
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(59, 130, 246, 0.1)',
              background: 'rgba(15, 23, 42, 0.4)',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Showing {pageData.pageNumber * pageData.pageSize + 1}–
              {Math.min((pageData.pageNumber + 1) * pageData.pageSize, pageData.totalElements)} of{' '}
              {pageData.totalElements} users
            </span>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                disabled={pageData.pageNumber === 0}
                onClick={() => handlePageChange(pageData.pageNumber - 1)}
                style={pageBtnStyle(pageData.pageNumber === 0)}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1', padding: '0 0.5rem' }}>
                Page {pageData.pageNumber + 1} of {pageData.totalPages}
              </span>
              <button
                disabled={pageData.last || pageData.pageNumber + 1 >= pageData.totalPages}
                onClick={() => handlePageChange(pageData.pageNumber + 1)}
                style={pageBtnStyle(pageData.last || pageData.pageNumber + 1 >= pageData.totalPages)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {actionTarget && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: actionTarget.action === 'suspend' ? '#f87171' : '#34d399' }}>
              <AlertTriangle size={22} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Confirm {actionTarget.action === 'suspend' ? 'Account Suspension' : 'Account Activation'}
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              Are you sure you want to {actionTarget.action} user <strong style={{ color: '#fff' }}>{actionTarget.user.email}</strong>?
              {actionTarget.action === 'suspend' &&
                ' This will immediately invalidate their active refresh sessions and prevent future authentication.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => setActionTarget(null)} style={cancelBtnStyle}>
                Cancel
              </button>
              <button
                onClick={confirmAction}
                style={{
                  padding: '0.55rem 1.25rem',
                  background: actionTarget.action === 'suspend' ? '#dc2626' : '#059669',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm {actionTarget.action === 'suspend' ? 'Suspension' : 'Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#60a5fa' }}>
                <UserPlus size={20} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  Create Authorized User
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit(onSubmitCreate)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              {/* Full Name */}
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  {...registerCreate('fullName')}
                  placeholder="e.g. Jane Doe"
                  style={inputStyle(!!createErrors.fullName)}
                />
                {createErrors.fullName && <p style={errorStyle}>{createErrors.fullName.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input
                  type="email"
                  {...registerCreate('email')}
                  placeholder="jane.doe@example.com"
                  style={inputStyle(!!createErrors.email)}
                />
                {createErrors.email && <p style={errorStyle}>{createErrors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>Initial Password *</label>
                <input
                  type="password"
                  {...registerCreate('password')}
                  placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 special"
                  style={inputStyle(!!createErrors.password)}
                />
                {createErrors.password && <p style={errorStyle}>{createErrors.password.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>Phone Number (Optional)</label>
                <input
                  type="tel"
                  {...registerCreate('phone')}
                  placeholder="+1234567890"
                  style={inputStyle(!!createErrors.phone)}
                />
                {createErrors.phone && <p style={errorStyle}>{createErrors.phone.message}</p>}
              </div>

              {/* Role Selection */}
              <div>
                <label style={labelStyle}>Role Assignment *</label>
                <select
                  multiple
                  {...registerCreate('roles')}
                  style={{
                    ...inputStyle(!!createErrors.roles),
                    height: '100px',
                    padding: '0.5rem',
                  }}
                >
                  {CANONICAL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                  Hold Ctrl/Cmd to select multiple roles.
                </span>
                {createErrors.roles && <p style={errorStyle}>{createErrors.roles.message}</p>}
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Initial Account Status</label>
                <select {...registerCreate('accountStatus')} style={inputStyle(false)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              {/* Verified Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="emailVerified"
                  {...registerCreate('emailVerified')}
                  style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                />
                <label htmlFor="emailVerified" style={{ fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  Mark email as pre-verified
                </label>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={cancelBtnStyle}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: isCreating ? 'rgba(59, 130, 246, 0.4)' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isCreating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <UserManagementView />
    </AdminGuard>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem',
  background: 'rgba(15, 23, 42, 0.7)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '0.85rem',
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.9rem 1rem',
  verticalAlign: 'middle',
};

const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(15, 23, 42, 0.7)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: '6px',
  color: disabled ? '#475569' : '#cbd5e1',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#cbd5e1',
  marginBottom: '0.35rem',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.6rem 0.85rem',
  background: 'rgba(15, 23, 42, 0.9)',
  border: `1px solid ${hasError ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.25)'}`,
  borderRadius: '8px',
  color: '#fff',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box',
});

const errorStyle: React.CSSProperties = {
  marginTop: '0.25rem',
  fontSize: '0.72rem',
  color: '#f87171',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: '1rem',
};

const modalContentStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '460px',
  background: '#111827',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '16px',
  padding: '1.75rem',
  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.55rem 1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#cbd5e1',
  fontSize: '0.85rem',
  cursor: 'pointer',
};
