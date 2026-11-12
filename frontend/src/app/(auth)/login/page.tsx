'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/schema/auth.schema';
import { useLogin, useGoogleAuth, getApiErrorMessage } from '@/hooks/api/use-auth';
import { Eye, EyeOff, LogIn, Box } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const loginMutation = useLogin();
  const googleMutation = useGoogleAuth();

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

  const handleGoogleLogin = async () => {
    setApiError(null);
    // In a real integration, obtain the ID token from the Google Identity Services SDK.
    // The placeholder below shows the expected flow.
    try {
      if (typeof window === 'undefined') return;
      // @ts-expect-error — google global injected by GIS script
      const client = google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
        scope: 'openid email profile',
        callback: async (tokenResponse: { access_token: string }) => {
          // Exchange access_token for id_token via tokeninfo or use GIS id token flow
          // For simplicity we demonstrate with id_token flow (requires GIS One-Tap or Sign In With Google button)
          console.log('Google token response received', tokenResponse);
        },
      });
      client.requestAccessToken();
    } catch (err) {
      setApiError('Google sign-in is not configured. Please use email and password.');
    }
  };

  const isPending = isSubmitting || loginMutation.isPending;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
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

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
        Welcome back
      </h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.75rem', fontSize: '0.875rem' }}>
        Sign in to your account to continue
      </p>

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
            fontSize: '0.875rem',
            color: '#f87171',
          }}
        >
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Email */}
        <div>
          <label htmlFor="email" style={labelStyle}>Email address</label>
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
          <label htmlFor="password" style={labelStyle}>Password</label>
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
              {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
            </button>
          </div>
          {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
        </div>

        {/* Submit */}
        <button type="submit" disabled={isPending} style={primaryBtnStyle(isPending)}>
          {isPending ? (
            <span>Signing in…</span>
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
        <span style={{ color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>or continue with</span>
        <span style={dividerLineStyle} />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleMutation.isPending}
        style={googleBtnStyle}
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>
          Create one
        </Link>
      </p>
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
  padding: '0.65rem 0.85rem',
  background: 'rgba(15, 23, 42, 0.7)',
  border: `1px solid ${hasError ? 'rgba(239,68,68,0.6)' : 'rgba(59,130,246,0.2)'}`,
  borderRadius: '8px',
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
  padding: '0.75rem',
  background: disabled ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
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

const googleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.65rem',
  width: '100%',
  padding: '0.7rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(59,130,246,0.2)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.638-.057-1.252-.163-1.841H9v3.481h4.844c-.21 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

