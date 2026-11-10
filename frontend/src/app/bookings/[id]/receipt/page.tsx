'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  Download,
  Package,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Truck,
  User,
  Phone,
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { getOrderById } from '@/api/services/orders.api';
import type { DeliveryOrder } from '@/types/order.types';

/**
 * Member 06: Customer Booking Receipt View + Print/Download
 * Route: /bookings/[id]/receipt
 *
 * Fetches authoritative booking record from GET /api/v1/orders/{id}.
 * Formatted as an official business receipt ready for printing or saving as PDF.
 */
export default function CustomerReceiptPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getOrderById(id);
      setOrder(data);
    } catch (err: any) {
      setError(
        err.message || 'Unable to retrieve order receipt. Please check your network connection.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

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
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ---------------- SCREEN-ONLY NAVIGATION & ACTIONS (NO-PRINT) ---------------- */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Link
          href={`/bookings/${id}`}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Order Details
        </Link>

        {order && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              href={`/tracking?number=${encodeURIComponent(order.trackingNumber)}`}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Truck size={15} /> Track Parcel
            </Link>

            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-secondary"
              title="Save receipt as a PDF using your browser's Print dialog"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Download size={15} /> Download / PDF
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Printer size={15} /> Print Receipt
            </button>
          </div>
        )}
      </div>

      {/* ---------------- STATE 1: LOADING ---------------- */}
      {isLoading && (
        <div
          className="glass-card"
          style={{
            padding: '4rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <Loader2 size={36} color="#3b82f6" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>Loading official receipt...</div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Fetching verified booking #{id} from Order Service
          </p>
        </div>
      )}

      {/* ---------------- STATE 2: ERROR ---------------- */}
      {!isLoading && error && (
        <div
          className="glass-card"
          style={{
            padding: '2.5rem',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            flexDirection: 'column',
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
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={30} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>Unable to Load Receipt</h2>
          <p style={{ fontSize: '0.875rem', color: '#cbd5e1', maxWidth: '480px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={fetchOrder} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              Try Again
            </button>
            <Link href="/bookings" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
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
                <div className="brand-subtitle">Parcel Delivery & Courier Management System</div>
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
                <span className="status-badge">{order.status || 'Created'}</span>
              </div>
            </div>
          </div>

          {/* Authoritative Tracking Banner */}
          <div className="tracking-strip">
            <div className="tracking-text">
              <span className="label">OFFICIAL TRACKING NUMBER:</span>
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
                  <Check size={14} color="#10b981" /> Copied
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
              </div>
            </div>
          </div>

          {/* Parcel Specifications Table */}
          <div className="spec-card">
            <div className="spec-title">
              <Package size={15} /> PARCEL & SHIPMENT INFORMATION
            </div>
            <table className="spec-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Size Category</th>
                  <th>Weight (KG)</th>
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
                  <td>#{order.id}</td>
                </tr>
              </tbody>
            </table>

            {order.deliveryInstructions && (
              <div className="instructions-box">
                <strong>Delivery Instructions:</strong> {order.deliveryInstructions}
              </div>
            )}
          </div>

          {/* Pricing & Fee Summary */}
          <div className="financial-card">
            <div className="financial-row">
              <span className="fee-label">Standard Delivery & Handling Fee</span>
              <span className="fee-amount">
                {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
              </span>
            </div>
            <div className="financial-divider" />
            <div className="total-row">
              <span className="total-label">TOTAL AMOUNT</span>
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
                <ShieldCheck size={14} color="#10b981" /> Verified Order Service Record
              </div>
              <p>
                Thank you for choosing SwiftDrop. Keep this receipt for your records. For public tracking, anyone can visit the tracking portal with this tracking number.
              </p>
              <p className="support-line">
                Support: support@swiftdrop.io | SwiftDrop Courier Management
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- STYLES (SCREEN & PRINT) ---------------- */}
      <style jsx global>{`
        /* Screen Card Styles */
        .receipt-container {
          background: #0f172a;
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 16px;
          padding: 2.5rem;
          color: #f8fafc;
          display: flex;
          flexDirection: column;
          gap: 1.75rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
        }

        .receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px rgba(59, 130, 246, 0.4);
        }

        .brand-title {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
        }

        .brand-title span {
          color: #60a5fa;
        }

        .brand-subtitle {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .receipt-pill {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          margin-top: 0.4rem;
        }

        .receipt-meta {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.85rem;
          text-align: right;
        }

        .meta-row {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .meta-label {
          color: #64748b;
        }

        .meta-value {
          color: #e2e8f0;
          font-weight: 600;
          font-family: monospace;
        }

        .status-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        /* Tracking Strip */
        .tracking-strip {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 10px;
          padding: 0.9rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tracking-text {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .tracking-text .label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #94a3b8;
        }

        .tracking-text .number {
          font-family: monospace;
          font-size: 1.15rem;
          font-weight: 700;
          color: #60a5fa;
          letter-spacing: 0.05em;
        }

        .copy-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        /* Parties Grid */
        .parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .party-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .party-title {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .party-title.origin {
          color: #60a5fa;
        }

        .party-title.destination {
          color: #34d399;
        }

        .party-address {
          font-size: 0.95rem;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.4;
        }

        .party-contacts {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 0.25rem;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .contact-row strong {
          color: #e2e8f0;
        }

        /* Parcel Specification Table */
        .spec-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .spec-title {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #a78bfa;
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
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.5rem 0.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .spec-table td {
          padding: 0.75rem 0.25rem;
          color: #ffffff;
          font-weight: 500;
        }

        .size-badge {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .instructions-box {
          font-size: 0.8rem;
          color: #cbd5e1;
          background: rgba(0, 0, 0, 0.2);
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }

        /* Financial Card */
        .financial-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 10px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .financial-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #cbd5e1;
        }

        .financial-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 0.25rem 0;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .total-label {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #ffffff;
        }

        .total-amount {
          font-size: 1.4rem;
          font-weight: 800;
          color: #34d399;
          font-family: monospace;
        }

        .authoritative-note {
          font-size: 0.75rem;
          color: #64748b;
          font-style: italic;
        }

        /* Receipt Footer */
        .receipt-footer {
          border-top: 1px dashed rgba(255, 255, 255, 0.15);
          padding-top: 1.5rem;
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
          padding: 0.5rem 1rem;
          background: rgba(0, 0, 0, 0.25);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .barcode-bars {
          font-family: monospace;
          letter-spacing: 0.2em;
          font-weight: 700;
          font-size: 1.1rem;
          color: #94a3b8;
        }

        .barcode-code {
          font-family: monospace;
          font-size: 0.75rem;
          color: #64748b;
        }

        .footer-notes {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: #94a3b8;
          max-width: 480px;
        }

        .verification-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #10b981;
        }

        .support-line {
          color: #64748b;
        }

        /* ==============================================================
           PRINT OPTIMIZATIONS (@media print)
           Triggered by browser window.print() and Save-as-PDF.
           Converts receipt to crisp high-contrast black/white for A4 printing.
           ============================================================== */
        @media print {
          /* Hide application chrome: sidebar, top nav, buttons */
          aside,
          .no-print,
          nav,
          button {
            display: none !important;
          }

          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .app-container {
            display: block !important;
            min-height: auto !important;
          }

          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
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

          .receipt-header {
            border-bottom: 2px solid #e2e8f0 !important;
          }

          .brand-title {
            color: #0f172a !important;
          }

          .brand-title span {
            color: #2563eb !important;
          }

          .brand-subtitle {
            color: #475569 !important;
          }

          .receipt-pill {
            background: #e0e7ff !important;
            color: #1e3a8a !important;
            border: 1px solid #c7d2fe !important;
          }

          .meta-label {
            color: #475569 !important;
          }

          .meta-value {
            color: #0f172a !important;
          }

          .status-badge {
            background: #dcfce7 !important;
            color: #166534 !important;
            border: 1px solid #bbf7d0 !important;
          }

          .tracking-strip {
            background: #f1f5f9 !important;
            border: 1px solid #cbd5e1 !important;
          }

          .tracking-text .label {
            color: #475569 !important;
          }

          .tracking-text .number {
            color: #1e40af !important;
          }

          .parties-grid {
            gap: 16px !important;
          }

          .party-card {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
          }

          .party-title.origin {
            color: #1e40af !important;
          }

          .party-title.destination {
            color: #166534 !important;
          }

          .party-address {
            color: #0f172a !important;
          }

          .party-contacts {
            color: #475569 !important;
          }

          .contact-row strong {
            color: #0f172a !important;
          }

          .spec-card {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
          }

          .spec-title {
            color: #4338ca !important;
          }

          .spec-table th {
            color: #475569 !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }

          .spec-table td {
            color: #0f172a !important;
          }

          .size-badge {
            background: #ede9fe !important;
            color: #4338ca !important;
          }

          .instructions-box {
            background: #f1f5f9 !important;
            color: #334155 !important;
            border-left: 3px solid #2563eb !important;
          }

          .financial-card {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
          }

          .financial-row {
            color: #334155 !important;
          }

          .financial-divider {
            background: #cbd5e1 !important;
          }

          .total-label {
            color: #0f172a !important;
          }

          .total-amount {
            color: #15803d !important;
          }

          .receipt-footer {
            border-top: 1px dashed #94a3b8 !important;
          }

          .barcode-box {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
          }

          .barcode-bars {
            color: #0f172a !important;
          }

          .barcode-code {
            color: #334155 !important;
          }

          .footer-notes {
            color: #475569 !important;
          }

          .verification-badge {
            color: #15803d !important;
          }
        }
      `}</style>
    </div>
  );
}
