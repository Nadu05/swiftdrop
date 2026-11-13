'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/schema/user.schema';
import { useChangePassword } from '@/hooks/api/use-password';
import { getApiErrorMessage } from '@/api/services/auth.api';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Check,
  X,
  Loader2,
} from 'lucide-react';

export default function SecuritySettingsPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const changeMutation = useChangePassword();

  const {
    register,
    handleSubmit,
    watch,
    reset,
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

  // Password requirements checklist
  const rules = [
    { label: 'At least 8 characters', valid: newPasswordValue.length >= 8 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(newPasswordValue) },
    { label: 'At least one digit', valid: /[0-9]/.test(newPasswordValue) },
    { label: 'At least one special character', valid: /[^a-zA-Z0-9]/.test(newPasswordValue) },
  ];

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setFeedback(null);
    try {
      const res = await changeMutation.mutateAsync(values);
      setFeedback({ type: 'success', text: res.message || 'Password changed successfully! Refresh tokens have been rotated.' });
      reset();
    } catch (err) {
      setFeedback({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const isPending = isSubmitting || changeMutation.isPending;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          Password & Security Settings
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
          Update your login password and manage credential authentication security
        </p>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Change Password Card */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <KeyRound size={22} color="#60a5fa" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            Change Password
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Current Password */}
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                {...register('currentPassword')}
                placeholder="Enter current password"
                style={inputStyle(!!errors.currentPassword)}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={toggleBtnStyle}
              >
                {showCurrent ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
              </button>
            </div>
            {errors.currentPassword && <p style={errorStyle}>{errors.currentPassword.message}</p>}
          </div>

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
              >
                {showNew ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
              </button>
            </div>
            {errors.newPassword && <p style={errorStyle}>{errors.newPassword.message}</p>}

            {/* Checklist */}
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {rules.map((rule, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                  {rule.valid ? (
                    <Check size={13} color="#10b981" />
                  ) : (
                    <X size={13} color="#64748b" />
                  )}
                  <span style={{ color: rule.valid ? '#10b981' : '#64748b' }}>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm New Password */}
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
              >
                {showConfirm ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
              </button>
            </div>
            {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword.message}</p>}
          </div>

          {/* Security Notice */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#94a3b8',
              lineHeight: 1.4,
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>
              Changing your password will revoke other active refresh tokens across any other browsers or sessions.
            </span>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                background: isPending ? 'rgba(59, 130, 246, 0.3)' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
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
  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
  background: 'rgba(15, 23, 42, 0.7)',
  border: `1px solid ${hasError ? 'rgba(239,68,68,0.6)' : 'rgba(59,130,246,0.2)'}`,
  borderRadius: '8px',
  color: '#f8fafc',
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
  color: '#f87171',
};

