'use client';

import Link from 'next/link';
import AdminGuard from '@/components/auth/AdminGuard';
import { useAdminStats } from '@/hooks/api/use-admin';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  Layers,
  Activity,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

function AdminOverview() {
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} color="#3b82f6" className="animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
        <p style={{ color: '#f87171' }}>Failed to load administration metrics.</p>
      </div>
    );
  }

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    ADMIN: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
    DISPATCHER: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
    COURIER: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    MERCHANT: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
    CUSTOMER: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={24} color="#60a5fa" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Administration & RBAC
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Central identity governance, role-based access control, and account lifecycle management
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href="/admin/users"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Users size={16} />
            <span>Manage Users</span>
          </Link>
          <Link
            href="/admin/roles"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Layers size={16} />
            <span>Platform Roles</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {/* Total Users */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={kpiLabelStyle}>TOTAL IDENTITIES</span>
            <div style={iconBadgeStyle('#3b82f6', 'rgba(59, 130, 246, 0.15)')}>
              <Users size={18} color="#60a5fa" />
            </div>
          </div>
          <div style={kpiValueStyle}>{stats.totalUsers}</div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Platform wide registered accounts</span>
        </div>

        {/* Active Users */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={kpiLabelStyle}>ACTIVE</span>
            <div style={iconBadgeStyle('#10b981', 'rgba(16, 185, 129, 0.15)')}>
              <UserCheck size={18} color="#34d399" />
            </div>
          </div>
          <div style={kpiValueStyle}>{stats.activeUsers}</div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Authorized to sign in</span>
        </div>

        {/* Suspended Users */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={kpiLabelStyle}>SUSPENDED</span>
            <div style={iconBadgeStyle('#f87171', 'rgba(239, 68, 68, 0.15)')}>
              <UserX size={18} color="#f87171" />
            </div>
          </div>
          <div style={kpiValueStyle}>{stats.suspendedUsers}</div>
          <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Access denied / revoked</span>
        </div>

        {/* Deactivated Users */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={kpiLabelStyle}>DEACTIVATED</span>
            <div style={iconBadgeStyle('#64748b', 'rgba(100, 116, 139, 0.15)')}>
              <ShieldAlert size={18} color="#94a3b8" />
            </div>
          </div>
          <div style={kpiValueStyle}>{stats.deactivatedUsers}</div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Self-requested deactivation</span>
        </div>

        {/* Pending Verification */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={kpiLabelStyle}>PENDING VERIFY</span>
            <div style={iconBadgeStyle('#f59e0b', 'rgba(245, 158, 11, 0.15)')}>
              <AlertTriangle size={18} color="#fbbf24" />
            </div>
          </div>
          <div style={kpiValueStyle}>{stats.pendingVerificationUsers}</div>
          <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Awaiting verification</span>
        </div>
      </div>

      {/* Role Distribution Section */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
              Canonical Role Distribution
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Users assigned to each of the 5 canonical SwiftDrop roles
            </p>
          </div>
          <Link
            href="/admin/roles"
            style={{
              fontSize: '0.85rem',
              color: '#60a5fa',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>View All Roles</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {Object.entries(stats.usersByRole || {}).map(([role, count]) => {
            const style = roleColors[role] || {
              bg: 'rgba(59, 130, 246, 0.15)',
              text: '#60a5fa',
              border: 'rgba(59, 130, 246, 0.3)',
            };
            return (
              <div
                key={role}
                style={{
                  padding: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '12px',
                  border: `1px solid ${style.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      background: style.bg,
                      color: style.text,
                    }}
                  >
                    {role}
                  </span>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{count}</div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Assigned users</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Governance & Architecture Notice */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <Activity size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
          <strong style={{ color: '#cbd5e1' }}>Microservice Boundary Enforcement:</strong> Identity Service strictly
          governs global identity credentials, account states, and canonical role assignments. Merchant organization
          profiles, approval workflows, and branch memberships are managed by{' '}
          <strong style={{ color: '#60a5fa' }}>Organization Service</strong>.
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminOverview />
    </AdminGuard>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const kpiCardStyle: React.CSSProperties = {
  background: 'rgba(17, 24, 39, 0.85)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: '14px',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.05em',
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: '1.85rem',
  fontWeight: 800,
  color: '#f8fafc',
  letterSpacing: '-0.02em',
  marginTop: '0.2rem',
};

const iconBadgeStyle = (color: string, bg: string): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

