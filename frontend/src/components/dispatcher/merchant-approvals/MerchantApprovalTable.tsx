'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Building,
} from 'lucide-react';
import type { MerchantApplication } from './types';

interface MerchantApprovalTableProps {
  applications: MerchantApplication[];
  isLoading?: boolean;
  error?: string | null;
}

export default function MerchantApprovalTable({
  applications,
  isLoading = false,
  error = null,
}: MerchantApprovalTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.max(1, Math.ceil(applications.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = applications.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatusBadge = (status: MerchantApplication['status'], label: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <span
            className="dispatcher-status-badge"
            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
          >
            <Clock size={12} />
            {label}
          </span>
        );
      case 'CORRECTIONS_REQUESTED':
        return (
          <span
            className="dispatcher-status-badge"
            style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
          >
            <AlertCircle size={12} />
            {label}
          </span>
        );
      case 'APPROVED':
        return (
          <span
            className="dispatcher-status-badge"
            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
          >
            <CheckCircle2 size={12} />
            {label}
          </span>
        );
      case 'REJECTED':
        return (
          <span
            className="dispatcher-status-badge"
            style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
          >
            <XCircle size={12} />
            {label}
          </span>
        );
      default:
        return <span className="dispatcher-status-badge">{label}</span>;
    }
  };

  return (
    <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Merchant Submissions Queue</h2>
          <p className="dispatcher-card__subtitle">
            Showing {applications.length} submitted business applications awaiting verification
          </p>
        </div>
      </div>

      {error ? (
        <div className="dispatcher-reports-alert dispatcher-reports-alert--error" style={{ margin: '1rem 0' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : (
        <div className="dispatcher-table-container">
          <table className="dispatcher-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Business Name &amp; Contact</th>
                <th>Category</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div className="dispatcher-reports-skeleton-list">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="dispatcher-reports-skeleton-item" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="dispatcher-table__empty">
                    <Building size={32} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                    <p>No merchant applications match the selected filter criteria.</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((app) => {
                  const isActionable =
                    app.status === 'PENDING_REVIEW' || app.status === 'CORRECTIONS_REQUESTED';

                  return (
                    <tr key={app.id}>
                      {/* Application ID */}
                      <td>
                        <span className="dispatcher-zone-code-badge">{app.id}</span>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                          BRN: {app.businessRegistrationNumber}
                        </div>
                      </td>

                      {/* Business Name */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{app.businessName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {app.contactPerson.fullName} • {app.contactPerson.phone}
                        </div>
                      </td>

                      {/* Business Category */}
                      <td>
                        <span
                          className="dispatcher-zone-area-tag"
                          style={{ fontWeight: 600, color: '#334155' }}
                        >
                          {app.categoryLabel}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          {app.businessAddress.city}
                        </div>
                      </td>

                      {/* Submission Date */}
                      <td>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                          {new Date(app.submittedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {new Date(app.submittedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Application Status */}
                      <td>{getStatusBadge(app.status, app.statusLabel)}</td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/dispatcher/merchant-approvals/${app.id}`}
                          className={
                            isActionable
                              ? 'dispatcher-btn-primary'
                              : 'dispatcher-overview__refresh-btn'
                          }
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                          }}
                          aria-label={`Open review for ${app.businessName}`}
                        >
                          <span>{isActionable ? 'Review' : 'View'}</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="dispatcher-zone-pagination">
          <span className="dispatcher-zone-pagination-text">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, applications.length)} of{' '}
            {applications.length} applications
          </span>
          <div className="dispatcher-zone-pagination-btns">
            <button
              type="button"
              className="dispatcher-overview__refresh-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="dispatcher-overview__refresh-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

