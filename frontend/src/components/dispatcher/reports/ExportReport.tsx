'use client';

import React, { useState } from 'react';
import { Download, FileText, CheckCircle2, X, AlertCircle, Printer } from 'lucide-react';
import type { ReportsDataBundle, ReportFilterState } from './types';
import { generateReportsCSV } from './reportsApi';

interface ExportReportProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReportsDataBundle | null;
  filters: ReportFilterState;
  branchLabel: string;
}

export default function ExportReport({
  isOpen,
  onClose,
  data,
  filters,
  branchLabel,
}: ExportReportProps) {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleExportCSV = async () => {
    if (!data) return;
    try {
      setIsExportingCSV(true);
      setFeedback(null);

      // Simulate a small preparation delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const csvString = generateReportsCSV(data, filters, branchLabel);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `swiftdrop-reports-${new Date().toISOString().split('T')[0]}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedback({
        type: 'success',
        message: `Successfully generated and downloaded ${filename}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to generate CSV export.',
      });
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handlePrintPDF = () => {
    try {
      setFeedback({
        type: 'success',
        message: 'Opening system print preview for PDF generation...',
      });
      setTimeout(() => {
        window.print();
      }, 200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Unable to open print preview.',
      });
    }
  };

  return (
    <div className="dispatcher-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
      <div className="dispatcher-modal-content dispatcher-export-modal">
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div className="dispatcher-modal-header__info">
            <h3 id="export-modal-title" className="dispatcher-modal-title">Export Operations Report</h3>
            <p className="dispatcher-modal-subtitle">
              Download filtered analytics for audits, merchant reviews, and SLA reporting
            </p>
          </div>
          <button
            type="button"
            className="dispatcher-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="dispatcher-modal-body">
          {/* Active Filter Scope Summary */}
          <div className="dispatcher-export-scope-card">
            <span className="dispatcher-export-scope-title">Export Scope Applied:</span>
            <ul className="dispatcher-export-scope-list">
              <li>
                <strong>Date Range:</strong> {filters.dateRange.toUpperCase()}
                {filters.startDate && filters.endDate ? ` (${filters.startDate} to ${filters.endDate})` : ''}
              </li>
              <li>
                <strong>Branch Scope:</strong> {branchLabel}
              </li>
              <li>
                <strong>Service Type:</strong> {filters.serviceType}
              </li>
              {data && (
                <li>
                  <strong>Total Records in Scope:</strong> {data.metrics.totalDeliveries.toLocaleString()} orders
                </li>
              )}
            </ul>
          </div>

          {/* Feedback Alerts */}
          {feedback && (
            <div
              className={`dispatcher-reports-alert ${
                feedback.type === 'success'
                  ? 'dispatcher-reports-alert--success'
                  : 'dispatcher-reports-alert--error'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Export Options Buttons */}
          <div className="dispatcher-export-options-grid">
            {/* CSV Export Option */}
            <div className="dispatcher-export-option-card">
              <div className="dispatcher-export-option-icon dispatcher-export-option-icon--csv">
                <FileText size={22} />
              </div>
              <div className="dispatcher-export-option-text">
                <strong>Comma-Separated Values (.CSV)</strong>
                <p>Complete raw dataset including summary metrics, status breakdowns, and branch records.</p>
              </div>
              <button
                type="button"
                className="dispatcher-btn-primary dispatcher-export-btn"
                onClick={handleExportCSV}
                disabled={isExportingCSV || !data}
              >
                <Download size={14} />
                <span>{isExportingCSV ? 'Generating CSV...' : 'Download CSV'}</span>
              </button>
            </div>

            {/* Printable PDF Export Option */}
            <div className="dispatcher-export-option-card">
              <div className="dispatcher-export-option-icon dispatcher-export-option-icon--pdf">
                <Printer size={22} />
              </div>
              <div className="dispatcher-export-option-text">
                <strong>Printable Report / Save as PDF</strong>
                <p>Print-optimized layout of this dashboard suitable for executive management and stakeholders.</p>
              </div>
              <button
                type="button"
                className="dispatcher-overview__refresh-btn dispatcher-export-btn"
                onClick={handlePrintPDF}
                disabled={!data}
              >
                <Printer size={14} />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="dispatcher-modal-footer">
          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

