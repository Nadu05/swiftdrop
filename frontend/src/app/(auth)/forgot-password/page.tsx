'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schema/user.schema';
import { useForgotPassword } from '@/hooks/api/use-password';
import { getApiErrorMessage } from '@/api/services/auth.api';
import { Box, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const forgotMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setApiError(null);
    try {
      await forgotMutation.mutateAsync(values);
      setSubmitted(true);
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  const isPending = isSubmitting || forgotMutation.isPending;

  return (
    <main style={mainContainerStyle}>
      <h1 style={srOnlyStyle}>
        Forgot Password — SwiftDrop National Logistics &amp; Delivery Platform
      </h1>

      {/* Left Visual Hero Section (Matches Reference Image 4) */}
      <section style={leftHeroSectionStyle} aria-label="Nationwide Delivery Network">
        <div style={heroOverlayStyle} />
        {/* On-image typography for Image 4 */}
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
      <section style={rightAuthSectionStyle} aria-label="Forgot Password Portal">
        <div style={cardStyle}>
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
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={titleStyle}>Forgot Password</h1>
            <p style={subtitleStyle}>
              Enter your registered email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

          {/* Success Banner */}
          {submitted ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={successBannerStyle}>
                <CheckCircle2 size={18} color="#15803d" />
                <span>
                  Instructions to reset your password have been sent to your email address. Please check your inbox.
                </span>
              </div>

              <Link href="/login" style={backToLoginBtnStyle}>
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Error Alert */}
              {apiError && (
                <div style={errorBannerStyle}>
                  <AlertCircle size={15} color="#dc2626" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Forgot Password Form */}
              <form onSubmit={handleSubmit(onSubmit)} noValidate style={formStyle}>
                <div>
                  <label htmlFor="email" style={labelStyle}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={mailIconContainerStyle}>
                      <Mail size={16} color="#94a3b8" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register('email')}
                      placeholder="name@example.com"
                      style={{
                        ...inputStyle(!!errors.email),
                        paddingLeft: '2.5rem',
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p style={errorTextStyle}>{errors.email.message}</p>
                  )}
                </div>

                {/* Send Reset Link Button */}
                <button
                  type="submit"
                  disabled={isPending}
                  style={submitBtnStyle(isPending)}
                >
                  <span>{isPending ? 'Sending Link...' : 'Send Reset Link'}</span>
                </button>
              </form>

              {/* Back to Sign In Link */}
              <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
                <Link href="/login" style={backToSignInLinkStyle}>
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

// ─── Inline Style Standards for Forgot Password (Image 4 Exact Match) ─────────

const mainContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100vw',
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
  background: 'linear-gradient(to bottom, rgba(7, 16, 31, 0.4) 0%, rgba(7, 16, 31, 0.1) 60%, rgba(7, 16, 31, 0.5) 100%)',
};

const heroTextContainerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  maxWidth: '480px',
};

const heroHeadlineStyle: React.CSSProperties = {
  fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)',
  fontWeight: 800,
  color: '#ffffff',
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  margin: '0 0 1rem 0',
  textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
};

const heroSubtitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#e2e8f0',
  lineHeight: 1.5,
  margin: 0,
  textShadow: '0 1px 6px rgba(0, 0, 0, 0.5)',
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
  maxWidth: '430px',
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  boxShadow: '0 20px 45px -8px rgba(15, 23, 42, 0.08), 0 4px 14px rgba(15, 23, 42, 0.04)',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  padding: '2.5rem 2.5rem',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
};

const brandRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1.5rem',
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
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: 0,
  letterSpacing: '-0.02em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#64748b',
  marginTop: '0.4rem',
  marginBottom: 0,
  lineHeight: 1.45,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '0.35rem',
};

const mailIconContainerStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0.85rem',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'none',
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

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '44px',
  backgroundColor: disabled ? '#93c5fd' : '#1d68ed',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 600,
  border: 'none',
  borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: '0 4px 14px rgba(29, 104, 237, 0.35)',
  transition: 'background-color 0.15s ease, transform 0.1s ease',
  boxSizing: 'border-box',
});

const backToSignInLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.825rem',
  fontWeight: 600,
  color: '#2563eb',
  textDecoration: 'none',
};

const backToLoginBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  width: '100%',
  height: '42px',
  backgroundColor: '#f1f5f9',
  color: '#334155',
  fontSize: '0.875rem',
  fontWeight: 600,
  borderRadius: '8px',
  textDecoration: 'none',
  transition: 'background-color 0.15s ease',
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
  padding: '0.85rem 1rem',
  fontSize: '0.825rem',
  color: '#15803d',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.65rem',
  lineHeight: 1.45,
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
