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
  ArrowRight,
  PlusCircle,
  LayoutDashboard,
  ShieldCheck,
  Truck,
  ExternalLink,
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

  const handleCopy = () => {
    if (trackingNumber && trackingNumber !== 'TRK-PENDING') {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      {/* Success Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)',
          }}
        >
          <CheckCircle2 size={36} color="#ffffff" />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-success">Official Confirmation</span>
          <span className="badge badge-primary">Order Service Registered</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Booking Confirmed!
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '600px' }}>
          Your delivery booking has been successfully recorded in the Order database. Our dispatch team will assign a courier shortly.
        </p>
      </div>

      {/* Authoritative Tracking Number Card */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(11, 17, 33, 0.95) 100%)',
        }}
      >
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          Authoritative Tracking Number
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(30, 41, 59, 0.6)',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            border: '1px dashed rgba(96, 165, 250, 0.5)',
          }}
        >
          <code style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa', letterSpacing: '0.05em' }}>
            {trackingNumber}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Tracking Number"
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            {copied ? (
              <>
                <Check size={14} color="#10b981" /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy
              </>
            )}
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Use this tracking number to follow your parcel's progress through each delivery milestone.
        </p>
      </div>

      {/* Order Summary Details Grid */}
      <div className="grid-cols-3">
        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Order ID
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>#{orderId}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>Database Record ID</div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Delivery Status
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="pulse-dot online"></span>
            {status}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>Initial Authoritative State</div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Delivery Fee
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>
            {currency} {fee !== '—' && !isNaN(Number(fee)) ? Number(fee).toFixed(2) : fee}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>Order Service Calculation</div>
        </div>
      </div>

      {/* Addresses Summary (if provided) */}
      {(pickupAddress || dropoffAddress) && (
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <MapPin size={16} /> Pickup Address
            </div>
            <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{pickupAddress || '—'}</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <MapPin size={16} /> Destination Address
            </div>
            <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{dropoffAddress || '—'}</div>
          </div>
        </div>
      )}

      {/* Next Actions Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '1rem',
        }}
      >
        <Link href="/" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutDashboard size={16} /> Return to Dashboard
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/book" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={16} /> Book Another
          </Link>

          <Link href="/bookings" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={16} /> View My Deliveries
          </Link>

          <Link
            href={`/tracking?number=${encodeURIComponent(trackingNumber)}`}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            <Truck size={16} /> Track My Parcel
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          Loading confirmation details...
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}

