'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  Download,
  Package,
  MapPin,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Truck,
  User,
  Phone,
  FileText,
  Building2,
  CreditCard,
} from 'lucide-react';
import { getOrderById } from '@/api/services/orders.api';
import type { DeliveryOrder } from '@/types/order.types';

/**
 * Member 06: Customer Booking Receipt View + Print/Download
 * Route: /bookings/[id]/receipt
 *
 * Fetches authoritative booking record from GET /api/v1/orders/{id} via TanStack Query.
 * Formatted as an official business receipt ready for printing or saving as PDF.
 */
export default function CustomerReceiptPage() {
  const params = useParams();
  const id = params?.id as string;

  const [copied, setCopied] = useState<boolean>(false);

  const orderQuery = useQuery<DeliveryOrder, Error>({
    queryKey: ['customer-order', id],
    queryFn: () => getOrderById(id),
    enabled: Boolean(id),
    retry: false,
  });

  const order = orderQuery.data ?? null;
  const isLoading = orderQuery.isLoading || orderQuery.isFetching;
  const error = orderQuery.error
    ? orderQuery.error.message || 'Unable to retrieve order receipt. Please check your network connection.'
    : null;

  const handleCopyTracking = () => {
    if (order?.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Browser-native print trigger.
   * Modern browsers (Chrome, Edge, Safari, Firefox) allow users to directly
   * print to physical paper or choose "Save as PDF" from the destination dropdown.
   */
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR (NO-PRINT) ---------------- */}
      <header className="sd-fullpage-header no-print">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href={`/bookings/${id}`} className="sd-back-btn" aria-label={`Back to Order #${id}`}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="sd-header-title">Official Booking Receipt</h1>
              <div className="sd-header-sub">
                Order #{id} {order?.trackingNumber ? `· ${order.trackingNumber}` : ''}
              </div>
            </div>
          </div>

          {order && (
            <div className="sd-header-actions" style={{ flexWrap: 'wrap' }}>
              <Link
                href={`/tracking?number=${encodeURIComponent(order.trackingNumber)}`}
                className="sd-header-action-btn secondary"
              >
                <Truck size={15} /> Track Parcel
              </Link>

              <button
                type="button"
                onClick={handlePrint}
                className="sd-header-action-btn secondary"
                title="Save receipt as a PDF using your browser's Print dialog"
              >
                <Download size={15} /> Download / PDF
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="sd-header-book-btn"
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ---------------- BODY CONTENT ---------------- */}
      <div className="sd-fullpage-body">
        <div className="sd-content-wrapper" style={{ maxWidth: '880px' }}>
          {/* ---------------- STATE 1: LOADING ---------------- */}
          {isLoading && (
            <div
              className="sd-card-panel"
              style={{
                padding: '4rem 2rem',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '0.85rem',
              }}
            >
              <Loader2 size={36} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Loading official receipt...
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Fetching verified booking #{id} from Order Service
              </p>
            </div>
          )}

          {/* ---------------- STATE 2: ERROR ---------------- */}
          {!isLoading && error && (
            <div
              className="sd-card-panel"
              style={{
                padding: '2.5rem',
                borderColor: '#fecaca',
                background: '#fef2f2',
                alignItems: 'center',
                textAlign: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={30} color="#dc2626" />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                Unable to Load Receipt
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#7f1d1d', maxWidth: '480px', margin: 0 }}>
                {error}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => orderQuery.refetch()}
                  className="sd-receipt-btn-primary"
                >
                  Try Again
                </button>
                <Link href="/bookings" className="sd-receipt-btn-outline">
                  Return to Deliveries
                </Link>
              </div>
            </div>
          )}

          {/* ---------------- STATE 3: VERIFIED RECEIPT CARD ---------------- */}
          {!isLoading && order && (
            <div className="receipt-container">
              {/* Receipt Top Header */}
              <div className="receipt-header">
                <div className="brand-block">
                  <div className="brand-logo">
                    <FileText size={24} color="#ffffff" />
                  </div>
                  <div>
                    <div className="brand-title">
                      Swift<span>Drop</span> Logistics
                    </div>
                    <div className="brand-subtitle">Parcel Delivery &amp; Courier Management System</div>
                    <div className="receipt-pill">Official Booking Receipt</div>
                  </div>
                </div>

                <div className="receipt-meta">
                  <div className="meta-row">
                    <span className="meta-label">Receipt Ref:</span>
                    <span className="meta-value">REC-{String(order.id).padStart(6, '0')}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Date Issued:</span>
                    <span className="meta-value">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Order Status:</span>
                    <span className="status-badge">{order.statusLabel || order.status || 'Created'}</span>
                  </div>
                </div>
              </div>

              {/* Authoritative Tracking Banner */}
              <div className="tracking-strip">
                <div className="tracking-text">
                  <span className="label">OFFICIAL TRACKING NUMBER</span>
                  <span className="number">{order.trackingNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyTracking}
                  className="copy-btn no-print"
                  title="Copy tracking number"
                >
                  {copied ? (
                    <>
                      <Check size={14} color="#16a34a" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy
                    </>
                  )}
                </button>
              </div>

              {/* Sender & Recipient Columns */}
              <div className="parties-grid">
                {/* Origin Details */}
                <div className="party-card">
                  <div className="party-title origin">
                    <MapPin size={15} /> SENDER / PICKUP DETAILS
                  </div>
                  <div className="party-address">{order.pickupAddress}</div>
                  <div className="party-contacts">
                    {order.pickupContactName && (
                      <div className="contact-row">
                        <User size={13} /> Contact: <strong>{order.pickupContactName}</strong>
                      </div>
                    )}
                    {order.pickupContactPhone && (
                      <div className="contact-row">
                        <Phone size={13} /> Phone: <strong>{order.pickupContactPhone}</strong>
                      </div>
                    )}
                    {order.originBranchName && (
                      <div className="contact-row">
                        <Building2 size={13} /> Origin Branch:{' '}
                        <strong>
                          {order.originBranchName} {order.originBranchCode ? `(${order.originBranchCode})` : ''}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Details */}
                <div className="party-card">
                  <div className="party-title destination">
                    <MapPin size={15} /> RECIPIENT / DELIVERY DETAILS
                  </div>
                  <div className="party-address">{order.dropoffAddress}</div>
                  <div className="party-contacts">
                    {order.dropoffContactName && (
                      <div className="contact-row">
                        <User size={13} /> Recipient: <strong>{order.dropoffContactName}</strong>
                      </div>
                    )}
                    {order.dropoffContactPhone && (
                      <div className="contact-row">
                        <Phone size={13} /> Phone: <strong>{order.dropoffContactPhone}</strong>
                      </div>
                    )}
                    {order.destinationBranchName && (
                      <div className="contact-row">
                        <Building2 size={13} /> Destination Branch:{' '}
                        <strong>
                          {order.destinationBranchName}{' '}
                          {order.destinationBranchCode ? `(${order.destinationBranchCode})` : ''}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Parcel Specifications Table */}
              <div className="spec-card">
                <div className="spec-title">
                  <Package size={15} /> PARCEL &amp; SHIPMENT INFORMATION
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="spec-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Size Category</th>
                        <th>Weight (KG)</th>
                        <th>Pickup Method</th>
                        <th>Booking ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{order.parcelDescription || 'Standard Parcel'}</td>
                        <td>
                          <span className="size-badge">{order.parcelSize || 'STANDARD'}</span>
                        </td>
                        <td>{order.weightKg ? `${order.weightKg} kg` : '—'}</td>
                        <td>{order.pickupMethod === 'BRANCH_DROPOFF' ? 'Branch Drop-Off' : 'Courier Pickup'}</td>
                        <td>#{order.id}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {order.deliveryInstructions && (
                  <div className="instructions-box">
                    <strong>Delivery Instructions:</strong> {order.deliveryInstructions}
                  </div>
                )}
              </div>

              {/* Pricing & Fee Summary */}
              <div className="financial-card">
                <div className="financial-row">
                  <span className="fee-label">
                    <CreditCard size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                    Payment Method &amp; Status
                  </span>
                  <span className="fee-amount">
                    {order.paymentMethod || 'PREPAID'} · {order.paymentStatus || 'UNPAID'}
                  </span>
                </div>
                {order.paymentMethod === 'COD' && Number(order.codAmount || 0) > 0 && (
                  <div className="financial-row">
                    <span className="fee-label">COD Item Collection Value (Separate from Delivery Fee)</span>
                    <span className="fee-amount">
                      {order.currency || 'LKR'} {Number(order.codAmount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="financial-row">
                  <span className="fee-label">Standard Delivery &amp; Handling Fee</span>
                  <span className="fee-amount">
                    {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="financial-divider" />
                <div className="total-row">
                  <span className="total-label">TOTAL DELIVERY FEE</span>
                  <span className="total-amount">
                    {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="authoritative-note">
                  ✓ Authoritative fee calculated and stored by Order Service. No hidden charges.
                </div>
              </div>

              {/* Simulated Barcode & Verification Footer */}
              <div className="receipt-footer">
                <div className="barcode-box">
                  <div className="barcode-bars">
                    ||| | |||| | ||| |||| | || | |||| ||| | |||| | ||| || | ||||
                  </div>
                  <div className="barcode-code">{order.trackingNumber}</div>
                </div>

                <div className="footer-notes">
                  <div className="verification-badge">
                    <ShieldCheck size={15} color="#16a34a" /> Verified Order Service Record
                  </div>
                  <p style={{ margin: 0 }}>
                    Thank you for choosing SwiftDrop. Keep this receipt for your records. For public tracking, anyone can
                    visit the tracking portal with this tracking number.
                  </p>
                  <p className="support-line" style={{ margin: 0 }}>
                    Support: support@swiftdrop.io | SwiftDrop Courier Management
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- STYLES (SCREEN & PRINT) ---------------- */}
      <style jsx global>{`
        .sd-receipt-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #2563eb;
          color: #ffffff;
          border: 1px solid #2563eb;
          border-radius: 8px;
          padding: 0.55rem 1.05rem;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .sd-receipt-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.55rem 1.05rem;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }

        /* Screen Card Styles — Crisp Light Theme */
        .receipt-container {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 2.25rem;
          color: #0f172a;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 1.5rem;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .brand-block {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .brand-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          flex-shrink: 0;
        }

        .brand-title {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
        }

        .brand-title span {
          color: #2563eb;
        }

        .brand-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 2px;
        }

        .receipt-pill {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: #dbeafe;
          color: #1d4ed8;
          padding: 0.2rem 0.65rem;
          border-radius: 9999px;
          margin-top: 0.45rem;
        }

        .receipt-meta {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          font-size: 0.85rem;
          text-align: right;
        }

        .meta-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 0.5rem;
        }

        .meta-label {
          color: #64748b;
        }

        .meta-value {
          color: #0f172a;
          font-weight: 600;
          font-family: monospace;
        }

        .status-badge {
          background: #dcfce7;
          color: #15803d;
          padding: 0.15rem 0.55rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        /* Tracking Strip */
        .tracking-strip {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          padding: 0.95rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .tracking-text {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .tracking-text .label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #475569;
        }

        .tracking-text .number {
          font-family: monospace;
          font-size: 1.15rem;
          font-weight: 800;
          color: #1d4ed8;
          letter-spacing: 0.04em;
        }

        .copy-btn {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: background 0.15s;
        }
        .copy-btn:hover {
          background: #f8fafc;
        }

        /* Parties Grid */
        .parties-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
        }

        .party-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .party-title {
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .party-title.origin {
          color: #2563eb;
        }

        .party-title.destination {
          color: #15803d;
        }

        .party-address {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.4;
        }

        .party-contacts {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          font-size: 0.82rem;
          color: #475569;
          margin-top: 0.25rem;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .contact-row strong {
          color: #0f172a;
        }

        /* Parcel Specification Table */
        .spec-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .spec-title {
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #4338ca;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .spec-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .spec-table th {
          text-align: left;
          color: #64748b;
          font-weight: 700;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.55rem 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .spec-table td {
          padding: 0.75rem 0.5rem;
          color: #0f172a;
          font-weight: 600;
        }

        .size-badge {
          background: #e0e7ff;
          color: #4338ca;
          font-size: 0.72rem;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          font-weight: 700;
        }

        .instructions-box {
          font-size: 0.82rem;
          color: #334155;
          background: #ffffff;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          border-left: 3px solid #2563eb;
        }

        /* Financial Card */
        .financial-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .financial-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          font-size: 0.88rem;
          color: #475569;
          flex-wrap: wrap;
        }

        .fee-amount {
          font-weight: 600;
          color: #0f172a;
        }

        .financial-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 0.25rem 0;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .total-label {
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #0f172a;
        }

        .total-amount {
          font-size: 1.4rem;
          font-weight: 800;
          color: #15803d;
          font-family: monospace;
        }

        .authoritative-note {
          font-size: 0.76rem;
          color: #64748b;
          font-style: italic;
        }

        /* Receipt Footer */
        .receipt-footer {
          border-top: 1px dashed #cbd5e1;
          padding-top: 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .barcode-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.6rem 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .barcode-bars {
          font-family: monospace;
          letter-spacing: 0.2em;
          font-weight: 700;
          font-size: 1.1rem;
          color: #0f172a;
        }

        .barcode-code {
          font-family: monospace;
          font-size: 0.75rem;
          color: #475569;
        }

        .footer-notes {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: #475569;
          max-width: 480px;
        }

        .verification-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #15803d;
        }

        .support-line {
          color: #64748b;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* ==============================================================
           PRINT OPTIMIZATIONS (@media print)
           ============================================================== */
        @media print {
          aside,
          .no-print,
          nav,
          button,
          .sd-topbar {
            display: none !important;
          }

          body,
          .customer-app-shell,
          .customer-main-content,
          .sd-fullpage-root,
          .sd-fullpage-body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .receipt-container {
            background: #ffffff !important;
            color: #0f172a !important;
            border: 2px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 24px !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
