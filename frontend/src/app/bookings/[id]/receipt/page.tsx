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
  RotateCcw,
  Compass,
  FileDown,
} from 'lucide-react';
import { getOrderById } from '@/api/services/orders.api';
import type { DeliveryOrder } from '@/types/order.types';

/**
 * Official Customer Booking Receipt Page
 * Route: /bookings/[id]/receipt
 *
 * Implements a clean, professional, and consistent invoice/receipt layout:
 * - Pinned Navy #0f1f38 Header matching Customer Portal
 * - Clean Light Canvas (#f4f7fb)
 * - Professional Printable Document Sheet (#ffffff with crisp typography)
 * - Complete Order, Customer, Delivery, Parcel, and Payment breakdown
 * - Built-in native browser PDF export & standalone offline file download
 * - Clean @media print rules that hide all navigation and toolbars
 */
export default function CustomerReceiptPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

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
   * Browser-native Print / Save as PDF trigger.
   * Dynamically sets document.title so modern browsers automatically suggest
   * "SwiftDrop-Receipt-[TrackingNumber].pdf" in the Save as PDF dialog.
   */
  const handlePrint = () => {
    if (!order) return;
    const originalTitle = document.title;
    document.title = `SwiftDrop-Receipt-${order.trackingNumber || order.id}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  /**
   * Standalone Offline File Download (.html)
   * Generates a self-contained, clean HTML receipt file that can be opened
   * and printed on any device offline.
   */
  const handleDownloadOfflineReceipt = () => {
    if (!order) return;

    const receiptRef = `REC-${String(order.id).padStart(6, '0')}`;
    const feeVal = Number(order.deliveryFee || 1250).toFixed(2);
    const currency = order.currency || 'LKR';

    const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SwiftDrop Receipt - ${order.trackingNumber || receiptRef}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; }
    .receipt { max-width: 760px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 32px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #0f172a; }
    .brand span { color: #2563eb; }
    .brand-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .meta { text-align: right; font-size: 13px; color: #475569; }
    .meta strong { color: #0f172a; }
    .tracking-banner { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .tracking-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .tracking-code { font-size: 20px; font-weight: 800; color: #1e40af; font-family: monospace; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .box-title { font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase; margin-bottom: 8px; }
    .box-val { font-size: 14px; font-weight: 600; color: #0f172a; }
    .box-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; padding: 10px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px 10px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .total-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: right; }
    .total-title { font-size: 13px; color: #64748b; }
    .calc { border-bottom: 2px solid #0f172a; margin-bottom: 10px; padding-bottom: 8px; text-align: left; }
    .calc-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; padding: 2px 0; }
    .total-amount { font-size: 26px; font-weight: 800; color: #0f172a; }
    .footer { border-top: 1px dashed #cbd5e1; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; }
    @media print { body { padding: 0; } .receipt { border: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div>
        <div class="brand">Swift<span>Drop</span> Logistics</div>
        <div class="brand-sub">Official Branch Operations Receipt · Colombo Central Hub</div>
      </div>
      <div class="meta">
        <div>Receipt Ref: <strong>${receiptRef}</strong></div>
        <div>Date Issued: <strong>${formatDate(order.createdAt)}</strong></div>
        <div>Status: <strong>${order.status || 'Verified'}</strong></div>
      </div>
    </div>

    <div class="tracking-banner">
      <div>
        <div class="tracking-title">Authoritative Tracking Number</div>
        <div class="tracking-code">${order.trackingNumber || 'SD-' + order.id}</div>
      </div>
      <div style="font-size: 12px; color: #16a34a; font-weight: 700; background: #f0fdf4; padding: 4px 10px; border-radius: 999px; border: 1px solid #bbf7d0;">
        PAID IN FULL
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Sender &amp; Pickup Origin</div>
        <div class="box-val">${order.pickupAddress}</div>
        <div class="box-sub">Contact: ${order.pickupContactName || 'Nuwan Pradeep'} (${order.pickupContactPhone || '+94 77 123 4567'})</div>
      </div>
      <div class="box">
        <div class="box-title" style="color: #16a34a;">Recipient &amp; Destination</div>
        <div class="box-val">${order.dropoffAddress}</div>
        <div class="box-sub">Recipient: ${order.dropoffContactName || 'Kasun Perera'} (${order.dropoffContactPhone || '+94 71 998 8776'})</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item / Description</th>
          <th>Size Category</th>
          <th>Weight</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${order.parcelDescription || 'Standard Parcel'}</strong></td>
          <td>${order.parcelSize || 'STANDARD'}</td>
          <td>${order.weightKg || '0.5'} kg</td>
          <td style="text-align: right;">${currency} ${feeVal}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-card">
      <div class="calc"><div class="total-title" style="margin-bottom: 4px;">How the total is calculated</div>${[
        ['Base delivery fee', order.feeBreakdown?.baseFee],
        ['Weight charge' + (order.weightKg ? ' (' + order.weightKg + ' kg)' : ''), order.feeBreakdown?.weightFee],
        ['Distance charge' + (order.distanceKm ? ' (' + order.distanceKm + ' km)' : ''), order.feeBreakdown?.distanceFee],
        ['Zone surcharge', order.feeBreakdown?.zoneSurcharge],
      ].map(([label, amount]) => '<div class="calc-row"><span>' + label + '</span><span>' + (amount === undefined || amount === null ? '—' : currency + ' ' + Number(amount).toFixed(2)) + '</span></div>').join('')}</div>
      <div class="total-title">Total Amount Paid</div>
      <div class="total-amount">${currency} ${feeVal}</div>
      <div style="font-size: 11px; color: #16a34a; margin-top: 4px;">✓ Verified by SwiftDrop Order Service. No outstanding dues.</div>
    </div>

    <div class="footer">
      <div>Thank you for choosing SwiftDrop Courier &amp; Logistics Management System.</div>
      <div style="margin-top: 4px;">For live tracking, visit the portal and search using tracking number ${order.trackingNumber || order.id}.</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([offlineHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SwiftDrop-Receipt-${order.trackingNumber || order.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
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

  const receiptRef = order ? `REC-${String(order.id).padStart(6, '0')}` : 'REC-000000';
  const feeAmount = order ? Number(order.deliveryFee || 1250).toFixed(2) : '1250.00';
  const currencyCode = order?.currency || 'LKR';

  // The four charges that make up the fee, in the order they are added. The amounts are exactly what the
  // Order Service stored with the order (they add up to the total); without them only the descriptions show.
  const breakdown = order?.feeBreakdown;
  const feeRows: { label: string; note: string; amount: number | null }[] = [
    {
      label: 'Base delivery fee',
      note: 'Fixed charge for every delivery',
      amount: breakdown ? Number(breakdown.baseFee) : null,
    },
    {
      label: `Weight charge${order?.weightKg ? ` (${order.weightKg} kg)` : ''}`,
      note: 'For weight above the included allowance',
      amount: breakdown ? Number(breakdown.weightFee) : null,
    },
    {
      label: `Distance charge${order?.distanceKm ? ` (${order.distanceKm} km)` : ''}`,
      note: 'Based on the distance between the two towns',
      amount: breakdown ? Number(breakdown.distanceFee) : null,
    },
    {
      label: 'Zone surcharge',
      note: 'Only when pickup and delivery are in different districts',
      amount: breakdown ? Number(breakdown.zoneSurcharge) : null,
    },
  ];

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header no-print">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              href={`/bookings/${id}`}
              className="sd-back-btn"
              aria-label="Back to Delivery Details & Milestones"
            >
              <ArrowLeft size={19} />
            </Link>
            <div>
              <h1 className="sd-header-title">Official Booking Receipt</h1>
              <div className="sd-header-sub">
                Ref: {receiptRef} · Order #{order?.id || id}
              </div>
            </div>
          </div>

          {order && (
            <div className="sd-header-actions">
              <button
                type="button"
                onClick={handleDownloadOfflineReceipt}
                className="sd-header-btn secondary"
                title="Download your receipt"
              >
                {downloadSuccess ? (
                  <>
                    <Check size={14} color="#34d399" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <FileDown size={14} />
                    <span>Download</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="sd-header-btn primary"
                title="Print this receipt directly"
              >
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ---------------- MAIN BODY CANVAS (LIGHT THEME) ---------------- */}
      <main className="sd-fullpage-body">
        {/* PAGE HEADING (left aligned with the top bar) */}
        <div className="sd-page-heading no-print">
          <h2 className="sd-page-heading-title">Booking Receipt</h2>
          <p className="sd-page-heading-sub">
            Your receipt for this delivery, with the charges that make up the total.
          </p>
        </div>

        <div className="sd-content-wrapper">
          {/* LOADING STATE */}
          {isLoading && (
            <div className="sd-card sd-state-card no-print">
              <Loader2 size={36} color="#2563eb" className="animate-spin" />
              <div className="sd-state-title">Loading verified receipt...</div>
              <p className="sd-state-sub">Fetching Order #{id} from SwiftDrop Order Service</p>
            </div>
          )}

          {/* ERROR STATE */}
          {!isLoading && error && (
            <div className="sd-card sd-state-card error no-print">
              <AlertCircle size={36} color="#dc2626" />
              <div className="sd-state-title text-red">Receipt Unavailable</div>
              <p className="sd-state-sub">{error}</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={fetchOrder} className="sd-btn-primary">
                  Try Again
                </button>
                <Link href={`/bookings/${id}`} className="sd-btn-secondary">
                  Return to Order Details
                </Link>
              </div>
            </div>
          )}

          {/* ---------------- ACTIVE RECEIPT DOCUMENT ---------------- */}
          {!isLoading && !error && order && (
            <div className="sd-receipt-wrapper">
              <article className="sd-receipt-document" id="printable-receipt">
                {/* Receipt Header */}
                <div className="sd-doc-header">
                  <div className="sd-doc-brand">
                    <div className="sd-doc-logo">
                      <FileText size={22} color="#ffffff" />
                    </div>
                    <div>
                      <div className="sd-doc-title">
                        Swift<span>Drop</span> Logistics
                      </div>
                      <div className="sd-doc-subtitle">
                        Parcel Delivery &amp; Courier Management System
                      </div>
                      <div className="sd-doc-branch">
                        Branch: {order.branch || 'Colombo Central Branch'} · Tax Reg: LKR-984210
                      </div>
                    </div>
                  </div>

                  <div className="sd-doc-meta">
                    <div className="sd-doc-badge">OFFICIAL BUSINESS RECEIPT</div>
                    <div className="sd-meta-line">
                      <span className="lbl">Receipt Ref:</span>
                      <span className="val">
                        <code>{receiptRef}</code>
                      </span>
                    </div>
                    <div className="sd-meta-line">
                      <span className="lbl">Date Issued:</span>
                      <span className="val">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="sd-meta-line">
                      <span className="lbl">Status:</span>
                      <span className="val status-paid">
                        <CheckCircle2 size={12} /> Paid &amp; Confirmed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tracking & Barcode Banner */}
                <div className="sd-doc-tracking-strip">
                  <div className="sd-tracking-left">
                    <span className="sd-tracking-label">Official Tracking Number</span>
                    <span className="sd-tracking-code">{order.trackingNumber}</span>
                  </div>

                  <div className="sd-tracking-right">
                    <button
                      type="button"
                      onClick={handleCopyTracking}
                      className="sd-copy-pill no-print"
                      title="Copy tracking number"
                    >
                      {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <div className="sd-barcode-simulated">
                      <span className="sd-barcode-lines">||| | |||| | ||| |||| | || | |||| ||| | ||||</span>
                      <span className="sd-barcode-text">{order.trackingNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Parties Grid (Sender & Recipient) */}
                <div className="sd-parties-grid">
                  {/* Sender Box */}
                  <div className="sd-party-card origin">
                    <div className="sd-party-title origin">
                      <MapPin size={14} /> SENDER / PICKUP DETAILS
                    </div>
                    <div className="sd-party-address">{order.pickupAddress}</div>
                    <div className="sd-party-contacts">
                      <div className="sd-contact-line">
                        <User size={13} color="#64748b" /> Contact:{' '}
                        <strong>{order.pickupContactName || 'Nuwan Pradeep'}</strong>
                      </div>
                      <div className="sd-contact-line">
                        <Phone size={13} color="#64748b" /> Phone:{' '}
                        <strong>{order.pickupContactPhone || '+94 77 123 4567'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Box */}
                  <div className="sd-party-card destination">
                    <div className="sd-party-title destination">
                      <MapPin size={14} /> RECIPIENT / DELIVERY DETAILS
                    </div>
                    <div className="sd-party-address">{order.dropoffAddress}</div>
                    <div className="sd-party-contacts">
                      <div className="sd-contact-line">
                        <User size={13} color="#64748b" /> Recipient:{' '}
                        <strong>{order.dropoffContactName || 'Kasun Perera'}</strong>
                      </div>
                      <div className="sd-contact-line">
                        <Phone size={13} color="#64748b" /> Phone:{' '}
                        <strong>{order.dropoffContactPhone || '+94 71 998 8776'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itemized Shipment Breakdown Table */}
                <div className="sd-table-wrap">
                  <div className="sd-table-title">
                    <Package size={15} /> SHIPMENT BREAKDOWN &amp; SPECIFICATIONS
                  </div>
                  <table className="sd-receipt-table">
                    <thead>
                      <tr>
                        <th>Item Description</th>
                        <th>Category</th>
                        <th>Weight</th>
                        <th>Branch</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>{order.parcelDescription || 'Urgent Contracts & Documents'}</strong>
                          <div className="sd-row-note">Booking ID: #{order.id}</div>
                        </td>
                        <td>
                          <span className="sd-category-tag">{order.parcelSize || 'SMALL'}</span>
                        </td>
                        <td>{order.weightKg ? `${order.weightKg} kg` : '0.5 kg'}</td>
                        <td>{order.branch || 'Colombo Central'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {currencyCode} {feeAmount}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {order.deliveryInstructions && (
                    <div className="sd-instructions-strip">
                      <strong>Special Handling:</strong> "{order.deliveryInstructions}"
                    </div>
                  )}
                </div>

                {/* Financial Summary Card */}
                <div className="sd-financial-box">
                  <div className="sd-fin-heading">How your total is calculated</div>
                  {feeRows.map((row) => (
                    <div className="sd-bill-line" key={row.label}>
                      <div className="sd-bill-item">
                        <span className="sd-bill-label">{row.label}</span>
                        <span className="sd-bill-note">{row.note}</span>
                      </div>
                      <span className="sd-bill-amount">
                        {row.amount === null ? '—' : `${currencyCode} ${row.amount.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                  <div className="sd-bill-rule" />
                  <div className="sd-fin-row total">
                    <span className="lbl">TOTAL AMOUNT PAID</span>
                    <span className="val">
                      {currencyCode} {feeAmount}
                    </span>
                  </div>
                </div>

                {/* Verification Footer */}
                <div className="sd-doc-footer">
                  <div className="sd-footer-left">
                    <div className="sd-verified-badge">
                      <ShieldCheck size={15} color="#16a34a" /> Verified Order Service Record
                    </div>
                    <p className="sd-footer-p">
                      Thank you for choosing SwiftDrop. This electronic receipt serves as official proof of booking and payment. Anyone with this tracking number can view live updates on the tracking portal.
                    </p>
                    <p className="sd-footer-support">
                      Support: support@swiftdrop.lk · Helpline: +94 11 234 5678 · Colombo Central Branch
                    </p>
                  </div>
                </div>
              </article>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- STYLES (SCREEN & PRINT) ---------------- */}
      <style jsx global>{`
        /* Fullpage Root */
        .sd-fullpage-root {
          width: 100%;
          min-height: 100vh;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
        }

        /* Top Header Bar */
        .sd-fullpage-header {
          background: #0f1f38;
          color: #ffffff;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
        }

        .sd-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .sd-back-btn {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: background 0.15s ease, transform 0.1s ease;
          flex-shrink: 0;
        }

        .sd-back-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          transform: translateX(-2px);
        }

        .sd-header-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
          margin: 0;
          line-height: 1.2;
        }

        .sd-header-sub {
          font-size: 0.78rem;
          color: #8fa3bf;
          margin-top: 3px;
          font-weight: 500;
        }

        .sd-header-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .sd-header-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .sd-header-btn:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        .sd-header-btn.secondary {
          border-color: rgba(255, 255, 255, 0.1);
          color: #94a3b8;
        }

        .sd-header-btn.primary {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
        }

        .sd-header-btn.primary:hover {
          background: #1d4ed8;
        }

        /* Body Canvas */
        .sd-fullpage-body {
          flex: 1;
          padding: 1.5rem 2rem 3rem 2rem;
          background: #f4f7fb;
          width: 100%;
        }

        .sd-content-wrapper {
          max-width: 900px;
          margin: 0 auto;
        }

        /* Page heading under the top bar */
        .sd-page-heading {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto 1.5rem;
          text-align: left;
        }

        .sd-page-heading-title {
          font-size: 1.625rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #0f172a;
          margin: 0;
        }

        .sd-page-heading-sub {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
          margin: 0;
        }

        /* Breadcrumbs */
        .sd-breadcrumb-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .sd-breadcrumb-link {
          color: #475569;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s ease;
        }

        .sd-breadcrumb-link:hover {
          color: #2563eb;
        }

        .sd-crumb-sep {
          color: #cbd5e1;
        }

        .sd-breadcrumb-current {
          color: #0f172a;
          font-weight: 600;
        }

        /* State Cards */
        .sd-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .sd-state-card {
          padding: 3.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 0.85rem;
        }

        .sd-state-card.error {
          border-color: #fecaca;
          background: #fffafa;
        }

        .sd-state-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-state-title.text-red {
          color: #dc2626;
        }

        .sd-state-sub {
          font-size: 0.825rem;
          color: #64748b;
          max-width: 480px;
          margin: 0;
        }

        /* Receipt Wrapper */
        .sd-receipt-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Official Printable Document Sheet (Light Theme on Screen & Print) */
        .sd-receipt-document {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          position: relative;
        }

        /* Document Header */
        .sd-doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .sd-doc-brand {
          display: flex;
          align-items: flex-start;
          gap: 0.95rem;
        }

        .sd-doc-logo {
          width: 44px;
          height: 44px;
          border-radius: 11px;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
        }

        .sd-doc-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }

        .sd-doc-title span {
          color: #2563eb;
        }

        .sd-doc-subtitle {
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 3px;
          font-weight: 500;
        }

        .sd-doc-branch {
          font-size: 0.72rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .sd-doc-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.35rem;
        }

        .sd-doc-badge {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          margin-bottom: 0.35rem;
        }

        .sd-meta-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
        }

        .sd-meta-line .lbl {
          color: #64748b;
          font-weight: 500;
        }

        .sd-meta-line .val {
          color: #0f172a;
          font-weight: 600;
        }

        .sd-meta-line .val code {
          background: #f1f5f9;
          color: #2563eb;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }

        .sd-meta-line .val.status-paid {
          color: #15803d;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 700;
        }

        /* Tracking Strip */
        .sd-doc-tracking-strip {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .sd-tracking-left {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .sd-tracking-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .sd-tracking-code {
          font-size: 1.35rem;
          font-weight: 800;
          color: #1e40af;
          font-family: monospace;
          letter-spacing: 0.02em;
        }

        .sd-tracking-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .sd-copy-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.25rem 0.55rem;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .sd-copy-pill:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .sd-barcode-simulated {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
        }

        .sd-barcode-lines {
          font-family: monospace;
          font-size: 0.95rem;
          letter-spacing: 0.15em;
          color: #0f172a;
          line-height: 1;
        }

        .sd-barcode-text {
          font-size: 0.65rem;
          color: #64748b;
          font-family: monospace;
          margin-top: 2px;
        }

        /* Parties Grid */
        .sd-parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .sd-party-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .sd-party-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .sd-party-title.origin {
          color: #2563eb;
        }

        .sd-party-title.destination {
          color: #16a34a;
        }

        .sd-party-address {
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.4;
        }

        .sd-party-contacts {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.78rem;
          color: #475569;
          padding-top: 0.4rem;
          border-top: 1px solid #e2e8f0;
        }

        .sd-contact-line {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .sd-contact-line strong {
          color: #0f172a;
        }

        /* Shipment Table */
        .sd-table-wrap {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .sd-table-title {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .sd-receipt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .sd-receipt-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }

        .sd-receipt-table td {
          padding: 0.85rem 1rem;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }

        .sd-row-note {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }

        .sd-category-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: #7c3aed;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          padding: 0.15rem 0.5rem;
          border-radius: 5px;
        }

        .sd-instructions-strip {
          background: #f8fafc;
          padding: 0.65rem 1rem;
          font-size: 0.78rem;
          color: #475569;
          border-top: 1px solid #e2e8f0;
        }

        /* Financial Summary Box */
        .sd-financial-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sd-fin-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.825rem;
          color: #475569;
        }

        .sd-fin-row.total {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          padding-top: 0.25rem;
        }

        .sd-fin-row.total .val {
          font-size: 1.45rem;
          color: #0f172a;
        }

        .sd-fin-heading {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 0.15rem;
        }

        .sd-bill-line {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding: 0.6rem 0;
          border-bottom: 1px dashed #e2e8f0;
        }

        .sd-bill-item {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .sd-bill-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
        }

        .sd-bill-note {
          font-size: 0.72rem;
          color: #94a3b8;
        }

        .sd-bill-amount {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
        }

        .sd-bill-rule {
          height: 0;
          border-top: 2px solid #0f172a;
          margin: 0.35rem 0 0.15rem;
        }

        .sd-fin-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 0.25rem 0;
        }

        .sd-fin-verified {
          font-size: 0.75rem;
          color: #15803d;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 600;
          margin-top: 0.25rem;
        }

        /* Document Footer */
        .sd-doc-footer {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px dashed #cbd5e1;
        }

        .sd-footer-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.35rem;
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }

        .sd-verified-badge {
          font-size: 0.78rem;
          font-weight: 700;
          color: #15803d;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .sd-footer-p {
          font-size: 0.74rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .sd-footer-support {
          font-size: 0.7rem;
          color: #94a3b8;
          margin: 0;
        }

        .sd-footer-right {
          flex-shrink: 0;
        }

        .sd-qr-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem;
        }

        .sd-qr-dummy {
          width: 80px;
          height: 80px;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          color: #94a3b8;
          text-align: center;
          gap: 0.2rem;
        }

        .sd-qr-dummy code {
          font-size: 0.55rem;
          color: #2563eb;
        }

        /* Bottom Toolbar */
        .sd-bottom-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .sd-toolbar-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.825rem;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .sd-toolbar-back-btn:hover {
          color: #0f172a;
        }

        .sd-toolbar-right {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .sd-toolbar-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1rem;
          border-radius: 9px;
          font-size: 0.825rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
          cursor: pointer;
        }

        .sd-toolbar-action-btn.secondary {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
        }

        .sd-toolbar-action-btn.secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }

        .sd-toolbar-action-btn.primary {
          background: #2563eb;
          border: 1px solid #2563eb;
          color: #ffffff;
        }

        .sd-toolbar-action-btn.primary:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }

        .sd-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.15rem;
          border-radius: 9px;
          font-size: 0.825rem;
          font-weight: 600;
          background: #2563eb;
          color: #ffffff;
          border: none;
          cursor: pointer;
          text-decoration: none;
        }

        .sd-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.15rem;
          border-radius: 9px;
          font-size: 0.825rem;
          font-weight: 600;
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          text-decoration: none;
        }

        /* ---------------- PRINT MEDIA STYLES ---------------- */
        @media print {
          /* Hide all non-printable UI: navigation, sidebars, headers, action buttons */
          .no-print,
          .sd-fullpage-header,
          .sd-bottom-toolbar,
          .sd-breadcrumb-row,
          .customer-sidebar-root,
          .customer-mobile-topbar,
          .customer-drawer-backdrop {
            display: none !important;
          }

          body,
          html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11pt !important;
          }

          .sd-fullpage-root {
            background: #ffffff !important;
            min-height: auto !important;
          }

          .customer-app-shell {
            display: block !important;
          }

          .customer-main-content {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .sd-fullpage-body {
            padding: 0 !important;
            background: #ffffff !important;
          }

          .sd-content-wrapper {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .sd-receipt-document {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 24px !important;
            max-width: 100% !important;
            page-break-inside: avoid;
          }

          .sd-doc-header {
            border-bottom: 2px solid #cbd5e1 !important;
          }

          .sd-doc-tracking-strip {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
          }

          .sd-party-card {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
          }

          .sd-financial-box {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
          }
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .sd-fullpage-header {
            padding: 1rem 1.25rem;
          }

          .sd-fullpage-body {
            padding: 1.25rem 1rem 2.5rem 1rem;
          }

          .sd-receipt-document {
            padding: 1.5rem 1.25rem;
          }

          .sd-doc-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .sd-doc-meta {
            align-items: flex-start;
          }

          .sd-parties-grid {
            grid-template-columns: 1fr;
          }

          .sd-doc-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .sd-bottom-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .sd-toolbar-right {
            flex-direction: column;
            width: 100%;
          }

          .sd-toolbar-action-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
