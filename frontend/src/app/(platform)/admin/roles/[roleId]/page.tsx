'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminGuard from '@/components/auth/AdminGuard';
import { useAdminRole, useRoleUsers } from '@/hooks/api/use-admin';
import { getApiErrorMessage } from '@/api/services/auth.api';
import {
  Layers,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

function RoleUsersView() {
  const params = useParams();
  const roleId = Number(params?.roleId);

  const [page, setPage] = useState(0);
  const pageSize = 15;

  const { data: role, isLoading: isRoleLoading, error: roleError } = useAdminRole(roleId);
  const { data: pageData, isLoading: isUsersLoading, error: usersError } = useRoleUsers(roleId, page, pageSize);

  if (isRoleLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} color="#3b82f6" className="animate-spin" />
      </div>
    );
  }

  if (roleError || !role) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
        <p style={{ color: '#f87171' }}>{getApiErrorMessage(roleError) || 'Role not found'}</p>
        <Link href="/admin/roles" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', marginTop: '1rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} />
          <span>Back to Roles</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Back Link */}
      <div>
        <Link
          href="/admin/roles"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#60a5fa',
            fontSize: '0.85rem',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Platform Roles</span>
        </Link>
      </div>

      {/* Role Summary Banner */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                padding: '0.25rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {role.roleName}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>ID: #{role.roleId}</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            {role.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
          <Users size={18} color="#60a5fa" />
          <span>
            <strong style={{ color: '#f8fafc', fontSize: '1.1rem' }}>{role.userCount}</strong> assigned users
          </span>
        </div>
      </div>

      {/* Assigned Users Table */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.1)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            Assigned Users
          </h2>
        </div>

        {isUsersLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <Loader2 size={28} color="#3b82f6" className="animate-spin" />
          </div>
        ) : usersError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
            {getApiErrorMessage(usersError)}
          </div>
        ) : pageData?.content.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No users are currently assigned to this role.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)', background: 'rgba(15, 23, 42, 0.6)' }}>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>All Roles</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData?.content.map((user) => (
                  <tr key={user.userId} style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.08)' }}>
                    <td style={tdStyle}>
                      <Link
                        href={`/admin/users/${user.userId}`}
                        style={{ fontWeight: 600, color: '#f8fafc', textDecoration: 'none' }}
                      >
                        {user.fullName}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: user.phone ? '#cbd5e1' : '#64748b' }}>{user.phone || '—'}</span>
                    </td>
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
                              background: r === role.roleName ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                              color: r === role.roleName ? '#60a5fa' : '#94a3b8',
                              border: `1px solid ${r === role.roleName ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                            }}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
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
                        }}
                      >
                        {user.accountStatus}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <Link
                        href={`/admin/users/${user.userId}`}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          color: '#60a5fa',
                          textDecoration: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        View User
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
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
                onClick={() => setPage((p) => p - 1)}
                style={pageBtnStyle(pageData.pageNumber === 0)}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1', padding: '0 0.5rem' }}>
                Page {pageData.pageNumber + 1} of {pageData.totalPages}
              </span>
              <button
                disabled={pageData.last || pageData.pageNumber + 1 >= pageData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={pageBtnStyle(pageData.last || pageData.pageNumber + 1 >= pageData.totalPages)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoleUsersPage() {
  return (
    <AdminGuard>
      <RoleUsersView />
    </AdminGuard>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

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
