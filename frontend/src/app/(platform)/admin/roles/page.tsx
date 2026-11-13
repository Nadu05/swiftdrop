'use client';

import Link from 'next/link';
import AdminGuard from '@/components/auth/AdminGuard';
import { useAdminRoles } from '@/hooks/api/use-admin';
import { getApiErrorMessage } from '@/api/services/auth.api';
import { Layers, ShieldCheck, Users, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';

function RolesListView() {
  const { data: roles, isLoading, error } = useAdminRoles();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} color="#3b82f6" className="animate-spin" />
      </div>
    );
  }

  if (error || !roles) {
    return (
      <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
        <p style={{ color: '#f87171' }}>{getApiErrorMessage(error) || 'Failed to load platform roles'}</p>
      </div>
    );
  }

  const roleStyles: Record<string, { badgeBg: string; badgeColor: string; border: string }> = {
    ADMIN: { badgeBg: 'rgba(239, 68, 68, 0.15)', badgeColor: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
    DISPATCHER: { badgeBg: 'rgba(168, 85, 247, 0.15)', badgeColor: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
    COURIER: { badgeBg: 'rgba(59, 130, 246, 0.15)', badgeColor: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    MERCHANT: { badgeBg: 'rgba(245, 158, 11, 0.15)', badgeColor: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
    CUSTOMER: { badgeBg: 'rgba(16, 185, 129, 0.15)', badgeColor: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={24} color="#60a5fa" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Canonical Platform Roles
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Inspect standard SwiftDrop identity role definitions and active assignment counts
          </p>
        </div>

        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            color: '#cbd5e1',
            fontSize: '0.85rem',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={15} />
          <span>Admin Dashboard</span>
        </Link>
      </div>

      {/* Roles Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {roles.map((role) => {
          const style = roleStyles[role.roleName] || {
            badgeBg: 'rgba(59, 130, 246, 0.15)',
            badgeColor: '#60a5fa',
            border: 'rgba(59, 130, 246, 0.25)',
          };
          return (
            <div
              key={role.roleId}
              style={{
                background: 'rgba(17, 24, 39, 0.85)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${style.border}`,
                borderRadius: '16px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: style.badgeBg,
                      color: style.badgeColor,
                    }}
                  >
                    {role.roleName}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                    ID: #{role.roleId}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {role.description}
                </p>
              </div>

              <div
                style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <Users size={16} color="#60a5fa" />
                  <span>
                    <strong style={{ color: '#f8fafc' }}>{role.userCount}</strong> assigned users
                  </span>
                </div>

                <Link
                  href={`/admin/roles/${role.roleId}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <span>View Users</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    <AdminGuard>
      <RolesListView />
    </AdminGuard>
  );
}

