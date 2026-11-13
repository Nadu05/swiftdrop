'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Mail,
  Phone,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { getMerchantApplicationById } from '@/components/dispatcher/merchant-approvals/merchantApprovalApi';
import type { MerchantApplication } from '@/components/dispatcher/merchant-approvals/types';

export default function MerchantApplicationReviewPage() {
  const params = useParams();
  const applicationId = typeof params.applicationId === 'string' ? params.applicationId : '';

  const [application, setApplication] = useState<MerchantApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadApp() {
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
    }
    loadApp();
  }, [applicationId]);

  return (
    <div className="dispatcher-overview">
      {/* Header with Breadcrumb */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <nav aria-label="Breadcrumb" className="dispatcher-breadcrumb">
            <Link href="/dispatcher/merchants" style={{ color: 'inherit', textDecoration: 'none' }}>
              Merchant Management
            </Link>
            <span className="dispatcher-breadcrumb-separator">/</span>
            <Link href="/dispatcher/merchants?tab=approvals" style={{ color: 'inherit', textDecoration: 'none' }}>
              Approval Queue
            </Link>
            <span className="dispatcher-breadcrumb-separator">/</span>
            <span className="dispatcher-breadcrumb-current">{application?.businessName || applicationId}</span>
          </nav>

          <h1 className="dispatcher-overview__title">
            {application ? application.businessName : 'Application Review'}
          </h1>
          <p className="dispatcher-overview__subtitle">
            Verify submitted documents, business identity and operational compliance.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          <Link
            href="/dispatcher/merchants"
            className="dispatcher-overview__refresh-btn"
            style={{ textDecoration: 'none' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Merchant Management</span>
          </Link>
        </div>
      </header>

      {isLoading ? (
        <article className="dispatcher-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>Loading merchant submission details...</p>
        </article>
      ) : !application ? (
        <article className="dispatcher-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <ShieldAlert size={36} color="#ef4444" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Application Not Found</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            No merchant application found for reference ID {applicationId}.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/dispatcher/merchants" className="dispatcher-btn-primary" style={{ textDecoration: 'none' }}>
              Return to Merchant Management
            </Link>
          </div>
        </article>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Status & Overview Banner */}
          <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                  Business Registration Number: <strong>{application.businessRegistrationNumber}</strong> • Submitted: {new Date(application.submittedAt).toLocaleString()}
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
                        : application.status === 'CORRECTIONS_REQUESTED'
                        ? '#fffbeb'
                        : application.status === 'REJECTED'
                        ? '#fef2f2'
                        : '#eff6ff',
                    color:
                      application.status === 'APPROVED'
                        ? '#15803d'
                        : application.status === 'CORRECTIONS_REQUESTED'
                        ? '#b45309'
                        : application.status === 'REJECTED'
                        ? '#b91c1c'
                        : '#1d4ed8',
                    border: '1px solid currentColor',
                  }}
                >
                  {application.statusLabel}
                </span>
              </div>
            </div>

            {application.reviewNotes && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  color: '#92400e',
                }}
              >
                <strong>Previous Review Directive ({application.reviewedBy}):</strong>
                <p style={{ margin: '0.2rem 0 0' }}>{application.reviewNotes}</p>
              </div>
            )}
          </article>

          {/* Details 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Contact Person */}
            <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.85rem' }}>
                Contact &amp; Authorized Representative
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Full Name:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.contactPerson.fullName}</strong> ({application.contactPerson.designation})
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

            {/* Business Address */}
            <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.85rem' }}>
                Operational Address &amp; Hub
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Street Address:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.businessAddress.street}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>City &amp; District:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.businessAddress.city}, {application.businessAddress.district}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Postal Code:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{application.businessAddress.postalCode}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Assigned Dispatch Hub:</span>{' '}
                  <strong style={{ color: '#0d9488' }}>{application.businessAddress.nearestBranch}</strong>
                </div>
              </div>
            </article>
          </div>

          {/* Submitted Verification Documents */}
          <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.85rem' }}>
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

          {/* Phase 2 Notification Banner */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: '#f1f5f9',
              border: '1px dashed #cbd5e1',
              borderRadius: 10,
              fontSize: '0.8rem',
              color: '#475569',
              textAlign: 'center',
            }}
          >
            <em>Detailed Review Decision, Correction Request Form, and SLA contract assignment are scheduled for the next workflow phase.</em>
          </div>
        </div>
      )}
    </div>
  );
}

