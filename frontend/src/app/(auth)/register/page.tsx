'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '@/schema/auth.schema';
import { useRegister, getApiErrorMessage } from '@/hooks/api/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { resolvePostAuthRedirect } from '@/lib/auth/role-resolver';
import { Box, ShieldCheck, ArrowLeft, Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

function RegisterCard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const registerMutation = useRegister();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace(resolvePostAuthRedirect(user, null, activeRole));
    }
  }, [isInitialized, user, activeRole, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);
    try {
      await registerMutation.mutateAsync(values);
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  const isPending = isSubmitting || registerMutation.isPending;

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

      {/* Heading */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={titleStyle}>Create an Account</h1>
        <p style={subtitleStyle}>
          Join SwiftDrop to book, track, and manage your shipments.
        </p>
      </div>

      {/* Error Alert */}
      {apiError && (
        <div style={errorBannerStyle}>
          <AlertCircle size={15} color="#dc2626" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={formStyle}>
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" style={labelStyle}>
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            {...register('fullName')}
            placeholder="Jane Doe"
            style={inputStyle(!!errors.fullName)}
          />
          {errors.fullName && (
            <p style={errorTextStyle}>{errors.fullName.message}</p>
          )}
        </div>

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

        {/* Phone Number */}
        <div>
          <label htmlFor="phone" style={labelStyle}>
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            {...register('phone')}
            placeholder="+94 77 123 4567"
            style={inputStyle(!!errors.phone)}
          />
          {errors.phone && (
            <p style={errorTextStyle}>{errors.phone.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" style={labelStyle}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" style={labelStyle}>
            Confirm password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
              placeholder="••••••••"
              style={{
                ...inputStyle(!!errors.confirmPassword),
                paddingRight: '2.5rem',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={eyeBtnStyle}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p style={errorTextStyle}>{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Create Account Primary Button */}
        <button
          type="submit"
          disabled={isPending}
          style={submitBtnStyle(isPending)}
        >
          <UserPlus size={16} />
          <span>{isPending ? 'Creating account...' : 'Create Account'}</span>
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
        <GoogleSignInButton mode="signup" onError={setApiError} />
      </div>

      {/* Footer Navigation */}
      <div style={footerContainerStyle}>
        <p style={footerTextStyle}>
          Already have an account?{' '}
          <Link href="/login" style={footerLinkStyle}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main style={mainContainerStyle}>
      <h1 style={srOnlyStyle}>
        Create Account — SwiftDrop National Logistics &amp; Delivery Platform
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
      <section style={rightAuthSectionStyle} aria-label="Account Registration Portal">
        <Suspense fallback={<div style={{ color: '#64748b' }}>Loading portal...</div>}>
          <RegisterCard />
        </Suspense>
      </section>
    </main>
  );
}

// ─── Inline Styles Matching Split-Screen Design System ─────────────────────────

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
  maxWidth: '460px',
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
  gap: '0.9rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '0.3rem',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.6rem 0.85rem',
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
  marginTop: '0.5rem',
});

const dividerContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  margin: '1.15rem 0',
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
  marginTop: '1.25rem',
  textAlign: 'center',
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
  marginTop: '0.2rem',
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
