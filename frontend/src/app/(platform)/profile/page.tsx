'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileFormValues } from '@/schema/user.schema';
import { useUserProfile, useUpdateProfile } from '@/hooks/api/use-user';
import { getApiErrorMessage } from '@/api/services/auth.api';
import {
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Check,
} from 'lucide-react';

export default function ProfilePage() {
  const { data: profile, isLoading, error: fetchError } = useUserProfile();
  const updateMutation = useUpdateProfile();

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
    },
  });

  // Populate form once profile loads
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: UpdateProfileFormValues) => {
    setStatusMessage(null);
    try {
      await updateMutation.mutateAsync(values);
      setStatusMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} color="#3b82f6" className="animate-spin" />
      </div>
    );
  }

  if (fetchError || !profile) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171' }}>
          <AlertCircle size={20} />
          <h3 style={{ fontWeight: 600 }}>Failed to load profile</h3>
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          {getApiErrorMessage(fetchError)}
        </p>
      </div>
    );
  }

  const isPending = isSubmitting || updateMutation.isPending;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          User Profile
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
          Manage your personal information, roles, and account identity
        </p>
      </div>

      {/* Profile Overview Card */}
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
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)',
            }}
          >
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                {profile.fullName}
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  background: profile.accountStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: profile.accountStatus === 'ACTIVE' ? '#10b981' : '#f87171',
                  border: `1px solid ${profile.accountStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {profile.accountStatus}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {profile.email}
            </p>
          </div>
        </div>

        {/* Roles & Verification badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {profile.roles?.map((role) => (
              <span
                key={role}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <ShieldCheck size={13} />
                {role}
              </span>
            ))}
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: profile.emailVerified ? '#10b981' : '#f59e0b',
            }}
          >
            {profile.emailVerified ? (
              <>
                <CheckCircle2 size={13} />
                Email verified
              </>
            ) : (
              <>
                <AlertCircle size={13} />
                Email unverified
              </>
            )}
          </span>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: statusMessage.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {statusMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Edit Profile Form */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
        }}
      >
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem' }}>
          Personal Details
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Full Name */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                {...register('fullName')}
                placeholder="Your full name"
                style={inputStyle(!!errors.fullName)}
              />
              <div style={fieldIconStyle}>
                <UserIcon size={16} color="#64748b" />
              </div>
            </div>
            {errors.fullName && <p style={errorStyle}>{errors.fullName.message}</p>}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label style={labelStyle}>
              Email Address <span style={{ color: '#64748b', fontWeight: 400 }}>(Managed via security)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={profile.email}
                readOnly
                disabled
                style={{
                  ...inputStyle(false),
                  opacity: 0.65,
                  cursor: 'not-allowed',
                  background: 'rgba(15, 23, 42, 0.4)',
                }}
              />
              <div style={fieldIconStyle}>
                <Mail size={16} color="#64748b" />
              </div>
            </div>
            <p style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#64748b' }}>
              Email address cannot be changed directly from profile.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                {...register('phone')}
                placeholder="+1234567890"
                style={inputStyle(!!errors.phone)}
              />
              <div style={fieldIconStyle}>
                <Phone size={16} color="#64748b" />
              </div>
            </div>
            {errors.phone && <p style={errorStyle}>{errors.phone.message}</p>}
          </div>

          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.1)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>MEMBER SINCE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                <Calendar size={14} color="#60a5fa" />
                <span>{new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>USER ID</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontFamily: 'monospace', marginTop: '0.2rem', display: 'block' }}>
                {profile.userId}
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isPending || !isDirty}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                background: isPending || !isDirty ? 'rgba(59, 130, 246, 0.3)' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isPending || !isDirty ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#cbd5e1',
  marginBottom: '0.4rem',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.65rem 0.85rem 0.65rem 2.4rem',
  background: 'rgba(15, 23, 42, 0.7)',
  border: `1px solid ${hasError ? 'rgba(239,68,68,0.6)' : 'rgba(59,130,246,0.2)'}`,
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
});

const fieldIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0.85rem',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'none',
};

const errorStyle: React.CSSProperties = {
  marginTop: '0.3rem',
  fontSize: '0.75rem',
  color: '#f87171',
};

