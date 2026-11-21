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
  Clock,
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
  const isCancelled = order?.status === 'CANCELLED';
  const canCancel =
    order?.status === 'CREATED' ||
    order?.status === 'CONFIRMED' ||
    order?.status === 'PICKUP_ASSIGNED';

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/bookings" className="sd-back-btn" aria-label="Back to My Deliveries">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="sd-header-title">
                {order ? `Delivery #${order.id}` : `Delivery Order #${id}`}
              </h1>
              <div className="sd-header-sub">
                {order?.trackingNumber
                  ? `Tracking ${order.trackingNumber} · Live status & shipment details`
                  : 'Shipment lifecycle, route, and payment details'}
              </div>
            </div>
          </div>

          {order && (
            <div className="sd-header-actions">
              {order.trackingNumber && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="sd-header-action-btn secondary"
                >
                  {copied ? (
                    <>
                      <Check size={15} color="#4ade80" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={15} /> Copy Tracking #
                    </>
                  )}
                </button>
              )}
              <Link
                href={`/bookings/${id}/receipt`}
                className="sd-header-action-btn secondary"
              >
                <FileText size={15} /> View Receipt
              </Link>
              {order.trackingNumber && (
                <Link
                  href={`/tracking?trackingNumber=${encodeURIComponent(order.trackingNumber)}`}
                  className="sd-header-book-btn"
                >
                  <Compass size={15} /> Track on Map
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ---------------- BODY CONTENT ---------------- */}
      <div className="sd-fullpage-body">
        <div className="sd-content-wrapper" style={{ maxWidth: '1040px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* STATE 1: LOADING */}
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
                Loading delivery details...
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Fetching Order #{id} from Order Service
              </p>
            </div>
          )}

          {/* STATE 2: ERROR */}
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
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={28} color="#dc2626" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#991b1b', margin: '0 0 0.35rem 0' }}>
                  Delivery Details Unavailable
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#7f1d1d', maxWidth: '500px', margin: 0 }}>
                  {error}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.25rem' }}>
                {errorObj?.status === 401 && (
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/bookings/${id}`)}`}
                    className="sd-btn-primary"
                  >
                    Sign In
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => fetchOrder()}
                  className="sd-btn-outline"
                >
                  Retry
                </button>
                <Link href="/bookings" className="sd-btn-primary">
                  Return to Deliveries
                </Link>
              </div>
            </div>
          )}

          {/* STATE 3: ORDER LOADED */}
          {!isLoading && !error && order && (
            <>
              {/* Hero Summary Card */}
              <div
                className="sd-card"
                style={{
                  padding: '1.75rem 2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="sd-pill sd-pill-blue">Order #{order.id}</span>
                    <span className="sd-pill sd-pill-green">
                      {order.pickupMethod === 'BRANCH_DROPOFF' ? 'Branch Drop-Off' : 'Courier Pickup'}
                    </span>
                    {order.paymentMethod && (
                      <span
                        className={`sd-pill ${
                          order.paymentStatus === 'PAID' ? 'sd-pill-emerald' : 'sd-pill-amber'
                        }`}
                      >
                        {order.paymentMethod} · {order.paymentStatus}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                      Tracking:{' '}
                      <span style={{ color: '#2563eb', fontFamily: 'monospace' }}>
                        {order.trackingNumber}
                      </span>
                    </h2>
                  </div>

                  <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <MapPin size={15} color="#2563eb" />
                    <span>
                      <strong>{order.originBranchName || order.branch || 'Origin Hub'}</strong>
                      {' → '}
                      <strong>{order.destinationBranchName || 'Destination Hub'}</strong>
                      {order.distanceKm !== undefined ? ` (${Number(order.distanceKm).toFixed(2)} km)` : ''}
                    </span>
                  </p>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem 1.35rem',
                    textAlign: 'right',
                    minWidth: '180px',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Delivery Fee
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                    {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
                  </div>
                  {order.paymentMethod === 'COD' && Number(order.codAmount || 0) > 0 && (
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#b45309', marginTop: '0.25rem' }}>
                      COD Collection: {order.currency || 'LKR'} {Number(order.codAmount).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Status & Lifecycle Milestones */}
              <div className="sd-card-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Truck size={18} color="#2563eb" />
                      Delivery Lifecycle Status
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                      Current status: <strong style={{ color: '#0f172a' }}>{order.statusLabel || order.status}</strong>{' '}
                      <code style={{ background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {order.status}
                      </code>
                    </p>
                  </div>

                  <span
                    className={`sd-pill ${
                      isCancelled ? 'sd-pill-red' : order.status === 'DELIVERED' ? 'sd-pill-emerald' : 'sd-pill-blue'
                    }`}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isCancelled ? '#dc2626' : order.status === 'DELIVERED' ? '#16a34a' : '#2563eb',
                      }}
                    />
                    {order.statusLabel || order.status}
                  </span>
                </div>

                {/* Visual Milestone Stepper */}
                <div className="sd-milestone-grid">
                  {STATUS_MILESTONES.map((milestone, idx) => {
                    const isPassed = currentStatusIndex >= idx && !isCancelled;
                    const isCurrent = currentStatusIndex === idx && !isCancelled;

                    return (
                      <div key={milestone.status} className="sd-milestone-step">
                        <div
                          className={`sd-milestone-circle ${
                            isCurrent ? 'current' : isPassed ? 'passed' : 'upcoming'
                          }`}
                        >
                          {isPassed && !isCurrent ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: isCurrent ? '#2563eb' : isPassed ? '#15803d' : '#64748b',
                          }}
                        >
                          {milestone.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: '140px', lineHeight: 1.35 }}>
                          {milestone.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Immutable Tracking Events Timeline from Backend */}
                {order.trackingEvents && order.trackingEvents.length > 0 && (
                  <div style={{ paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={15} color="#2563eb" />
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
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            fontSize: '0.825rem',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#0f172a' }}>{ev.statusLabel || ev.status}</strong>
                            {ev.location && <span style={{ color: '#2563eb', fontWeight: 600 }}> · {ev.location}</span>}
                            {ev.description && (
                              <div style={{ color: '#475569', marginTop: '2px', fontSize: '0.8rem' }}>{ev.description}</div>
                            )}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>
                            {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Information & Prepaid Confirmation Card */}
              <div className="sd-card-panel" style={{ gap: '1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontSize: '0.95rem', fontWeight: 700 }}>
                  <CreditCard size={17} color="#2563eb" />
                  Payment &amp; Branch Resolution Details
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                  <div className="sd-info-tile">
                    <div className="sd-info-label">Payment Method</div>
                    <div className="sd-info-value">{order.paymentMethod || 'PREPAID'}</div>
                  </div>
                  <div className="sd-info-tile">
                    <div className="sd-info-label">Payment Status</div>
                    <div
                      className="sd-info-value"
                      style={{ color: order.paymentStatus === 'PAID' ? '#15803d' : '#b45309' }}
                    >
                      {order.paymentStatus || 'PENDING_PAYMENT'}
                    </div>
                  </div>
                  <div className="sd-info-tile">
                    <div className="sd-info-label">Origin Branch</div>
                    <div className="sd-info-value">
                      {order.originBranchName || order.branch || '—'} ({order.originBranchCode || '—'})
                    </div>
                  </div>
                  <div className="sd-info-tile">
                    <div className="sd-info-label">Destination Branch</div>
                    <div className="sd-info-value">
                      {order.destinationBranchName || '—'} ({order.destinationBranchCode || '—'})
                    </div>
                  </div>
                </div>

                {order.paymentMethod === 'PREPAID' && order.paymentStatus === 'PENDING_PAYMENT' && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.85rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>
                        Prepaid Payment Awaiting Verification
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                        Provide a verified transaction reference (<code>PAY-*</code> or <code>TXN-*</code>) to mark this order as PAID and CONFIRMED.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={paymentTokenInput}
                        onChange={(e) => setPaymentTokenInput(e.target.value)}
                        placeholder="PAY-VERIFIED-1001"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 500,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => confirmPaymentMutation.mutate()}
                        disabled={confirmPaymentMutation.isPending}
                        className="sd-btn-primary"
                        style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                      >
                        {confirmPaymentMutation.isPending ? 'Verifying...' : 'Confirm Payment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Details 2-Column Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* Pickup Details Card */}
                <div className="sd-card-panel" style={{ padding: '1.5rem', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#2563eb', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <MapPin size={16} /> Sender &amp; Pickup Location
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                    {order.pickupAddress}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.15rem' }}>
                    {order.pickupContactName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <User size={14} color="#64748b" /> Contact: <strong style={{ color: '#0f172a' }}>{order.pickupContactName}</strong>
                      </div>
                    )}
                    {order.pickupContactPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Phone size={14} color="#64748b" /> Phone: <strong style={{ color: '#0f172a' }}>{order.pickupContactPhone}</strong>
                      </div>
                    )}
                    {order.originBranchName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Building2 size={14} color="#64748b" /> Origin Branch: <strong style={{ color: '#0f172a' }}>{order.originBranchName}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Details Card */}
                <div className="sd-card-panel" style={{ padding: '1.5rem', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#15803d', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <MapPin size={16} /> Recipient &amp; Destination
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                    {order.dropoffAddress}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.15rem' }}>
                    {order.dropoffContactName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <User size={14} color="#64748b" /> Recipient: <strong style={{ color: '#0f172a' }}>{order.dropoffContactName}</strong>
                      </div>
                    )}
                    {order.dropoffContactPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Phone size={14} color="#64748b" /> Phone: <strong style={{ color: '#0f172a' }}>{order.dropoffContactPhone}</strong>
                      </div>
                    )}
                    {order.destinationBranchName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Building2 size={14} color="#64748b" /> Destination Branch: <strong style={{ color: '#0f172a' }}>{order.destinationBranchName}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Parcel Specifications Card */}
              <div className="sd-card-panel" style={{ padding: '1.5rem', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#4338ca', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Package size={16} /> Parcel Specifications
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="sd-info-tile">
                    <div className="sd-info-label">Contents</div>
                    <div className="sd-info-value">{order.parcelDescription || 'General Cargo'}</div>
                  </div>
                  <div className="sd-info-tile">
                    <div className="sd-info-label">Size Category</div>
                    <div>
                      <span className="sd-pill sd-pill-indigo">{order.parcelSize || 'STANDARD'}</span>
                    </div>
                  </div>
                  <div className="sd-info-tile">
                    <div className="sd-info-label">Weight</div>
                    <div className="sd-info-value">{order.weightKg ? `${order.weightKg} kg` : '—'}</div>
                  </div>
                </div>

                {order.deliveryInstructions && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderLeft: '3px solid #2563eb',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.84rem',
                      color: '#334155',
                    }}
                  >
                    <strong style={{ color: '#0f172a' }}>Special Instructions: </strong>
                    <span>&ldquo;{order.deliveryInstructions}&rdquo;</span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <Link href="/bookings" className="sd-btn-outline">
                  <ArrowLeft size={15} /> Return to All Deliveries
                </Link>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      className="sd-btn-danger-outline"
                    >
                      <XCircle size={15} /> {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}

                  {order.trackingNumber && (
                    <Link
                      href={`/tracking?trackingNumber=${encodeURIComponent(order.trackingNumber)}`}
                      className="sd-btn-outline"
                    >
                      <Compass size={15} /> Track on Map
                    </Link>
                  )}

                  <Link href={`/bookings/${id}/receipt`} className="sd-btn-outline">
                    <FileText size={15} /> View Receipt
                  </Link>

                  <Link href="/book" className="sd-btn-primary">
                    <PlusCircle size={15} /> Book Another Delivery
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        .sd-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.7rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .sd-pill-blue {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .sd-pill-green,
        .sd-pill-emerald {
          background: #dcfce7;
          color: #15803d;
        }
        .sd-pill-amber {
          background: #fef3c7;
          color: #b45309;
        }
        .sd-pill-red {
          background: #fee2e2;
          color: #b91c1c;
        }
        .sd-pill-indigo {
          background: #e0e7ff;
          color: #4338ca;
        }

        .sd-info-tile {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .sd-info-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .sd-info-value {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-milestone-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.75rem;
          padding-top: 0.5rem;
        }
        @media (max-width: 720px) {
          .sd-milestone-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
        .sd-milestone-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.45rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem 0.6rem;
        }
        .sd-milestone-circle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .sd-milestone-circle.current {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 0 0 4px #dbeafe;
        }
        .sd-milestone-circle.passed {
          background: #16a34a;
          color: #ffffff;
        }
        .sd-milestone-circle.upcoming {
          background: #e2e8f0;
          color: #475569;
        }

        .sd-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #2563eb;
          color: #ffffff;
          border: 1px solid #2563eb;
          border-radius: 8px;
          padding: 0.6rem 1.1rem;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .sd-btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .sd-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sd-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.6rem 1.05rem;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .sd-btn-outline:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .sd-btn-danger-outline {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 0.6rem 1.05rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .sd-btn-danger-outline:hover:not(:disabled) {
          background: #fef2f2;
        }
        .sd-btn-danger-outline:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

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
