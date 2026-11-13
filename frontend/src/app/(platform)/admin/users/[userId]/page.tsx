'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AdminGuard from '@/components/auth/AdminGuard';
import {
  useAdminUser,
  useAdminRoles,
  useAssignRole,
  useRemoveRole,
  useSuspendUser,
  useActivateUser,
  useUpdateAdminUser,
} from '@/hooks/api/use-admin';
import { adminUpdateUserSchema, type AdminUpdateUserFormValues } from '@/schema/admin.schema';
import { getApiErrorMessage } from '@/api/services/auth.api';
import {
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  UserX,
  UserCheck,
  Edit,
  Plus,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';

const CANONICAL_ROLES = ['CUSTOMER', 'MERCHANT', 'COURIER', 'DISPATCHER', 'ADMIN'] as const;

function UserDetailView() {
  const params = useParams();
  const userId = params?.userId as string;

  const { data: user, isLoading, error: fetchError } = useAdminUser(userId);
  const { data: allRoles } = useAdminRoles();

  const assignRoleMutation = useAssignRole();
  const removeRoleMutation = useRemoveRole();
  const suspendMutation = useSuspendUser();
  const activateMutation = useActivateUser();
  const updateMutation = useUpdateAdminUser();

  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string>('CUSTOMER');
  const [showEditModal, setShowEditModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<AdminUpdateUserFormValues>({
    resolver: zodResolver(adminUpdateUserSchema),
  });

  const openEditModal = () => {
    if (!user) return;
    resetEdit({
      fullName: user.fullName,
      phone: user.phone || '',
      accountStatus: user.accountStatus as any,
      emailVerified: user.emailVerified,
    });
    setShowEditModal(true);
  };

  const onEditSubmit = async (values: AdminUpdateUserFormValues) => {
    setNotification(null);
    try {
      await updateMutation.mutateAsync({
        userId,
        payload: {
          fullName: values.fullName,
          phone: values.phone || undefined,
          accountStatus: values.accountStatus,
          emailVerified: values.emailVerified,
        },
      });
      setNotification({ type: 'success', text: 'User details updated successfully.' });
      setShowEditModal(false);
    } catch (err) {
      setNotification({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const handleAssignRole = async () => {
    if (!selectedRoleToAssign) return;
    setNotification(null);
    try {
      await assignRoleMutation.mutateAsync({ userId, roleName: selectedRoleToAssign });
      setNotification({ type: 'success', text: `Assigned role ${selectedRoleToAssign} to ${user?.email}.` });
    } catch (err) {
      setNotification({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const handleRemoveRole = async (roleName: string) => {
    const roleObj = allRoles?.find((r) => r.roleName === roleName);
    if (!roleObj) return;

    setNotification(null);
    try {
      await removeRoleMutation.mutateAsync({ userId, roleId: roleObj.roleId });
      setNotification({ type: 'success', text: `Removed role ${roleName} from ${user?.email}.` });
    } catch (err) {
      setNotification({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setNotification(null);
    try {
      if (user.accountStatus === 'ACTIVE') {
        await suspendMutation.mutateAsync(userId);
        setNotification({ type: 'success', text: `Account for ${user.email} suspended.` });
      } else {
        await activateMutation.mutateAsync(userId);
        setNotification({ type: 'success', text: `Account for ${user.email} activated.` });
      }
    } catch (err) {
      setNotification({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} color="#3b82f6" className="animate-spin" />
      </div>
    );
  }

  if (fetchError || !user) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
        <p style={{ color: '#f87171' }}>{getApiErrorMessage(fetchError) || 'User not found'}</p>
        <Link href="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', marginTop: '1rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} />
          <span>Back to Users List</span>
        </Link>
      </div>
    );
  }

  const unassignedRoles = CANONICAL_ROLES.filter((r) => !user.roles?.includes(r));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Back link */}
      <div>
        <Link
          href="/admin/users"
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
          <span>Back to Users Directory</span>
        </Link>
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

      {/* Profile Overview Card */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                {user.fullName}
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  background: user.accountStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: user.accountStatus === 'ACTIVE' ? '#10b981' : '#f87171',
                  border: `1px solid ${user.accountStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {user.accountStatus}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  background: user.emailVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: user.emailVerified ? '#10b981' : '#f59e0b',
                }}
              >
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={openEditModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: '#60a5fa',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Edit size={14} />
            <span>Edit Details</span>
          </button>

          {user.accountStatus === 'ACTIVE' ? (
            <button
              onClick={handleToggleStatus}
              disabled={suspendMutation.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: suspendMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              <UserX size={14} />
              <span>{suspendMutation.isPending ? 'Suspending...' : 'Suspend Account'}</span>
            </button>
          ) : (
            <button
              onClick={handleToggleStatus}
              disabled={activateMutation.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: activateMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              <UserCheck size={14} />
              <span>{activateMutation.isPending ? 'Activating...' : 'Activate Account'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Management Card */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={20} color="#60a5fa" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            Assigned Roles & Authorizations
          </h2>
        </div>

        {/* Current Assigned Roles List */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {user.roles?.map((role) => (
            <div
              key={role}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.85rem',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa' }}>{role}</span>
              {user.roles.length > 1 && (
                <button
                  onClick={() => handleRemoveRole(role)}
                  disabled={removeRoleMutation.isPending}
                  title={`Remove ${role} role`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Assign Role Bar */}
        {unassignedRoles.length > 0 && (
          <div
            style={{
              paddingTop: '1rem',
              borderTop: '1px solid rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Assign New Role:</span>
            <select
              value={selectedRoleToAssign}
              onChange={(e) => setSelectedRoleToAssign(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              {unassignedRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssignRole}
              disabled={assignRoleMutation.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: assignRoleMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              <Plus size={15} />
              <span>{assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Identity Metadata Card */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          Account Identity Metadata
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={metaBoxStyle}>
            <span style={metaLabelStyle}>USER ID</span>
            <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#cbd5e1', display: 'block', marginTop: '0.2rem' }}>
              {user.userId}
            </span>
          </div>

          <div style={metaBoxStyle}>
            <span style={metaLabelStyle}>AUTH PROVIDER</span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginTop: '0.2rem' }}>
              {user.authProvider}
            </span>
          </div>

          <div style={metaBoxStyle}>
            <span style={metaLabelStyle}>PHONE NUMBER</span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginTop: '0.2rem' }}>
              {user.phone || 'None registered'}
            </span>
          </div>

          <div style={metaBoxStyle}>
            <span style={metaLabelStyle}>REGISTRATION DATE</span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginTop: '0.2rem' }}>
              {new Date(user.createdAt).toLocaleString()}
            </span>
          </div>

          <div style={metaBoxStyle}>
            <span style={metaLabelStyle}>LAST UPDATED</span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginTop: '0.2rem' }}>
              {new Date(user.updatedAt).toLocaleString()}
            </span>
          </div>

          <div style={metaBoxStyle}>
            <span style={metaLabelStyle}>LAST PASSWORD CHANGE</span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginTop: '0.2rem' }}>
              {user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleString() : 'Never changed'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#60a5fa' }}>
                <Edit size={18} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Edit User Details
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit(onEditSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" {...registerEdit('fullName')} style={inputStyle(!!editErrors.fullName)} />
                {editErrors.fullName && <p style={errorStyle}>{editErrors.fullName.message}</p>}
              </div>

              <div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" {...registerEdit('phone')} placeholder="+1234567890" style={inputStyle(!!editErrors.phone)} />
                {editErrors.phone && <p style={errorStyle}>{editErrors.phone.message}</p>}
              </div>

              <div>
                <label style={labelStyle}>Account Status</label>
                <select {...registerEdit('accountStatus')} style={inputStyle(false)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="DEACTIVATED">DEACTIVATED</option>
                  <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="modalEmailVerified"
                  {...registerEdit('emailVerified')}
                  style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                />
                <label htmlFor="modalEmailVerified" style={{ fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  Mark email as verified
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={cancelBtnStyle}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    padding: '0.55rem 1.25rem',
                    background: isUpdating ? 'rgba(59, 130, 246, 0.4)' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUserDetailPage() {
  return (
    <AdminGuard>
      <UserDetailView />
    </AdminGuard>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const metaBoxStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  background: 'rgba(15, 23, 42, 0.6)',
  borderRadius: '10px',
  border: '1px solid rgba(59, 130, 246, 0.1)',
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.05em',
  display: 'block',
};

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

