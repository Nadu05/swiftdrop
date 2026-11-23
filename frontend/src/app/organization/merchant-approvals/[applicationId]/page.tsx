'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldAlert,
  History,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  getMerchantApplicationById,
  approveMerchantApplication,
  rejectMerchantApplication,
} from '@/components/dispatcher/merchant-approvals/merchantApprovalApi';
import {
  requestMoreInfoMerchantApplication,
  suspendMerchantApplication,
  reinstateMerchantApplication,
} from '@/api/services/organization.api';
import type { MerchantApplication } from '@/components/dispatcher/merchant-approvals/types';

export default function OrganizationMerchantApplicationReviewPage() {
  const params = useParams();
  const applicationId = typeof params.applicationId === 'string' ? params.applicationId : '';

  const [application, setApplication] = useState<MerchantApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [provisionedCreds, setProvisionedCreds] = useState<{
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
    scopes: string[];
  } | null>(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  const loadApp = useCallback(async () => {
    if (!applicationId) return;
    try {
      setIsLoading(true);
      const data = await getMerchantApplicationById(applicationId);
      setApplication(data);
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  const handleApprove = async () => {
    if (!application) return;
    setActionError(null);
    setActionSuccess(null);
    setIsProcessing(true);
    try {
      const updated: any = await approveMerchantApplication(application.id, {
        reviewNotes: reviewNotes.trim() || 'Approved by Head Office Administration.',
      });
      setApplication(updated as unknown as MerchantApplication);
      if (updated?.provisionedCredentials?.clientSecret) {
        setProvisionedCreds(updated.provisionedCredentials);
      }
      setActionSuccess(
        `Merchant application ${application.id} has been APPROVED and OAuth 2.0 credentials were provisioned.`
      );
      setReviewNotes('');
    } catch (err: any) {
      setActionError(
        err?.message || 'Unable to approve application. Ensure you are signed in with Head Office ADMIN privileges.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !rejectionReason.trim()) return;
    setActionError(null);
    setActionSuccess(null);
    setIsProcessing(true);
    try {
      const updated = await rejectMerchantApplication(application.id, {
        rejectionReason: rejectionReason.trim(),
        reviewNotes: reviewNotes.trim() || rejectionReason.trim(),
      });
      setApplication(updated as unknown as MerchantApplication);
      setIsRejectModalOpen(false);
      setRejectionReason('');
      setReviewNotes('');
      setActionSuccess(`Merchant application ${application.id} has been REJECTED.`);
    } catch (err: any) {
      setActionError(
        err?.message || 'Unable to reject application. Ensure you are signed in with Head Office ADMIN privileges.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isActionable =
    application &&
    (application.status === 'PENDING' ||
      application.status === 'PENDING_REVIEW' ||
      application.status === 'CORRECTIONS_REQUESTED');

  return (
    <div className="dispatcher-overview" style={{ padding: '1.5rem 2rem' }}>
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <nav aria-label="Breadcrumb" className="dispatcher-breadcrumb">
            <Link href="/organization/merchants" style={{ color: 'inherit', textDecoration: 'none' }}>
              Head Office Merchant Approvals
            </Link>
            <span className="dispatcher-breadcrumb-separator">/</span>
            <Link
              href="/organization/merchants?tab=approvals"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              Approval Queue
            </Link>
            <span className="dispatcher-breadcrumb-separator">/</span>
            <span className="dispatcher-breadcrumb-current">
              {application?.businessName || applicationId}
            </span>
          </nav>

          <h1 className="dispatcher-overview__title">
            {application ? application.businessName : 'Merchant Application Review'}
          </h1>
          <p className="dispatcher-overview__subtitle">
            Head Office Administration review for merchant onboarding, business credentials, and approval decision.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          <Link
            href="/organization/merchants"
            className="dispatcher-overview__refresh-btn"
            style={{ textDecoration: 'none' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Merchant Approvals</span>
          </Link>
        </div>
      </header>

      {actionError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.85rem 1.1rem',
            marginBottom: '1rem',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.85rem 1.1rem',
            marginBottom: '1rem',
            borderRadius: '10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '0.85rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {provisionedCreds && (
        <div
          style={{
            padding: '1.15rem 1.25rem',
            marginBottom: '1.25rem',
            borderRadius: '12px',
            background: '#0b1528',
            border: '1px solid #10b981',
            color: '#e2e8f0',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ fontWeight: 800, color: '#34d399', marginBottom: '0.4rem' }}>
            OAuth 2.0 Merchant Credentials Provisioned (Copy Client Secret Now — Shown Once)
          </div>
          <div style={{ display: 'grid', gap: '0.35rem', fontFamily: 'monospace' }}>
            <div><strong>Client ID:</strong> {provisionedCreds.clientId}</div>
            <div style={{ color: '#6ee7b7' }}><strong>Client Secret:</strong> {provisionedCreds.clientSecret}</div>
            <div><strong>Token Endpoint:</strong> {provisionedCreds.tokenEndpoint}</div>
            <div><strong>Scopes:</strong> {provisionedCreds.scopes?.join(', ')}</div>
          </div>
        </div>
      )}

      {application && (application.status === 'PENDING' || application.status === 'APPROVED' || (application.status as string) === 'SUSPENDED') && (
        <article className="dispatcher-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {application.status === 'PENDING' && (
              <>
                <input
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value)}
                  placeholder="Request additional info message..."
                  style={{ flex: '1 1 240px', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  disabled={isProcessing || !infoMessage.trim()}
                  onClick={async () => {
                    setIsProcessing(true);
                    setActionError(null);
                    try {
                      const updated = await requestMoreInfoMerchantApplication(application.id, infoMessage.trim());
                      setApplication(updated as unknown as MerchantApplication);
                      setInfoMessage('');
                      setActionSuccess('Additional information requested from merchant.');
                    } catch (err: any) {
                      setActionError(err?.message || 'Unable to request additional information.');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', background: '#d97706', color: '#fff', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                >
                  Request Additional Info
                </button>
              </>
            )}

            {application.status === 'APPROVED' && (
              <>
                <input
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Suspension reason (revokes active OAuth credentials)..."
                  style={{ flex: '1 1 240px', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  disabled={isProcessing || !suspendReason.trim()}
                  onClick={async () => {
                    setIsProcessing(true);
                    setActionError(null);
                    try {
                      const updated = await suspendMerchantApplication(application.id, suspendReason.trim());
                      setApplication(updated as unknown as MerchantApplication);
                      setSuspendReason('');
                      setActionSuccess('Merchant suspended and active OAuth 2.0 credentials revoked.');
                    } catch (err: any) {
                      setActionError(err?.message || 'Unable to suspend merchant.');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                >
                  Suspend Merchant
                </button>
              </>
            )}

            {(application.status as string) === 'SUSPENDED' && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={async () => {
                  setIsProcessing(true);
                  setActionError(null);
                  try {
                    const updated = await reinstateMerchantApplication(application.id, 'Reinstated by System Administrator');
                    setApplication(updated as unknown as MerchantApplication);
                    setActionSuccess('Merchant reinstated to APPROVED.');
                  } catch (err: any) {
                    setActionError(err?.message || 'Unable to reinstate merchant.');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', background: '#059669', color: '#fff', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
              >
                Reinstate Merchant
              </button>
            )}
          </div>
        </article>
      )}

      {isLoading ? (
        <article className="dispatcher-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>Loading merchant submission details...</p>
        </article>
      ) : !application ? (
        <article className="dispatcher-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <ShieldAlert size={36} color="#ef4444" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            Application Not Found
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            No merchant application found for reference ID {applicationId}.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Link
              href="/organization/merchants"
              className="dispatcher-btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Return to Merchant Approvals
            </Link>
          </div>
        </article>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Status & Overview Banner */}
          <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="dispatcher-zone-code-badge" style={{ fontSize: '0.85rem' }}>
                    {application.id}
                  </span>
                  <span className="dispatcher-zone-area-tag" style={{ fontWeight: 600 }}>
                    {application.categoryLabel}
                  </span>
                </div>
                <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#64748b' }}>
                  Business Registration Number:{' '}
                  <strong>{application.businessRegistrationNumber}</strong> • Submitted:{' '}
                  {new Date(application.submittedAt).toLocaleString()}
                </div>
              </div>

              <div>
                <span
                  className="dispatcher-status-badge"
                  style={{
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.825rem',
                    background:
                      application.status === 'APPROVED'
                        ? '#f0fdf4'
                        : application.status === 'REJECTED'
                        ? '#fef2f2'
                        : '#eff6ff',
                    color:
                      application.status === 'APPROVED'
                        ? '#15803d'
                        : application.status === 'REJECTED'
                        ? '#b91c1c'
                        : '#1d4ed8',
                    border: '1px solid currentColor',
                  }}
                >
                  {application.statusLabel || application.status}
                </span>
              </div>
            </div>

            {application.rejectionReason && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  color: '#991b1b',
                }}
              >
                <strong>Rejection Reason ({application.reviewedBy || 'Head Office Admin'}):</strong>
                <p style={{ margin: '0.2rem 0 0' }}>{application.rejectionReason}</p>
              </div>
            )}

            {application.reviewNotes && !application.rejectionReason && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  color: '#166534',
                }}
              >
                <strong>Review Decision Note ({application.reviewedBy || 'Head Office Admin'}):</strong>
                <p style={{ margin: '0.2rem 0 0' }}>{application.reviewNotes}</p>
              </div>
            )}
          </article>

          {/* Head Office Decision Actions (Only when PENDING) */}
          {isActionable && (
            <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.5rem',
                }}
              >
                Head Office Verification Decision
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.85rem' }}>
                Only Head Office Administrators (`ROLE_ADMIN`) may approve or reject merchant onboarding applications.
              </p>

              <div style={{ marginBottom: '0.85rem' }}>
                <label
                  htmlFor="review-notes-input"
                  className="dispatcher-reports-filter-label"
                  style={{ display: 'block', marginBottom: '0.35rem' }}
                >
                  Verification / Audit Notes (Optional for Approval)
                </label>
                <input
                  id="review-notes-input"
                  type="text"
                  className="dispatcher-reports-date-input"
                  placeholder="Enter verification notes (e.g., BRN and address verified)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="dispatcher-btn-primary"
                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  <Check size={15} />
                  <span>{isProcessing ? 'Processing...' : 'Approve Application'}</span>
                </button>

                <button
                  type="button"
                  className="dispatcher-overview__refresh-btn"
                  style={{
                    color: '#dc2626',
                    borderColor: '#fecaca',
                    background: '#fef2f2',
                  }}
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={isProcessing}
                >
                  <XCircle size={15} />
                  <span>Reject Application</span>
                </button>
              </div>
            </article>
          )}

          {/* Details 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.85rem',
                }}
              >
                Contact &amp; Authorized Representative
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Full Name:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.contactPerson.fullName}</strong>{' '}
                  ({application.contactPerson.designation})
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Email:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.contactPerson.email}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Phone:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.contactPerson.phone}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Projected Daily Volume:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.expectedDailyVolume}</strong>
                </div>
              </div>
            </article>

            <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.85rem',
                }}
              >
                Operational Address &amp; Hub
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Street Address:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.businessAddress.street}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>City &amp; District:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {application.businessAddress.city}, {application.businessAddress.district}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Postal Code:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {application.businessAddress.postalCode}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Assigned Dispatch Hub:</span>{' '}
                  <strong style={{ color: '#0d9488' }}>
                    {application.businessAddress.nearestBranch}
                  </strong>
                </div>
              </div>
            </article>
          </div>

          {/* Submitted Verification Documents */}
          <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.85rem',
              }}
            >
              Verification Documents ({application.documents.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {application.documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 10,
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <FileText size={18} color="#2563eb" />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {doc.fileName} • {doc.fileSize}
                      </div>
                    </div>
                  </div>

                  <span
                    className="dispatcher-status-badge"
                    style={{
                      background:
                        doc.status === 'VERIFIED'
                          ? '#f0fdf4'
                          : doc.status === 'REJECTED'
                          ? '#fef2f2'
                          : '#eff6ff',
                      color:
                        doc.status === 'VERIFIED'
                          ? '#15803d'
                          : doc.status === 'REJECTED'
                          ? '#b91c1c'
                          : '#1d4ed8',
                    }}
                  >
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* Approval & Audit History Timeline */}
          {application.history && application.history.length > 0 && (
            <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <History size={16} color="#2563eb" />
                <span>Approval &amp; Audit History ({application.history.length})</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {application.history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <strong style={{ color: '#0f172a' }}>
                        {item.action} → {item.newStatus}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {item.actorEmail} •{' '}
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    {item.reason && (
                      <p style={{ margin: '0.3rem 0 0', color: '#475569' }}>{item.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && application && (
        <div
          className="dispatcher-modal-backdrop"
          onClick={() => setIsRejectModalOpen(false)}
        >
          <div
            className="dispatcher-modal"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="dispatcher-modal__header">
              <div>
                <h3 className="dispatcher-modal__title">Reject Merchant Application</h3>
                <p className="dispatcher-modal__subtitle">
                  Provide a clear rejection reason for {application.businessName} ({application.id}).
                </p>
              </div>
            </div>

            <form onSubmit={handleReject}>
              <div className="dispatcher-modal__body">
                <label
                  htmlFor="rejection-reason-textarea"
                  className="dispatcher-reports-filter-label"
                  style={{ display: 'block', marginBottom: '0.35rem' }}
                >
                  Rejection Reason *
                </label>
                <textarea
                  id="rejection-reason-textarea"
                  required
                  rows={4}
                  className="dispatcher-reports-date-input"
                  style={{ width: '100%', padding: '0.65rem' }}
                  placeholder="Explain why the application is rejected (e.g., mismatched BRN certificate or unsupported operating region)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div
                className="dispatcher-modal__footer"
                style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}
              >
                <button
                  type="button"
                  className="dispatcher-overview__refresh-btn"
                  onClick={() => setIsRejectModalOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dispatcher-btn-primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  disabled={isProcessing || !rejectionReason.trim()}
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

