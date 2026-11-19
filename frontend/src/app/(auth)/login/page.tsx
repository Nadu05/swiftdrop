'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/schema/auth.schema';
import { useLogin, getApiErrorMessage } from '@/hooks/api/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { resolvePostAuthRedirect } from '@/lib/auth/role-resolver';
import { Box, ShieldCheck, ArrowLeft, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

function LoginCard() {
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
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

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
    <div style={cardStyle}>
      {/* Top Header Row */}
      <div style={topRowStyle}>
        <Link href="/" style={backBtnStyle}>
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Brand & Logo */}
      <div style={brandRowStyle}>
        <div style={logoIconBoxStyle}>
          <Box size={22} color="#ffffff" strokeWidth={2.4} />
        </div>
        <div>
          <div style={brandNameStyle}>
            Swift<span style={{ color: '#2563eb' }}>Drop</span>
          </div>
          <div style={brandSubStyle}>
            National Logistics &amp; Delivery Platform
          </div>
        </div>
      </div>

      {/* Header Heading */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={titleStyle}>Sign in to SwiftDrop</h1>
        <p style={subtitleStyle}>
          Enter your credentials to access your SwiftDrop workspace.
        </p>
      </div>

      {/* Status Notifications */}
      {resetSuccess && (
        <div style={successBannerStyle}>
          <CheckCircle2 size={15} color="#16a34a" />
          <span>Password reset successfully. Please sign in with your new password.</span>
        </div>
      )}
      {deactivatedNotice && (
        <div style={errorBannerStyle}>
          <AlertCircle size={15} color="#dc2626" />
          <span>This account has been deactivated. Please contact support.</span>
        </div>
      )}
      {suspendedNotice && (
        <div style={errorBannerStyle}>
          <AlertCircle size={15} color="#dc2626" />
          <span>This account is suspended. Please contact your branch administrator.</span>
        </div>
      )}
      {apiError && (
        <div style={errorBannerStyle}>
          <AlertCircle size={15} color="#dc2626" />
          <span>{apiError}</span>
        </div>
      )}  

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={formStyle}>
        {/* Email Address */}
        <div>
          <label htmlFor="email" style={labelStyle}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            placeholder="you@example.com"
            style={inputStyle(!!errors.email)}
          />
          {errors.email && (
            <p style={errorTextStyle}>{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div style={passwordLabelRowStyle}>
            <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>
              Password
            </label>
            <Link href="/forgot-password" style={forgotLinkStyle}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              placeholder="••••••••"
              style={{
                ...inputStyle(!!errors.password),
                paddingRight: '2.5rem',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeBtnStyle}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p style={errorTextStyle}>{errors.password.message}</p>
          )}
        </div>

        {/* Sign In Primary Button */}
        <button
          type="submit"
          disabled={isPending}
          style={submitBtnStyle(isPending)}
        >
          <LogIn size={16} />
          <span>{isPending ? 'Signing in...' : 'Sign in'}</span>
        </button>
      </form>

      {/* Divider */}
      <div style={dividerContainerStyle}>
        <div style={dividerLineStyle} />
        <span style={dividerTextStyle}>or continue with</span>
        <div style={dividerLineStyle} />
      </div>

      {/* Google OAuth Button */}
      <div style={{ width: '100%' }}>
        <GoogleSignInButton mode="signin" onError={setApiError} />
      </div>

      {/* Bottom Footer Navigation */}
      <div style={footerContainerStyle}>
        <p style={footerTextStyle}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={footerLinkStyle}>
            Create one
          </Link>
        </p>
        <p style={footerTextStyle}>
          Want to track a shipment?{' '}
          <Link href="/" style={footerLinkStyle}>
            Track Parcel
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main style={mainContainerStyle}>
      <h1 style={srOnlyStyle}>
        Sign In — SwiftDrop National Logistics &amp; Delivery Platform
      </h1>

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
      <section style={rightAuthSectionStyle} aria-label="Sign In Portal">
        <Suspense fallback={<div style={{ color: '#64748b' }}>Loading portal...</div>}>
          <LoginCard />
        </Suspense>
      </section>
    </main>
  );
}

// ─── Inline Style Standards for Split-Screen Auth (Images 2 & 3 Exact Match) ───

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

const topRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.25rem',
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

const unifiedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#0284c7',
  backgroundColor: '#e0f2fe',
  padding: '0.2rem 0.65rem',
  borderRadius: '9999px',
  border: '1px solid #bae6fd',
};

const brandRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1.35rem',
};

const logoIconBoxStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #1d68ed 0%, #2563eb 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
  flexShrink: 0,
};

const brandNameStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 800,
  color: '#0f172a',
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
};

const brandSubStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 500,
  color: '#64748b',
  letterSpacing: '-0.01em',
  marginTop: '2px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.45rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: 0,
  letterSpacing: '-0.02em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#64748b',
  marginTop: '0.35rem',
  marginBottom: 0,
  lineHeight: 1.45,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '0.35rem',
};

const passwordLabelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.35rem',
};

const forgotLinkStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#2563eb',
  fontWeight: 500,
  textDecoration: 'none',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.65rem 0.85rem',
  fontSize: '0.875rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  border: hasError ? '1px solid #ef4444' : '1px solid #cbd5e1',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
});

const eyeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  width: '100%',
  height: '44px',
  backgroundColor: disabled ? '#93c5fd' : '#2563eb',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 600,
  border: 'none',
  borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
  transition: 'background-color 0.15s ease, transform 0.1s ease',
  boxSizing: 'border-box',
});

const dividerContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  margin: '1.25rem 0',
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: '1px',
  backgroundColor: '#e2e8f0',
};

const dividerTextStyle: React.CSSProperties = {
  padding: '0 0.75rem',
  fontSize: '0.75rem',
  color: '#94a3b8',
  whiteSpace: 'nowrap',
};

const footerContainerStyle: React.CSSProperties = {
  marginTop: '1.35rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '0.825rem',
  color: '#64748b',
  margin: 0,
};

const footerLinkStyle: React.CSSProperties = {
  color: '#2563eb',
  fontWeight: 600,
  textDecoration: 'none',
};

const errorTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#dc2626',
  marginTop: '0.25rem',
  margin: 0,
};

const errorBannerStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '0.65rem 0.85rem',
  marginBottom: '1rem',
  fontSize: '0.8rem',
  color: '#b91c1c',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const successBannerStyle: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '0.65rem 0.85rem',
  marginBottom: '1rem',
  fontSize: '0.8rem',
  color: '#15803d',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};
