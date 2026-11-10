'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Truck,
  Package,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  Compass,
} from 'lucide-react';
import { getPublicTracking } from '@/api/services/orders.api';
import type { PublicTrackingResponse, OrderStatus } from '@/types/order.types';

/**
 * Standard Delivery Milestones for the SwiftDrop Delivery Lifecycle.
 * The Order Service is the authoritative source for these states.
 */
const STATUS_MILESTONES: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'Created', label: 'Order Created', desc: 'Booking confirmed in system' },
  { status: 'Picked Up', label: 'Picked Up', desc: 'Courier collected package' },
  { status: 'In Transit', label: 'In Transit', desc: 'Moving between sorting hubs' },
  { status: 'Out for Delivery', label: 'Out for Delivery', desc: 'On courier vehicle for delivery' },
  { status: 'Delivered', label: 'Delivered', desc: 'Package handed to recipient' },
];

/**
 * Converts enum status (e.g. IN_TRANSIT, DELIVERED) to human-friendly title
 */
function formatStatusLabel(status: string): string {
  if (!status) return 'Created';
  const clean = status.replace(/_/g, ' ').toLowerCase();
  return clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialNumber = searchParams.get('number') || '';

  const [trackingNumber, setTrackingNumber] = useState<string>(initialNumber);
  const [result, setResult] = useState<PublicTrackingResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Perform tracking search
  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setInputError('Please enter a tracking number.');
      return;
    }

    setInputError(null);
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getPublicTracking(trimmed);
      setResult(data);
    } catch (err: any) {
      setError(
        err.message || 'Unable to retrieve tracking information. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Automatically execute search if "number" query parameter is present in URL
  useEffect(() => {
    if (initialNumber.trim()) {
      executeSearch(initialNumber.trim());
    }
  }, [initialNumber, executeSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(trackingNumber);
  };

  const handleCopy = () => {
    if (result?.trackingNumber) {
      navigator.clipboard.writeText(result.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine current milestone index based on authoritative backend status
  const currentStatusNormalized = (result?.status || '').replace(/_/g, ' ').toLowerCase();
  const currentStatusIndex = STATUS_MILESTONES.findIndex(
    (m) => m.status.toLowerCase() === currentStatusNormalized
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '2rem 2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-primary">Public Tracking</span>
            <span className="badge badge-success">No Login Required</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Track Your Parcel
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Enter your SwiftDrop tracking number below to check real-time delivery milestones.
          </p>
        </div>

        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
          }}
        >
          <Compass size={28} color="#ffffff" />
        </div>
      </div>

      {/* Public Tracking Input Card */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label htmlFor="trackingNumber" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
            Tracking Number
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
              <input
                id="trackingNumber"
                type="text"
                placeholder="e.g. TRK-202611-00101"
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value.toUpperCase());
                  if (inputError) setInputError(null);
                }}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: inputError ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.75rem',
                fontSize: '0.95rem',
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Finding...
                </>
              ) : (
                <>
                  <Search size={18} /> Track Parcel
                </>
              )}
            </button>
          </div>

          {inputError && (
            <p role="alert" style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertCircle size={14} />
              {inputError}
            </p>
          )}

          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
            <HelpCircle size={13} />
            Tracking numbers are provided on your booking confirmation page or delivery receipt.
          </div>
        </form>
      </div>

      {/* ---------------- STATE 1: LOADING ---------------- */}
      {isLoading && (
        <div
          className="glass-card"
          style={{
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <Loader2 size={36} color="#3b82f6" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Finding your parcel...</div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Querying public tracking records from Order Service (GET /api/v1/tracking/{trackingNumber})
          </p>
        </div>
      )}

      {/* ---------------- STATE 2: ERROR / NOT FOUND ---------------- */}
      {!isLoading && error && (
        <div
          className="glass-card"
          style={{
            padding: '2rem',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle size={24} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171' }}>
                Tracking Search Result
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.35rem' }}>
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- STATE 3: TRACKING RESULT ---------------- */}
      {!isLoading && !error && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tracking Result Card */}
          <div
            className="glass-card"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            {/* Header: Tracking number & Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tracking Number
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <code style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa', letterSpacing: '0.04em' }}>
                    {result.trackingNumber}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Current Status
                </div>
                <span
                  className="badge badge-primary"
                  style={{
                    fontSize: '0.9rem',
                    padding: '0.4rem 0.85rem',
                    background:
                      (result.status || '').toUpperCase() === 'DELIVERED'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(59, 130, 246, 0.2)',
                    color:
                      (result.status || '').toUpperCase() === 'DELIVERED'
                        ? '#34d399'
                        : '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <span className="pulse-dot online"></span>
                  {formatStatusLabel(result.status)}
                </span>
              </div>
            </div>

            {/* General Route / City Overview (Safe Public Information) */}
            {(result.origin || result.destination || result.parcelCategory) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(15, 23, 42, 0.5)', padding: '1rem 1.25rem', borderRadius: '10px' }}>
                {result.origin && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Origin Hub: </span>
                    <strong style={{ color: '#ffffff', fontSize: '0.85rem', display: 'block' }}>{result.origin}</strong>
                  </div>
                )}
                {result.destination && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Destination Hub: </span>
                    <strong style={{ color: '#ffffff', fontSize: '0.85rem', display: 'block' }}>{result.destination}</strong>
                  </div>
                )}
                {result.parcelCategory && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Category: </span>
                    <strong style={{ color: '#ffffff', fontSize: '0.85rem', display: 'block' }}>{result.parcelCategory}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Delivery Lifecycle Timeline */}
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={17} color="#3b82f6" />
                Delivery Milestones
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '0.5rem',
                  textAlign: 'center',
                }}
              >
                {STATUS_MILESTONES.map((milestone, idx) => {
                  const isPassed = currentStatusIndex >= idx;
                  const isCurrent = currentStatusIndex === idx;

                  return (
                    <div key={milestone.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: isCurrent
                            ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                            : isPassed
                            ? '#10b981'
                            : 'rgba(30, 41, 59, 0.8)',
                          color: '#ffffff',
                          border: isCurrent ? '2px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: isCurrent ? '0 0 12px rgba(59, 130, 246, 0.5)' : undefined,
                        }}
                      >
                        {isPassed && !isCurrent ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>

                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isCurrent ? '#60a5fa' : isPassed ? '#34d399' : '#64748b' }}>
                        {milestone.label}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {milestone.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Authoritative Events / Timestamps if returned by backend */}
            {result.events && result.events.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                  Detailed Event Log
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {result.events.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{formatStatusLabel(ev.status)}</span>
                      {ev.location && <span style={{ color: '#94a3b8' }}>{ev.location}</span>}
                      {ev.timestamp && <span style={{ color: '#64748b' }}>{ev.timestamp}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy Protection Notice */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#6ee7b7',
              }}
            >
              <ShieldCheck size={16} color="#34d399" style={{ flexShrink: 0 }} />
              <span>
                <strong>Privacy Guaranteed:</strong> Public tracking displays milestone progress without exposing personal phone numbers, emails, or private delivery instructions.
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setTrackingNumber('');
                setResult(null);
                setError(null);
              }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <RotateCcw size={14} /> Track Another Parcel
            </button>

            <Link href="/book" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <PlusCircle size={16} /> Book a New Delivery
            </Link>
          </div>
        </div>
      )}

      {/* Global spinner animation */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default function PublicTrackingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          Loading public tracking...
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}

