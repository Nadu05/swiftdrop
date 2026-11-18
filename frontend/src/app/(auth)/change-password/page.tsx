'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/schema/user.schema';
import { useCurrentUser, useLogout, getApiErrorMessage } from '@/hooks/api/use-auth';
import { useChangePassword } from '@/hooks/api/use-password';
import { useAuthStore } from '@/store/auth.store';
import { resolvePostAuthRedirect } from '@/lib/auth/role-resolver';
import {
  Box,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  X,
  Loader2,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

function ChangePasswordCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const storedUser = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const activeUser = currentUser || storedUser;

  const changeMutation = useChangePassword();
  const logoutMutation = useLogout();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isInitialized && (isError || !activeUser)) {
      const target = callbackUrl
        ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : '/login';
      router.replace(target);
      return;
    }

    if (!isLoading && activeUser && !activeUser.mustChangePassword) {
      const target = resolvePostAuthRedirect(activeUser, callbackUrl, activeRole);
      router.replace(target);
    }
  }, [isLoading, isInitialized, isError, activeUser, activeRole, callbackUrl, router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword', '');

  const rules = [
    { label: 'At least 8 characters', valid: newPasswordValue.length >= 8 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(newPasswordValue) },
    { label: 'At least one digit', valid: /[0-9]/.test(newPasswordValue) },
    { label: 'At least one special character', valid: /[^a-zA-Z0-9]/.test(newPasswordValue) },
  ];

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setApiError(null);
    try {
      await changeMutation.mutateAsync(values);
      if (activeUser) {
        const updatedUser = { ...activeUser, mustChangePassword: false };
        const target = resolvePostAuthRedirect(updatedUser, callbackUrl, activeRole);
        router.replace(target);
      } else {
        router.replace('/login');
      }
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  const isPending = isSubmitting || changeMutation.isPending;

  if (isLoading && !activeUser) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
          <Loader2 size={28} color="#3b82f6" className="animate-spin" />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              Swift<span style={{ color: '#60a5fa' }}>Drop</span>
            </h1>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Delivery Platform</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#cbd5e1',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <KeyRound size={20} color="#60a5fa" />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
          Set Your Personal Password
        </h2>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: '1.25rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
        You signed in with a temporary password. For your account security, please choose a new personal password before accessing your portal.
      </p>

      {/* Notice Banner */}
      <div
        style={{
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          color: '#93c5fd',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem',
        }}
      >
        <ShieldCheck size={16} style={{ flexShrink: 0 }} />
        <span>
          Signed in as <strong style={{ color: '#fff' }}>{activeUser?.email}</strong>
        </span>
      </div>

      {/* API Error */}
      {apiError && (
        <div
          role="alert"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#f87171',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* Current / Temporary Password */}
        <div>
          <label htmlFor="currentPassword" style={labelStyle}>
            Temporary / Current Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('currentPassword')}
              placeholder="Enter your temporary password"
              style={inputStyle(!!errors.currentPassword)}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
              style={toggleBtnStyle}
            >
              {showCurrent ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
            </button>
          </div>
          {errors.currentPassword && <p style={errorStyle}>{errors.currentPassword.message}</p>}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" style={labelStyle}>
            New Personal Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="newPassword"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('newPassword')}
              placeholder="Enter new personal password"
              style={inputStyle(!!errors.newPassword)}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
              style={toggleBtnStyle}
            >
              {showNew ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
            </button>
          </div>
          {errors.newPassword && <p style={errorStyle}>{errors.newPassword.message}</p>}

          {/* Policy Checklist */}
          <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {rules.map((rule) => (
              <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                {rule.valid ? <Check size={13} color="#10b981" /> : <X size={13} color="#64748b" />}
                <span style={{ color: rule.valid ? '#10b981' : '#64748b' }}>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label htmlFor="confirmPassword" style={labelStyle}>
            Confirm New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
              placeholder="Confirm new personal password"
              style={inputStyle(!!errors.confirmPassword)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              style={toggleBtnStyle}
            >
              {showConfirm ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
            </button>
          </div>
          {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          style={{
            marginTop: '0.25rem',
            width: '100%',
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: isPending
              ? 'rgba(59, 130, 246, 0.5)'
              : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            color: '#fff',
            fontSize: '0.925rem',
            fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {isPending ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <span>Save Password &amp; Continue</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 55%, #020617 100%)',
      }}
    >
      <Suspense
        fallback={
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
              <Loader2 size={28} color="#3b82f6" className="animate-spin" />
            </div>
          </div>
        }
      >
        <ChangePasswordCard />
      </Suspense>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '460px',
  background: 'rgba(17, 24, 39, 0.88)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(59, 130, 246, 0.25)',
  borderRadius: '16px',
  padding: '2.25rem',
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#cbd5e1',
  marginBottom: '0.45rem',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.7rem 2.5rem 0.7rem 0.85rem',
  borderRadius: '8px',
  background: 'rgba(15, 23, 42, 0.75)',
  border: `1px solid ${hasError ? '#ef4444' : 'rgba(148, 163, 184, 0.25)'}`,
  color: '#f8fafc',
  fontSize: '0.875rem',
  outline: 'none',
});

const toggleBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: '0.7rem',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '0.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const errorStyle: React.CSSProperties = {
  color: '#f87171',
  fontSize: '0.75rem',
  marginTop: '0.35rem',
};
