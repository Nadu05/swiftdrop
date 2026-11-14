'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  MapPin,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Truck,
  PlusCircle,
  FileText,
  User,
  Phone,
  CheckCircle2,
  Compass,
  CreditCard,
  Building2,
  XCircle,
} from 'lucide-react';
import {
  getOrderById,
  confirmOrderPrepaidPayment,
  cancelCustomerOrder,
  OrderApiError,
} from '@/api/services/orders.api';
import type { OrderStatus } from '@/types/order.types';

const STATUS_MILESTONES: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'CONFIRMED', label: 'Confirmed', desc: 'Order registered & verified' },
  { status: 'PICKED_UP', label: 'Picked Up / At Origin', desc: 'Collected or dropped at branch' },
  { status: 'IN_TRANSIT', label: 'In Transit', desc: 'Moving between hubs' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Assigned for final delivery' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Handed over to recipient' },
];

function resolveMilestoneStageIndex(status?: string): number {
  const s = (status || '').toUpperCase().replace(/\s+/g, '_');
  switch (s) {
    case 'CREATED':
    case 'CONFIRMED':
    case 'PICKUP_ASSIGNED':
      return 0;
    case 'PICKED_UP':
    case 'AT_ORIGIN_BRANCH':
      return 1;
    case 'IN_TRANSIT':
    case 'AT_DESTINATION_BRANCH':
      return 2;
    case 'OUT_FOR_DELIVERY':
    case 'DELIVERY_FAILED':
    case 'PENDING_DISPATCHER_DECISION':
      return 3;
    case 'DELIVERED':
      return 4;
    default:
      return 0;
  }
}

export default function OrderDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState<boolean>(false);
  const [paymentTokenInput, setPaymentTokenInput] = useState<string>('PAY-VERIFIED-1001');

  const {
    data: order,
    isLoading,
    error: errorRaw,
    refetch: fetchOrder,
  } = useQuery({
    queryKey: ['customer-order', id],
    queryFn: () => getOrderById(id),
    enabled: Boolean(id),
    retry: false,
  });

  const errorObj = errorRaw as OrderApiError | null;
  const error = errorObj?.message || null;

  const confirmPaymentMutation = useMutation({
    mutationFn: () => confirmOrderPrepaidPayment(id, paymentTokenInput.trim() || 'PAY-VERIFIED-1001'),
    onSuccess: (updated) => {
      queryClient.setQueryData(['customer-order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelCustomerOrder(id, 'Cancelled by customer from order details page'),
    onSuccess: (updated) => {
      queryClient.setQueryData(['customer-order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    },
  });

  const handleCopy = () => {
    if (order?.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentStatusIndex = resolveMilestoneStageIndex(order?.status);
  const canCancel =
    order?.status === 'CREATED' ||
    order?.status === 'CONFIRMED' ||
    order?.status === 'PICKUP_ASSIGNED';

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
            {errorObj?.status === 401 && (
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/bookings/${id}`)}`}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                Sign In
              </Link>
            )}
            <button
              type="button"
              onClick={() => fetchOrder()}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-primary">Order #{order.id}</span>
                <span className="badge badge-success">
                  {order.pickupMethod === 'BRANCH_DROPOFF' ? 'Branch Drop-Off' : 'Courier Pickup'}
                </span>
                {order.paymentMethod && (
                  <span className="badge badge-primary">
                    {order.paymentMethod} · {order.paymentStatus}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
                Tracking: <span style={{ color: '#60a5fa' }}>{order.trackingNumber}</span>
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Route: {order.originBranchName || order.branch || 'Origin Hub'} →{' '}
                {order.destinationBranchName || 'Destination Hub'}{' '}
                {order.distanceKm !== undefined ? `(${Number(order.distanceKm).toFixed(2)} km)` : ''}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Delivery Fee</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
                {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
              </div>
              {order.paymentMethod === 'COD' && Number(order.codAmount || 0) > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#fbbf24', marginTop: '2px' }}>
                  COD Collection: {order.currency || 'LKR'} {Number(order.codAmount).toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Delivery Status & Lifecycle Milestones */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={18} color="#3b82f6" />
                  Delivery Lifecycle Status
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Current status: <strong style={{ color: '#ffffff' }}>{order.statusLabel || order.status}</strong> (
                  <code>{order.status}</code>)
                </p>
              </div>

              <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                <span className="pulse-dot online"></span> {order.statusLabel || order.status}
              </span>
            </div>

            {/* Visual Timeline */}
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
                const isPassed = currentStatusIndex >= idx && order.status !== 'CANCELLED';
                const isCurrent = currentStatusIndex === idx && order.status !== 'CANCELLED';

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

            {/* Immutable Tracking Events Timeline from Backend */}
            {order.trackingEvents && order.trackingEvents.length > 0 && (
              <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd', marginBottom: '0.75rem' }}>
                  Recorded Tracking Audit Log ({order.trackingEvents.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {order.trackingEvents.map((ev, index) => (
                    <div
                      key={ev.id || index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.6)',
                        padding: '0.65rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#e2e8f0' }}>{ev.statusLabel || ev.status}</strong>
                        {ev.location && <span style={{ color: '#60a5fa' }}> · {ev.location}</span>}
                        {ev.description && <div style={{ color: '#94a3b8', marginTop: '2px' }}>{ev.description}</div>}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Information & Prepaid Confirmation Card */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.9rem', fontWeight: 700 }}>
              <CreditCard size={16} /> PAYMENT &amp; BRANCH RESOLUTION DETAILS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#64748b' }}>Payment Method</div>
                <strong style={{ color: '#ffffff' }}>{order.paymentMethod || 'PREPAID'}</strong>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Payment Status</div>
                <strong style={{ color: order.paymentStatus === 'PAID' ? '#34d399' : '#fbbf24' }}>
                  {order.paymentStatus || 'PENDING_PAYMENT'}
                </strong>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Origin Branch</div>
                <strong style={{ color: '#ffffff' }}>
                  {order.originBranchName || order.branch || '—'} ({order.originBranchCode || '—'})
                </strong>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Destination Branch</div>
                <strong style={{ color: '#ffffff' }}>
                  {order.destinationBranchName || '—'} ({order.destinationBranchCode || '—'})
                </strong>
              </div>
            </div>

            {order.paymentMethod === 'PREPAID' && order.paymentStatus === 'PENDING_PAYMENT' && (
              <div
                style={{
                  background: 'rgba(30, 58, 138, 0.25)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd' }}>
                    Prepaid Payment Awaiting Verification
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Provide a verified transaction reference (`PAY-*` or `TXN-*`) to mark this order as PAID and CONFIRMED.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={paymentTokenInput}
                    onChange={(e) => setPaymentTokenInput(e.target.value)}
                    placeholder="PAY-VERIFIED-1001"
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => confirmPaymentMutation.mutate()}
                    disabled={confirmPaymentMutation.isPending}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                  >
                    {confirmPaymentMutation.isPending ? 'Verifying...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Details 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Pickup Details Card */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', fontSize: '0.9rem', fontWeight: 700 }}>
                <MapPin size={16} /> SENDER &amp; PICKUP LOCATION
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
                {order.originBranchName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={13} color="#64748b" /> Origin Branch: <strong style={{ color: '#e2e8f0' }}>{order.originBranchName}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Destination Details Card */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.9rem', fontWeight: 700 }}>
                <MapPin size={16} /> RECIPIENT &amp; DESTINATION
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
                {order.destinationBranchName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={13} color="#64748b" /> Destination Branch: <strong style={{ color: '#e2e8f0' }}>{order.destinationBranchName}</strong>
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
                <em>&quot;{order.deliveryInstructions}&quot;</em>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link href="/bookings" className="btn btn-secondary">
              ← Return to All Deliveries
            </Link>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {canCancel && (
                <button
                  type="button"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171' }}
                >
                  <XCircle size={16} /> {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}

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
