'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Send,
  UserPlus,
} from 'lucide-react';
import {
  useBranchCredentials,
  useProvisionBranchCredentials,
  useResendBranchCredentials,
  useResetBranchCredentials,
} from '@/hooks/api/use-organization';
import type {
  BranchCredentialsResponse,
  BranchResponse,
  CredentialEmailStatus,
} from '@/types/organization.types';

export interface BranchManagerCredentialsCardProps {
  branch: BranchResponse;
}

function formatDateTime(isoString: string | undefined | null): string {
  if (!isoString) return 'Not available';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function EmailDeliveryBadge({
  status,
}: {
  status: CredentialEmailStatus | null | undefined;
}) {
  if (status === 'SENT') {
    return (
      <span className="org-status-badge org-status-badge--active">
        <span className="org-status-badge__dot" aria-hidden="true" />
        <span>SENT</span>
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="org-status-badge org-status-badge--inactive">
        <span className="org-status-badge__dot" aria-hidden="true" />
        <span>FAILED</span>
      </span>
    );
  }
  return (
    <span
      className="org-status-badge"
      style={{
        background: 'rgba(245, 158, 11, 0.14)',
        color: '#b45309',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      }}
    >
      <span
        className="org-status-badge__dot"
        style={{ backgroundColor: '#f59e0b' }}
        aria-hidden="true"
      />
      <span>{status ?? 'PENDING'}</span>
    </span>
  );
}

export default function BranchManagerCredentialsCard({
  branch,
}: BranchManagerCredentialsCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: credentials,
    isLoading,
    isError,
    error,
    refetch,
  } = useBranchCredentials(branch.id, true);

  const provisionMutation = useProvisionBranchCredentials(branch.id);
  const resendMutation = useResendBranchCredentials(branch.id);
  const resetMutation = useResetBranchCredentials(branch.id);

  const isMutating =
    provisionMutation.isPending ||
    resendMutation.isPending ||
    resetMutation.isPending;

  const handleCopyPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('Unable to copy temporary password to clipboard.');
    }
  };

  const handleActionResult = (
    updated: BranchCredentialsResponse,
    actionLabel: string
  ) => {
    setActionError(null);
    if (updated.credentialEmailStatus === 'SENT') {
      setActionMessage(
        `${actionLabel} Credential email sent to ${updated.loginEmail ?? branch.email}.`
      );
    } else if (updated.credentialEmailStatus === 'FAILED') {
      setActionMessage(
        `${actionLabel} However, email delivery failed: ${updated.credentialEmailError ?? 'SMTP delivery error.'}`
      );
    } else {
      setActionMessage(actionLabel);
    }
  };

  const runCredentialAction = async (
    mutate: () => Promise<BranchCredentialsResponse>,
    successLabel: string,
    fallbackError: string,
    options?: { hidePassword?: boolean }
  ) => {
    setActionMessage(null);
    setActionError(null);
    if (options?.hidePassword) {
      setShowPassword(false);
    }
    try {
      const updated = await mutate();
      handleActionResult(updated, successLabel);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : fallbackError);
    }
  };

  const handleProvision = () =>
    runCredentialAction(
      () => provisionMutation.mutateAsync(),
      'Branch Manager account provisioned.',
      'Failed to provision Branch Manager credentials.'
    );

  const handleResend = () =>
    runCredentialAction(
      () => resendMutation.mutateAsync(),
      'Credentials resent.',
      'Failed to resend Branch Manager credentials.'
    );

  const handleReset = () =>
    runCredentialAction(
      () => resetMutation.mutateAsync(),
      'Temporary password reset.',
      'Failed to reset Branch Manager credentials.',
      { hidePassword: true }
    );

  const hasBranchEmail = Boolean(branch.email && branch.email.trim().length > 0);

  return (
    <section
      className="org-details-card org-details-card--full"
      aria-labelledby="org-details-credentials-heading"
    >
      <div className="org-details-card__header">
        <div className="org-details-card__icon" aria-hidden="true">
          <KeyRound size={18} strokeWidth={2.1} />
        </div>
        <div>
          <h3
            id="org-details-credentials-heading"
            className="org-details-card__title"
          >
            Branch Manager Credentials
          </h3>
          <p className="org-details-card__subtitle">
            Login account, temporary initial password, and credential email delivery status
          </p>
        </div>
      </div>

      {actionMessage && (
        <div
          className="org-form-alert org-form-alert--success"
          role="status"
          aria-live="polite"
          style={{ marginBottom: '1rem' }}
        >
          <div className="org-form-alert__content">
            <CheckCircle2
              size={18}
              className="org-form-alert__icon"
              aria-hidden="true"
            />
            <p className="org-form-alert__desc" style={{ margin: 0 }}>
              {actionMessage}
            </p>
          </div>
        </div>
      )}

      {actionError && (
        <div
          className="org-form-alert org-form-alert--error"
          role="alert"
          style={{ marginBottom: '1rem' }}
        >
          <div className="org-form-alert__content">
            <AlertCircle
              size={18}
              className="org-form-alert__icon"
              aria-hidden="true"
            />
            <p className="org-form-alert__desc" style={{ margin: 0 }}>
              {actionError}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 0',
          }}
          role="status"
          aria-live="polite"
        >
          <Loader2 size={16} className="org-icon--spinning" aria-hidden="true" />
          <span className="org-branch-contact__muted">
            Loading Branch Manager credentials...
          </span>
        </div>
      ) : isError ? (
        <div className="org-form-alert org-form-alert--error" role="alert">
          <div className="org-form-alert__content">
            <AlertCircle
              size={18}
              className="org-form-alert__icon"
              aria-hidden="true"
            />
            <p className="org-form-alert__desc" style={{ margin: 0 }}>
              {error instanceof Error
                ? error.message
                : 'Unable to load Branch Manager credentials.'}
            </p>
          </div>
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => refetch()}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      ) : credentials && !credentials.provisioned ? (
        /* State 1: Unprovisioned (Legacy Branch) */
        <div>
          <dl className="org-details-list">
            <div className="org-details-list__item">
              <dt className="org-details-list__term">Account Status</dt>
              <dd className="org-details-list__desc">
                <span className="org-status-badge org-status-badge--inactive">
                  <span className="org-status-badge__dot" aria-hidden="true" />
                  <span>Not Provisioned</span>
                </span>
              </dd>
            </div>
            <div className="org-details-list__item">
              <dt className="org-details-list__term">Branch Email</dt>
              <dd className="org-details-list__desc">
                {hasBranchEmail ? (
                  <span>{branch.email}</span>
                ) : (
                  <span className="org-branch-contact__muted">
                    No email on file
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: 'flex-start',
            }}
          >
            <button
              type="button"
              className="org-btn org-btn--primary"
              disabled={!hasBranchEmail || isMutating}
              onClick={handleProvision}
            >
              {provisionMutation.isPending ? (
                <>
                  <Loader2
                    size={14}
                    className="org-icon--spinning"
                    aria-hidden="true"
                  />
                  <span>Provisioning...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} aria-hidden="true" />
                  <span>Provision &amp; Send Credentials</span>
                </>
              )}
            </button>

            {!hasBranchEmail && (
              <p className="org-form-hint" style={{ margin: 0 }}>
                Add a branch email address via Edit Branch before provisioning a
                Branch Manager account.
              </p>
            )}
          </div>
        </div>
      ) : credentials ? (
        /* State 2 & 3: Provisioned (Active Temporary Password OR Password Changed) */
        <div>
          <dl className="org-details-list org-details-list--grid-3">
            <div className="org-details-list__item">
              <dt className="org-details-list__term">Login Email</dt>
              <dd className="org-details-list__desc org-details-list__desc--strong">
                <span className="org-details-list__desc--with-icon">
                  <Mail size={13} aria-hidden="true" />
                  <span>{credentials.loginEmail ?? branch.email ?? '—'}</span>
                </span>
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Temporary Password</dt>
              <dd className="org-details-list__desc">
                {credentials.temporaryPassword != null ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <code className="org-inline-code">
                      {showPassword
                        ? credentials.temporaryPassword
                        : '••••••••••••'}
                    </code>
                    <button
                      type="button"
                      className="org-btn org-btn--ghost"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword
                          ? 'Hide temporary password'
                          : 'Show temporary password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={14} aria-hidden="true" />
                      ) : (
                        <Eye size={14} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="org-btn org-btn--secondary"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                      onClick={() =>
                        handleCopyPassword(credentials.temporaryPassword!)
                      }
                    >
                      {copied ? (
                        <>
                          <Check size={13} aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : !credentials.mustChangePassword ? (
                  <div>
                    <span className="org-branch-contact__muted">
                      Password changed by user
                    </span>
                    {credentials.passwordChangedAt && (
                      <div
                        className="org-form-hint"
                        style={{ marginTop: '0.2rem' }}
                      >
                        Changed on {formatDateTime(credentials.passwordChangedAt)}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="org-branch-contact__muted">
                    Temporary password unavailable — reset to issue a new one
                  </span>
                )}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Email Delivery Status</dt>
              <dd className="org-details-list__desc">
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <EmailDeliveryBadge
                    status={credentials.credentialEmailStatus}
                  />
                  {credentials.credentialEmailStatus === 'SENT' &&
                    credentials.credentialEmailSentAt && (
                      <span className="org-form-hint">
                        Sent {formatDateTime(credentials.credentialEmailSentAt)}
                      </span>
                    )}
                  {credentials.credentialEmailStatus === 'FAILED' &&
                    credentials.credentialEmailError && (
                      <span className="org-form-error" style={{ margin: 0 }}>
                        {credentials.credentialEmailError}
                      </span>
                    )}
                </div>
              </dd>
            </div>
          </dl>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              gap: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            {credentials.temporaryPassword != null && (
              <button
                type="button"
                className="org-btn org-btn--secondary"
                disabled={isMutating}
                onClick={handleResend}
              >
                {resendMutation.isPending ? (
                  <>
                    <Loader2
                      size={14}
                      className="org-icon--spinning"
                      aria-hidden="true"
                    />
                    <span>Resending...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} aria-hidden="true" />
                    <span>Resend Credentials</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              className="org-btn org-btn--primary"
              disabled={isMutating}
              onClick={handleReset}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2
                    size={14}
                    className="org-icon--spinning"
                    aria-hidden="true"
                  />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Reset &amp; Resend Credentials</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
