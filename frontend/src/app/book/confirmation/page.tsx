'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Copy,
  Check,
  Package,
  MapPin,
  PlusCircle,
  LayoutDashboard,
  Truck,
  FileText,
  ArrowLeft,
} from 'lucide-react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  // Read authoritative data passed from order creation
  const trackingNumber = searchParams.get('trackingNumber') || 'TRK-PENDING';
  const orderId = searchParams.get('id') || '—';
  const fee = searchParams.get('fee') || '—';
  const currency = searchParams.get('currency') || 'LKR';
  const status = searchParams.get('status') || 'Created';
  const pickupAddress = searchParams.get('pickup') || '';
  const dropoffAddress = searchParams.get('dropoff') || '';
  const originBranch = searchParams.get('originBranch') || '';
  const destinationBranch = searchParams.get('destinationBranch') || '';
  const paymentMethod = searchParams.get('paymentMethod') || '';
  const paymentStatus = searchParams.get('paymentStatus') || '';
  const pickupMethod = searchParams.get('pickupMethod') || '';

  const handleCopy = () => {
    if (trackingNumber && trackingNumber !== 'TRK-PENDING') {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/customer/dashboard" className="sd-back-btn" aria-label="Back to Dashboard">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="sd-header-title">Booking Confirmation</h1>
              <div className="sd-header-sub">
                Order #{orderId} · Registered with SwiftDrop Order Service
              </div>
            </div>
          </div>

          <div className="sd-header-actions" style={{ flexWrap: 'wrap' }}>
            <Link href="/bookings" className="sd-header-action-btn secondary">
              <Package size={15} /> My Deliveries
            </Link>
            <Link
              href={`/tracking?number=${encodeURIComponent(trackingNumber)}`}
              className="sd-header-book-btn"
            >
              <Truck size={15} /> Track Parcel
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- BODY CONTENT ---------------- */}
      <div className="sd-fullpage-body">
        <div className="sd-content-wrapper" style={{ maxWidth: '880px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Success Hero Header */}
          <div
            className="sd-card"
            style={{
              background: '#ffffff',
              borderColor: '#bbf7d0',
              padding: '2.25rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 6px 18px rgba(22, 163, 74, 0.25)',
              }}
            >
              <CheckCircle2 size={34} color="#ffffff" />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.25rem 0.7rem',
                  borderRadius: '9999px',
                }}
              >
                Official Confirmation
              </span>
              <span
                style={{
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.25rem 0.7rem',
                  borderRadius: '9999px',
                }}
              >
                Order Service Registered
              </span>
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 0.5rem 0' }}>
              Booking Confirmed!
            </h2>
            <p style={{ color: '#475569', fontSize: '0.92rem', maxWidth: '580px', margin: 0, lineHeight: 1.5 }}>
              Your delivery booking has been successfully recorded in the Order database. Our dispatch team will assign a courier shortly.
            </p>
          </div>

          {/* Authoritative Tracking Number Card */}
          <div
            className="sd-card"
            style={{
              padding: '1.75rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Authoritative Tracking Number
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.9rem',
                background: '#eff6ff',
                padding: '0.75rem 1.35rem',
                borderRadius: '12px',
                border: '1px dashed #93c5fd',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <code style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.04em' }}>
                {trackingNumber}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy Tracking Number"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {copied ? (
                  <>
                    <Check size={14} color="#16a34a" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy
                  </>
                )}
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Use this tracking number to follow your parcel&apos;s progress through each delivery milestone.
            </p>
          </div>

          {/* Order Summary Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.15rem' }}>
            <div className="sd-card" style={{ padding: '1.35rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Order ID
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>#{orderId}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Database Record ID</div>
            </div>

            <div className="sd-card" style={{ padding: '1.35rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Delivery Status
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                {status}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Initial Authoritative State</div>
            </div>

            <div className="sd-card" style={{ padding: '1.35rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Delivery Fee
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>
                {currency} {fee !== '—' && !isNaN(Number(fee)) ? Number(fee).toFixed(2) : fee}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Order Service Calculation</div>
            </div>
          </div>

          {/* Addresses Summary (if provided) */}
          {(pickupAddress || dropoffAddress) && (
            <div
              className="sd-card"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem',
                padding: '1.5rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                  <MapPin size={15} /> Pickup Address {originBranch ? `(${originBranch})` : ''}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.45 }}>
                  {pickupAddress || '—'}
                </div>
                {pickupMethod && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Method: {pickupMethod === 'BRANCH_DROPOFF' ? 'Branch Drop-Off' : 'Courier Pickup'}
                  </div>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                  <MapPin size={15} /> Destination Address {destinationBranch ? `(${destinationBranch})` : ''}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.45 }}>
                  {dropoffAddress || '—'}
                </div>
                {paymentMethod && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Payment: {paymentMethod} {paymentStatus ? `(${paymentStatus})` : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Actions Navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              paddingTop: '0.5rem',
            }}
          >
            <Link
              href="/customer/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.6rem 1.05rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <LayoutDashboard size={15} /> Customer Dashboard
            </Link>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link
                href="/book"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.6rem 1.05rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <PlusCircle size={15} /> Book Another
              </Link>

              <Link
                href="/bookings"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.6rem 1.05rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Package size={15} /> View My Deliveries
              </Link>

              {orderId && orderId !== '—' && (
                <Link
                  href={`/bookings/${orderId}/receipt`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.6rem 1.05rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <FileText size={15} /> View Receipt
                </Link>
              )}

              <Link
                href={`/tracking?number=${encodeURIComponent(trackingNumber)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: '1px solid #2563eb',
                  borderRadius: '8px',
                  padding: '0.6rem 1.15rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Truck size={15} /> Track My Parcel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
          Loading confirmation details...
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
