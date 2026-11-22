'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schema/user.schema';
import { useResetPassword } from '@/hooks/api/use-password';
import { getApiErrorMessage } from '@/api/services/auth.api';
import { Box, Lock, Eye, EyeOff, AlertCircle, Check, X, Loader2, KeyRound, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetMutation = useResetPassword();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
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

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      setApiError('Missing password reset token. Please request a new link.');
      return;
    }
    setApiError(null);
    try {
      await resetMutation.mutateAsync({
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  const isPending = isSubmitting || resetMutation.isPending;

  if (!token) {
    return (
      <div style={cardStyle}>
        <div style={{ marginBottom: '1.25rem' }}>
          <Link href="/login" style={backBtnStyle}>
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
          <AlertCircle size={26} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Invalid Reset Link</h2>
        </div>
        <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.55, marginBottom: '1.5rem' }}>
          This password reset link is missing a valid token. It may have expired or already been used.
        </p>
        <Link
          href="/forgot-password"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '0.75rem',
            background: '#2563eb',
            borderRadius: '10px',
            color: '#ffffff',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}
        >
          Request New Reset Link
        </Link>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Top Row */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link href="/login" style={backBtnStyle}>
          <ArrowLeft size={14} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1d68ed 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
            flexShrink: 0,
          }}
        >
          <Box size={22} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
            Swift<span style={{ color: '#2563eb' }}>Drop</span>
          </div>
          <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>
            National Logistics &amp; Delivery Platform
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <KeyRound size={20} color="#2563eb" />
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Reset Password
        </h2>
      </div>
      <p style={{ color: '#475569', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
        Enter a new secure password for your SwiftDrop account.
      </p>

      {/* Error banner */}
      {apiError && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#b91c1c',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{apiError}</span>
          </div>
          {(apiError.toLowerCase().includes('token') || apiError.toLowerCase().includes('expired')) && (
            <Link
              href="/forgot-password"
              style={{
                marginLeft: '1.5rem',
                color: '#2563eb',
                fontWeight: 600,
                fontSize: '0.8rem',
                textDecoration: 'underline',
              }}
            >
              Request a new reset link &rarr;
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* New Password */}
        <div>
          <label style={labelStyle}>New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              {...register('newPassword')}
              placeholder="Enter new password"
              style={inputStyle(!!errors.newPassword)}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={toggleBtnStyle}
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
            </button>
          </div>
          {errors.newPassword && <p style={errorStyle}>{errors.newPassword.message}</p>}

          {/* Checklist */}
          <div
            style={{
              marginTop: '0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.65rem 0.75rem',
            }}
          >
            {rules.map((rule, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                {rule.valid ? (
                  <Check size={13} color="#16a34a" />
                ) : (
                  <X size={13} color="#94a3b8" />
                )}
                <span style={{ color: rule.valid ? '#15803d' : '#64748b', fontWeight: rule.valid ? 600 : 400 }}>
                  {rule.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label style={labelStyle}>Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Confirm new password"
              style={inputStyle(!!errors.confirmPassword)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={toggleBtnStyle}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
            </button>
          </div>
          {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.75rem',
            background: isPending ? '#93c5fd' : '#2563eb',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            boxShadow: isPending ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.28)',
            transition: 'background 0.2s ease',
          }}
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Resetting Password...</span>
            </>
          ) : (
            <>
              <Lock size={18} />
              <span>Save New Password</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main style={mainContainerStyle}>
      {/* Left Visual Hero Section */}
      <section style={leftHeroSectionStyle} aria-label="Nationwide Delivery Network">
        <div style={heroOverlayStyle} />
        <div style={heroTextContainerStyle}>
          <h2 style={heroHeadlineStyle}>
            WHEREVER YOUR<br />CUSTOMER IS, WE&apos;RE<br />ALREADY THERE.
          </h2>
          <p style={heroSubtitleStyle}>
            Nationwide branch network covering every corner of Sri Lanka. North, South, East, West — no address is too far.
          </p>
        </div>
      </section>

      {/* Right Form Card Section */}
      <section style={rightAuthSectionStyle} aria-label="Reset Password Portal">
        <Suspense fallback={<div style={{ color: '#64748b' }}>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const mainContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  display: 'flex',
  flexWrap: 'wrap',
  margin: 0,
  padding: 0,
  backgroundColor: '#f0f3f8',
  overflowX: 'hidden',
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const leftHeroSectionStyle: React.CSSProperties = {
  flex: '1 1 52%',
  minWidth: '320px',
  minHeight: '100vh',
  position: 'relative',
  backgroundImage: "url('/auth-hero-vertical.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
  backgroundColor: '#07101f',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  padding: '3.5rem 3rem',
  boxSizing: 'border-box',
};

const heroOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(to bottom, rgba(7, 16, 31, 0.45) 0%, rgba(7, 16, 31, 0.12) 55%, rgba(7, 16, 31, 0.5) 100%)',
  pointerEvents: 'none',
};

const heroTextContainerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  maxWidth: '480px',
};

const heroHeadlineStyle: React.CSSProperties = {
  fontSize: 'clamp(1.85rem, 3.1vw, 2.5rem)',
  fontWeight: 800,
  color: '#ffffff',
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  margin: '0 0 1rem 0',
  textShadow: '0 2px 12px rgba(0, 0, 0, 0.55)',
};

const heroSubtitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#e2e8f0',
  lineHeight: 1.55,
  margin: 0,
  textShadow: '0 1px 8px rgba(0, 0, 0, 0.5)',
};

const rightAuthSectionStyle: React.CSSProperties = {
  flex: '1 1 48%',
  minWidth: '320px',
  minHeight: '100vh',
  backgroundColor: '#f0f3f8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2.5rem 1.5rem',
  boxSizing: 'border-box',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '440px',
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  boxShadow: '0 20px 45px -8px rgba(15, 23, 42, 0.08), 0 4px 14px rgba(15, 23, 42, 0.04)',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  padding: '2.25rem 2.5rem',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
};

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#475569',
  textDecoration: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '0.4rem',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
  background: '#ffffff',
  border: `1px solid ${hasError ? '#ef4444' : '#cbd5e1'}`,
  borderRadius: '8px',
  color: '#0f172a',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
});

const toggleBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
};

const errorStyle: React.CSSProperties = {
  marginTop: '0.3rem',
  fontSize: '0.75rem',
  color: '#dc2626',
};
