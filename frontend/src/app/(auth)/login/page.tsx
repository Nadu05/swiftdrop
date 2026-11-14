'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/schema/auth.schema';
import { useLogin, getApiErrorMessage } from '@/hooks/api/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { resolvePostAuthRedirect } from '@/lib/auth/role-resolver';
import { Eye, EyeOff, LogIn, Box, ArrowLeft, ShieldCheck } from 'lucide-react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetSuccess = searchParams.get('reset') === 'success';
  const deactivatedNotice =
    searchParams.get('deactivated') === 'true' ||
    searchParams.get('error') === 'account_deactivated';
  const suspendedNotice = searchParams.get('error') === 'account_suspended';

  const loginMutation = useLogin();

  useEffect(() => {
    if (isInitialized && user) {
      const callbackUrl = searchParams.get('callbackUrl');
      const target = resolvePostAuthRedirect(user, callbackUrl, activeRole);
      router.replace(target);
    }
  }, [isInitialized, user, activeRole, router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    try {
      await loginMutation.mutateAsync(values);
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  const isPending = isSubmitting || loginMutation.isPending;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '450px',
        background: 'rgba(13, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(59, 130, 246, 0.22)',
        borderRadius: '18px',
        padding: '2.5rem',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      {/* Back to Landing Page */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#94a3b8',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
          }}
        >
          <ShieldCheck size={12} />
          Unified Portal
        </span>
      </div>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '11px',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
          }}
        >
          <Box size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Swift<span style={{ color: '#38bdf8' }}>Drop</span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
            National Logistics &amp; Delivery Platform
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
        Sign in to SwiftDrop
      </h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.75rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
        Enter your credentials to automatically access your Customer, Merchant, Courier, Dispatcher, Branch, or Admin workspace.
      </p>

      {/* Reset success notification */}
      {resetSuccess && (
        <div
          role="status"
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#34d399',
          }}
        >
          Password reset successful! Please sign in with your new password.
        </div>
      )}

      {/* Suspended notification */}
      {suspendedNotice && (
        <div
          role="alert"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#fbbf24',
          }}
        >
          Your account is currently suspended. Please contact SwiftDrop administration for assistance.
        </div>
      )}

      {/* Deactivated notification */}
      {deactivatedNotice && (
        <div
          role="alert"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#f87171',
          }}
        >
          Your account has been deactivated. Contact support if this was in error.
        </div>
      )}

      {/* API Error Banner */}
      {apiError && (
        <div
          role="alert"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#f87171',
          }}
        >
          {apiError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
      >
        {/* Email */}
        <div>
          <label htmlFor="email" style={labelStyle}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            style={inputStyle(!!errors.email)}
            placeholder="you@example.com"
          />
          {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.4rem',
            }}
          >
            <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>
              Password
            </label>
            <Link
              href="/forgot-password"
              style={{
                fontSize: '0.75rem',
                color: '#60a5fa',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              style={{ ...inputStyle(!!errors.password), paddingRight: '3rem' }}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={toggleBtnStyle}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={18} color="#64748b" />
              ) : (
                <Eye size={18} color="#64748b" />
              )}
            </button>
          </div>
          {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
        </div>

        {/* Submit */}
        <button type="submit" disabled={isPending} style={primaryBtnStyle(isPending)}>
          {isPending ? (
            <span>Authenticating…</span>
          ) : (
            <>
              <LogIn size={18} />
              <span>Sign in</span>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div style={dividerStyle}>
        <span style={dividerLineStyle} />
        <span style={{ color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          or continue with
        </span>
        <span style={dividerLineStyle} />
      </div>

      {/* Google Sign-In */}
      <GoogleSignInButton mode="signin" onError={setApiError} />

      <div
        style={{
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#94a3b8',
        }}
      >
        <div>
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}
          >
            Create one
          </Link>
        </div>
        <div style={{ fontSize: '0.76rem' }}>
          Want to track a shipment without signing in?{' '}
          <Link
            href="/tracking"
            style={{ color: '#93c5fd', fontWeight: 600, textDecoration: 'none' }}
          >
            Track Parcel
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
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
  padding: '0.7rem 0.85rem',
  background: 'rgba(15, 23, 42, 0.75)',
  border: `1px solid ${hasError ? 'rgba(239,68,68,0.6)' : 'rgba(59,130,246,0.22)'}`,
  borderRadius: '9px',
  color: '#f8fafc',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
});

const errorStyle: React.CSSProperties = {
  marginTop: '0.3rem',
  fontSize: '0.75rem',
  color: '#f87171',
};

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

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.8rem',
  background: disabled
    ? 'rgba(59,130,246,0.4)'
    : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
  border: 'none',
  borderRadius: '9px',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: disabled ? 'none' : '0 4px 16px rgba(37, 99, 235, 0.35)',
});

const dividerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  margin: '1.5rem 0',
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: '1px',
  background: 'rgba(59,130,246,0.15)',
};
