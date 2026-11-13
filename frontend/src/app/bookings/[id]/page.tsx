'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Truck,
  PlusCircle,
  FileText,
  User,
  Phone,
  CheckCircle2,
  Clock,
  Compass,
} from 'lucide-react';
import { getOrderById } from '@/api/services/orders.api';
import type { DeliveryOrder, OrderStatus } from '@/types/order.types';

/**
 * Ordered Delivery Milestones
 * The backend Order Service is the authoritative source for these transitions.
 */
const STATUS_MILESTONES: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'Created', label: 'Order Created', desc: 'Booking confirmed in system' },
  { status: 'Picked Up', label: 'Picked Up', desc: 'Courier collected parcel' },
  { status: 'In Transit', label: 'In Transit', desc: 'Moving through logistics network' },
  { status: 'Out for Delivery', label: 'Out for Delivery', desc: 'Assigned for final drop-off' },
  { status: 'Delivered', label: 'Delivered', desc: 'Successfully handed over' },
];

/**
 * Member 06: Individual Order Details Page
 * Route: /bookings/[id]
 *
 * Retrieves one specific delivery by ID from:
 * GET /api/v1/orders/{id}
 */
export default function OrderDetailsPage() {
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
        err.message || 'Unable to load delivery details. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleCopy = () => {
    if (order?.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine milestone progress based strictly on backend status
  const currentStatusIndex = STATUS_MILESTONES.findIndex(
    (m) => m.status.toLowerCase() === (order?.status || '').toLowerCase()
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Navigation Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link
            href="/customer/dashboard"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            Dashboard
          </Link>
          <span style={{ color: '#64748b' }}>/</span>
          <Link
            href="/bookings"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <ArrowLeft size={14} /> My Deliveries
          </Link>
        </div>

        {order?.trackingNumber && (
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            {copied ? (
              <>
                <Check size={14} color="#10b981" /> Copied Tracking #
              </>
            ) : (
              <>
                <Copy size={14} /> Copy Tracking #
              </>
            )}
          </button>
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
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>Loading delivery details...</div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Fetching Order #{id} from Order Service (GET /api/v1/orders/{id})
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
            gap: '1.25rem',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={36} color="#ef4444" />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171', marginBottom: '0.35rem' }}>
              Delivery Details Unavailable
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', maxWidth: '500px' }}>
              {error}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={fetchOrder}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              Retry
            </button>
            <Link href="/bookings" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              Return to Deliveries
            </Link>
          </div>
        </div>
      )}

      {/* ---------------- STATE 3: ORDER LOADED ---------------- */}
      {!isLoading && !error && order && (
        <>
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
                <span className="badge badge-primary">Order #{order.id}</span>
                <span className="badge badge-success">Backend Verified</span>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
                Tracking: <span style={{ color: '#60a5fa' }}>{order.trackingNumber}</span>
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Authoritative parcel lifecycle managed by the Order Service.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Delivery Fee</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
                {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Delivery Status & Lifecycle Milestones */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={18} color="#3b82f6" />
                  Delivery Lifecycle Status
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Current status: <strong style={{ color: '#ffffff' }}>{order.status}</strong>
                </p>
              </div>

              <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                <span className="pulse-dot online"></span> {order.status}
              </span>
            </div>

            {/* Visual Timeline (Authoritative - No Timers) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.5rem',
                position: 'relative',
                paddingTop: '0.5rem',
              }}
            >
              {STATUS_MILESTONES.map((milestone, idx) => {
                const isPassed = currentStatusIndex >= idx;
                const isCurrent = currentStatusIndex === idx;

                return (
                  <div key={milestone.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
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
                    <div style={{ fontSize: '0.68rem', color: '#64748b', maxWidth: '120px' }}>
                      {milestone.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
              Official status transitions are updated exclusively by Dispatch & Order Service events.
            </div>
          </div>

          {/* Details 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Pickup Details Card */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', fontSize: '0.9rem', fontWeight: 700 }}>
                <MapPin size={16} /> SENDER & PICKUP LOCATION
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                {order.pickupAddress}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                {order.pickupContactName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={13} color="#64748b" /> Contact: <strong style={{ color: '#e2e8f0' }}>{order.pickupContactName}</strong>
                  </div>
                )}
                {order.pickupContactPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={13} color="#64748b" /> Phone: <strong style={{ color: '#e2e8f0' }}>{order.pickupContactPhone}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Destination Details Card */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.9rem', fontWeight: 700 }}>
                <MapPin size={16} /> RECIPIENT & DESTINATION
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                {order.dropoffAddress}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                {order.dropoffContactName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={13} color="#64748b" /> Recipient: <strong style={{ color: '#e2e8f0' }}>{order.dropoffContactName}</strong>
                  </div>
                )}
                {order.dropoffContactPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={13} color="#64748b" /> Phone: <strong style={{ color: '#e2e8f0' }}>{order.dropoffContactPhone}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parcel Specifications Card */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a78bfa', fontSize: '0.9rem', fontWeight: 700 }}>
              <Package size={16} /> PARCEL SPECIFICATIONS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Contents: </span>
                <strong style={{ color: '#ffffff' }}>{order.parcelDescription || 'General Cargo'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Size Category: </span>
                <span className="badge badge-primary">{order.parcelSize || 'STANDARD'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Weight: </span>
                <strong style={{ color: '#ffffff' }}>{order.weightKg || '—'} kg</strong>
              </div>
            </div>

            {order.deliveryInstructions && (
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', fontSize: '0.825rem', color: '#94a3b8' }}>
                <span style={{ color: '#64748b' }}>Special Instructions: </span>
                <em>"{order.deliveryInstructions}"</em>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link href="/bookings" className="btn btn-secondary">
              ← Return to All Deliveries
            </Link>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {order.trackingNumber && (
                <Link
                  href={`/tracking?trackingNumber=${encodeURIComponent(order.trackingNumber)}`}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Compass size={16} /> Track on Map
                </Link>
              )}

              <Link
                href={`/bookings/${id}/receipt`}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileText size={16} /> View Receipt
              </Link>

              <Link href="/book" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PlusCircle size={16} /> Book Another Delivery
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Global spinner styling */}
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

