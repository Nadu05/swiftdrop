'use client';

import { Suspense, useEffect, useState } from 'react';
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
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isSuccess) return;
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
  }, [isLoading, isInitialized, isError, activeUser, activeRole, callbackUrl, router, isSuccess]);

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
      setIsSuccess(true);
      const userState = useAuthStore.getState().user || activeUser;
      if (userState) {
        const updatedUser = { ...userState, mustChangePassword: false };
        const target = resolvePostAuthRedirect(updatedUser, callbackUrl, activeRole);
        router.replace(target);
      } else {
        router.replace(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
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
          <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Brand + Sign Out */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          style={signOutBtnStyle}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>

      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <KeyRound size={20} color="#2563eb" />
        <h2 style={titleStyle}>Create Your New Password</h2>
      </div>
      <p style={subtitleStyle}>
        You signed in with a temporary password. For your account security, please choose a new personal password before continuing.
      </p>

      {/* Signed-in-as banner */}
      <div style={noticeBannerStyle}>
        <ShieldCheck size={15} color="#2563eb" style={{ flexShrink: 0 }} />
        <span>
          Signed in as <strong style={{ fontWeight: 600, color: '#0f172a' }}>{activeUser?.email}</strong>
        </span>
      </div>

      {/* API Error */}
      {apiError && (
        <div role="alert" style={errorBannerStyle}>
          <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Current / Temporary Password */}
        <div>
          <label htmlFor="currentPassword" style={labelStyle}>Temporary / Current Password</label>
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
              style={eyeBtnStyle}
              aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
            >
              {showCurrent ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
            </button>
          </div>
          {errors.currentPassword && <p style={fieldErrorStyle}>{errors.currentPassword.message}</p>}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" style={labelStyle}>New Personal Password</label>
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
              style={eyeBtnStyle}
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
            </button>
          </div>
          {errors.newPassword && <p style={fieldErrorStyle}>{errors.newPassword.message}</p>}

          {/* Password requirements checklist */}
          <div style={requirementsBoxStyle}>
            {rules.map((rule) => (
              <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
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
          <label htmlFor="confirmPassword" style={labelStyle}>Confirm New Password</label>
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
              style={eyeBtnStyle}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
            </button>
          </div>
          {errors.confirmPassword && <p style={fieldErrorStyle}>{errors.confirmPassword.message}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          style={submitBtnStyle(isPending)}
        >
          {isPending ? (
            <>
              <Loader2 size={17} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Updating Password...</span>
            </>
          ) : (
            <span>Update Password &amp; Continue</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <main style={mainContainerStyle}>
      {/* Left Visual Hero Section — hidden on mobile, shown on lg */}
      <section
        aria-label="Nationwide Delivery Network"
        style={leftHeroSectionStyle}
      >
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

      {/* Right Auth Card Section */}
      <section style={rightAuthSectionStyle}>
        <Suspense
          fallback={
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            </div>
          }
        >
          <ChangePasswordCard />
        </Suspense>
      </section>

      {/* CSS animation for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

// ─── Inline Style Standards — Exact match with Login page ────────────────────

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

const signOutBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#475569',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '0.35rem 0.65rem',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.35rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: 0,
  letterSpacing: '-0.02em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#64748b',
  marginTop: '0.35rem',
  marginBottom: '1.15rem',
  lineHeight: 1.5,
};

const noticeBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '0.6rem 0.85rem',
  marginBottom: '1rem',
  fontSize: '0.78rem',
  color: '#1e40af',
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '0.35rem',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
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

const fieldErrorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#dc2626',
  marginTop: '0.3rem',
  margin: 0,
  marginBlockStart: '0.3rem',
};

const requirementsBoxStyle: React.CSSProperties = {
  marginTop: '0.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '0.55rem 0.75rem',
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
  boxShadow: disabled ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.35)',
  transition: 'background-color 0.15s ease',
  boxSizing: 'border-box',
  marginTop: '0.25rem',
});
