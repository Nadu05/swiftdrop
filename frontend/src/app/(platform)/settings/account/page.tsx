'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccountDetails, useDeactivateAccount } from '@/hooks/api/use-user';
import { useResendVerification } from '@/hooks/api/use-password';
import { getApiErrorMessage } from '@/api/services/auth.api';
import {
  UserCheck,
  Mail,
  ShieldAlert,
  Calendar,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  AlertCircle,
  X,
} from 'lucide-react';

export default function AccountSettingsPage() {
  const { data: account, isLoading, error: fetchError } = useAccountDetails();
  const deactivateMutation = useDeactivateAccount();
  const resendMutation = useResendVerification();

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async () => {
    setNotification(null);
    try {
      const res = await resendMutation.mutateAsync();
      setNotification({ type: 'success', text: res.message || 'Verification link sent to your email.' });
    } catch (err) {
      setNotification({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const handleDeactivate = async () => {
    if (confirmText.toLowerCase() !== 'deactivate') return;
    try {
      await deactivateMutation.mutateAsync();
    } catch (err) {
      setNotification({ type: 'error', text: getApiErrorMessage(err) });
      setShowDeactivateModal(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} color="#3b82f6" className="animate-spin" />
      </div>
    );
  }

  if (fetchError || !account) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171' }}>
          <AlertCircle size={20} />
          <h3 style={{ fontWeight: 600 }}>Failed to load account details</h3>
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          {getApiErrorMessage(fetchError)}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          Account Settings & Lifecycle
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
          View your account identity status, manage verification, and lifecycle controls
        </p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: notification.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Account Status Card */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
          Account Status & Identity
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Status */}
          <div style={infoBoxStyle}>
            <span style={infoLabelStyle}>ACCOUNT STATUS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  background: account.accountStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: account.accountStatus === 'ACTIVE' ? '#10b981' : '#f87171',
                  border: `1px solid ${account.accountStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {account.accountStatus}
              </span>
            </div>
          </div>

          {/* Verification */}
          <div style={infoBoxStyle}>
            <span style={infoLabelStyle}>EMAIL VERIFICATION</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  background: account.emailVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: account.emailVerified ? '#10b981' : '#f59e0b',
                  border: `1px solid ${account.emailVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                }}
              >
                {account.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}
              </span>
            </div>
          </div>

          {/* Created Date */}
          <div style={infoBoxStyle}>
            <span style={infoLabelStyle}>REGISTRATION DATE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', marginTop: '0.3rem' }}>
              <Calendar size={14} color="#60a5fa" />
              <span>{new Date(account.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Password Changed Date */}
          <div style={infoBoxStyle}>
            <span style={infoLabelStyle}>LAST PASSWORD CHANGE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', marginTop: '0.3rem' }}>
              <KeyRound size={14} color="#a855f7" />
              <span>
                {account.passwordChangedAt
                  ? new Date(account.passwordChangedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'Never changed'}
              </span>
            </div>
          </div>
        </div>

        {/* Email verification action banner */}
        {!account.emailVerified && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fbbf24' }}>
                  Your email address ({account.email}) is not yet verified
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Verify your email to ensure uninterrupted account security notifications.
                </p>
              </div>
            </div>
            <button
              onClick={handleResend}
              disabled={resendMutation.isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '6px',
                color: '#fbbf24',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: resendMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={14} />
              <span>{resendMutation.isPending ? 'Sending...' : 'Resend Verification'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Security Quick Link Card */}
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
          gap: '1rem',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            Password & Security
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Update your account password and review authentication security policies
          </p>
        </div>
        <Link
          href="/settings/security"
          style={{
            padding: '0.6rem 1.2rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Manage Security
        </Link>
      </div>

      {/* Danger Zone: Account Deactivation */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f87171' }}>
          <ShieldAlert size={20} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danger Zone: Account Deactivation</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Deactivating your account will instantly revoke all active sessions, invalidate refresh tokens, and suspend
          platform access. Your account state will be marked as DEACTIVATED. To reactivate later, contact SwiftDrop Support.
        </p>

        <div>
          <button
            onClick={() => setShowDeactivateModal(true)}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Deactivate My Account
          </button>
        </div>
      </div>

      {/* Deactivation Confirmation Modal */}
      {showDeactivateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '460px',
              width: '100%',
              background: '#111827',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f87171' }}>
                <AlertTriangle size={22} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Confirm Deactivation</h4>
              </div>
              <button
                onClick={() => setShowDeactivateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              Are you sure you want to deactivate your SwiftDrop account? You will be logged out immediately across all devices.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Type <strong style={{ color: '#f87171' }}>deactivate</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="deactivate"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setShowDeactivateModal(false)}
                style={{
                  padding: '0.6rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={confirmText.toLowerCase() !== 'deactivate' || deactivateMutation.isPending}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: confirmText.toLowerCase() === 'deactivate' ? '#dc2626' : 'rgba(220, 38, 38, 0.3)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: confirmText.toLowerCase() === 'deactivate' ? 'pointer' : 'not-allowed',
                }}
              >
                {deactivateMutation.isPending ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const infoBoxStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  background: 'rgba(15, 23, 42, 0.6)',
  borderRadius: '10px',
  border: '1px solid rgba(59, 130, 246, 0.1)',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.05em',
  display: 'block',
};

