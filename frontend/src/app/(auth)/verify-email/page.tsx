'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useVerifyEmail, useResendVerification } from '@/hooks/api/use-password';
import { getApiErrorMessage } from '@/api/services/auth.api';
import { Box, CheckCircle2, AlertCircle, Loader2, ArrowRight, Send } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  useEffect(() => {
    if (token) {
      verifyMutation
        .mutateAsync({ token })
        .then(() => {
          setVerified(true);
        })
        .catch((err) => {
          setErrorMessage(getApiErrorMessage(err));
        });
    } else {
      setErrorMessage('No verification token provided in URL.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async () => {
    setResendStatus(null);
    try {
      const res = await resendMutation.mutateAsync();
      setResendStatus(res.message || 'Verification email sent. Check your inbox.');
    } catch (err) {
      setResendStatus(getApiErrorMessage(err));
    }
  };

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
        textAlign: 'center',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
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
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
            Swift<span style={{ color: '#60a5fa' }}>Drop</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Delivery Platform</p>
        </div>
      </div>

      {verifyMutation.isPending && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0' }}>
          <Loader2 size={36} color="#3b82f6" className="animate-spin" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            Verifying your email...
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Please wait while we validate your security token.
          </p>
        </div>
      )}

      {verified && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
            Email Verified!
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Your email address has been successfully verified. Your account is now in full standing.
          </p>

          <Link
            href="/"
            style={{
              marginTop: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {errorMessage && !verifyMutation.isPending && !verified && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <AlertCircle size={32} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
            Verification Failed
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#f87171', lineHeight: 1.5 }}>
            {errorMessage}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
            The verification token may have expired (valid for 24 hours) or was already used.
          </p>

          {resendStatus && (
            <p style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '0.25rem' }}>
              {resendStatus}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.75rem' }}>
            <button
              onClick={handleResend}
              disabled={resendMutation.isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.7rem',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                color: '#60a5fa',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: resendMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={15} />
              <span>{resendMutation.isPending ? 'Requesting...' : 'Resend Verification Link'}</span>
            </button>

            <Link
              href="/login"
              style={{
                fontSize: '0.85rem',
                color: '#94a3b8',
                textDecoration: 'none',
              }}
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

