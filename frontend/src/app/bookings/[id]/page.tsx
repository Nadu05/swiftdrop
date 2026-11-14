'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Building2,
  Scale,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  Copy,
  Download,
  Check,
  ShieldCheck,
  Truck,
  User,
  Phone,
  CheckCircle2,
  Clock,
  Compass,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { getOrderById } from '@/api/services/orders.api';
import type { DeliveryOrder, OrderStatus } from '@/types/order.types';

/**
 * Standard Delivery Milestones
 * Ordered chronologically across the parcel lifecycle.
 */
interface MilestoneItem {
  status: OrderStatus;
  label: string;
  desc: string;
  note: string;
}

const STATUS_MILESTONES: MilestoneItem[] = [
  {
    status: 'Created',
    label: 'Order Created',
    desc: 'Booking confirmed in system',
    note: 'Order details verified & dispatch assigned',
  },
  {
    status: 'Picked Up',
    label: 'Picked Up',
    desc: 'Courier collected parcel',
    note: 'Securely packaged and barcoded',
  },
  {
    status: 'In Transit',
    label: 'In Transit',
    desc: 'Moving through logistics network',
    note: 'En route between regional dispatch hubs',
  },
  {
    status: 'Out for Delivery',
    label: 'Out for Delivery',
    desc: 'Courier en route to recipient',
    note: 'Estimated arrival window active',
  },
  {
    status: 'Delivered',
    label: 'Delivered',
    desc: 'Successfully handed over',
    note: 'Delivery completed & confirmed',
  },
];

/**
 * Customer Portal — Order Details & Milestones
 * Route: /bookings/[id]
 *
 * Combines the Delivery Lifecycle Milestones (visual timeline) and
 * Comprehensive Order Details (pickup, dropoff, parcel specs, courier)
 * into a single unified, responsive page consistent with the Customer Portal theme:
 * - #0f1f38 Pinned Navy Header with back navigation & quick actions
 * - #f4f7fb Clean Light Canvas
 * - #ffffff Clean White Cards with soft borders (#e2e8f0) and subtle shadows
 * - Responsive 2-column layout (Milestones Timeline + Details Section)
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

  // Determine current milestone index based on authoritative order status
  const getMilestoneIndex = (status?: string): number => {
    const s = (status || '').toUpperCase().trim();
    if (s === 'DELIVERED') return 4;
    if (s === 'OUT FOR DELIVERY' || s === 'OUT_FOR_DELIVERY') return 3;
    if (s === 'IN TRANSIT' || s === 'IN_TRANSIT') return 2;
    if (s === 'PICKED UP' || s === 'PICKED_UP') return 1;
    if (s === 'CREATED') return 0;
    return 0;
  };

  const currentMilestoneIndex = getMilestoneIndex(order?.status);

  // Status badge styling helper
  const renderStatusBadge = (status?: string) => {
    const s = (status || '').toUpperCase().trim();
    if (s === 'DELIVERED') {
      return (
        <span className="sd-badge sd-badge-delivered">
          <CheckCircle2 size={13} /> Delivered
        </span>
      );
    }
    if (s === 'FAILED' || s === 'CANCELLED') {
      return (
        <span className="sd-badge sd-badge-failed">
          <AlertCircle size={13} /> {order?.status || 'Cancelled'}
        </span>
      );
    }
    return (
      <span className="sd-badge sd-badge-active">
        <span className="sd-pulse-dot" /> {order?.status || 'In Transit'}
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/bookings" className="sd-back-btn" aria-label="Back to My Deliveries">
              <ArrowLeft size={19} />
            </Link>
            <div>
              <h1 className="sd-header-title">Delivery Details &amp; Milestones</h1>
              <div className="sd-header-sub">
                Order #{order?.id || id} · Tracking #{order?.trackingNumber || '...'}
              </div>
            </div>
          </div>

          <div className="sd-header-actions">
            <button
              type="button"
              onClick={fetchOrder}
              disabled={isLoading}
              className="sd-header-btn secondary"
              title="Refresh order details"
            >
              <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <Link
              href={`/bookings/${id}/receipt`}
              className="sd-header-btn"
              title="Download your receipt"
            >
              <Download size={14} />
              <span>Download Receipt</span>
            </Link>

            {order?.trackingNumber && (
              <Link
                href={`/tracking?trackingNumber=${encodeURIComponent(order.trackingNumber)}`}
                className="sd-header-btn primary"
              >
                <Compass size={14} />
                <span>Track on Map</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- MAIN BODY CANVAS (LIGHT THEME) ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          {/* PAGE HEADING */}
          <div className="sd-page-heading">
            <h2 className="sd-page-heading-title">Delivery Details</h2>
            <p className="sd-page-heading-sub">
              Follow your parcel's progress and see everything about this delivery.
            </p>
          </div>

          {/* LOADING STATE */}
          {isLoading && (
            <div className="sd-card sd-state-card">
              <Loader2 size={36} color="#2563eb" className="animate-spin" />
              <div className="sd-state-title">Loading delivery details...</div>
              <p className="sd-state-sub">Fetching Order #{id} from SwiftDrop Order Service</p>
            </div>
          )}

          {/* ERROR STATE */}
          {!isLoading && error && (
            <div className="sd-card sd-state-card error">
              <AlertCircle size={36} color="#dc2626" />
              <div className="sd-state-title text-red">Delivery Details Unavailable</div>
              <p className="sd-state-sub">{error}</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={fetchOrder} className="sd-btn-primary">
                  Try Again
                </button>
                <Link href="/bookings" className="sd-btn-secondary">
                  Back to My Deliveries
                </Link>
              </div>
            </div>
          )}

          {/* ---------------- ORDER LOADED: UNIFIED SINGLE PAGE ---------------- */}
          {!isLoading && !error && order && (
            <div className="sd-order-layout">
              {/* Top Hero Summary Card */}
              <section className="sd-card sd-hero-card" aria-label="Order Overview">
                <div className="sd-hero-top-row">
                  <div className="sd-hero-id-col">
                    <div className="sd-hero-tracking-wrap">
                      <span className="sd-hero-tracking">{order.trackingNumber}</span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="sd-copy-pill"
                        title="Copy tracking number"
                      >
                        {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="sd-hero-order-id">
                      Order ID: <code>#{order.id}</code> · Booked on {formatDate(order.createdAt)}
                    </div>
                  </div>

                  <div className="sd-hero-status-col">
                    {renderStatusBadge(order.status)}
                    <div className="sd-hero-fee">
                      <span className="sd-fee-label">Total Delivery Fee</span>
                      <span className="sd-fee-val">
                        {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Quick Ribbon */}
                <div className="sd-hero-ribbon">
                  <div className="sd-ribbon-item">
                    <span className="sd-ribbon-icon">
                      <Building2 size={17} />
                    </span>
                    <div className="sd-ribbon-text">
                      <span className="lbl">Branch Operations</span>
                      <span className="val">{order.branch || 'Colombo Central Branch'}</span>
                    </div>
                  </div>
                  <div className="sd-ribbon-item">
                    <span className="sd-ribbon-icon">
                      <Package size={17} />
                    </span>
                    <div className="sd-ribbon-text">
                      <span className="lbl">Parcel Category</span>
                      <span className="val">{order.parcelSize || 'STANDARD'} Parcel</span>
                    </div>
                  </div>
                  <div className="sd-ribbon-item">
                    <span className="sd-ribbon-icon">
                      <Scale size={17} />
                    </span>
                    <div className="sd-ribbon-text">
                      <span className="lbl">Weight</span>
                      <span className="val">{order.weightKg || '0.5'} kg</span>
                    </div>
                  </div>
                  <div className="sd-ribbon-item">
                    <span className="sd-ribbon-icon">
                      <User size={17} />
                    </span>
                    <div className="sd-ribbon-text">
                      <span className="lbl">Assigned Courier</span>
                      <span className="val">{order.courierName || 'Kasun Perera'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Unified 2-Column Section: Milestones Timeline + Delivery Details */}
              <div className="sd-sections-grid">
                {/* ==============================================================
                    LEFT COLUMN: MILESTONES & LIFECYCLE TIMELINE SECTION
                   ============================================================== */}
                <section className="sd-card sd-timeline-section" aria-label="Delivery Milestones">
                  <div className="sd-section-header">
                    <div className="sd-section-header-left">
                      <div className="sd-section-icon-box blue">
                        <Truck size={18} color="#2563eb" />
                      </div>
                      <div>
                        <h2 className="sd-section-title">Delivery Milestones</h2>
                        <div className="sd-section-sub">Authoritative parcel lifecycle progression</div>
                      </div>
                    </div>
                    <span className="sd-milestone-counter">
                      Step {Math.min(currentMilestoneIndex + 1, STATUS_MILESTONES.length)} of {STATUS_MILESTONES.length}
                    </span>
                  </div>

                  {/* Visual Milestone Stepper */}
                  <div className="sd-stepper-container">
                    {STATUS_MILESTONES.map((milestone, idx) => {
                      const isPassed = currentMilestoneIndex > idx;
                      const isCurrent = currentMilestoneIndex === idx;
                      const isLast = idx === STATUS_MILESTONES.length - 1;

                      return (
                        <div
                          key={milestone.status}
                          className={`sd-timeline-step ${
                            isCurrent ? 'current' : isPassed ? 'completed' : 'pending'
                          }`}
                        >
                          {/* Indicator & Connecting Vertical Line */}
                          <div className="sd-step-indicator-wrapper">
                            <div className="sd-step-circle">
                              {isPassed ? (
                                <Check size={14} strokeWidth={3} />
                              ) : isCurrent ? (
                                <span className="sd-current-pulse-dot" />
                              ) : (
                                <span className="sd-step-number">{idx + 1}</span>
                              )}
                            </div>
                            {!isLast && (
                              <div
                                className={`sd-step-track-line ${
                                  isPassed ? 'completed' : isCurrent ? 'active-gradient' : 'pending'
                                }`}
                              />
                            )}
                          </div>

                          {/* Step Content */}
                          <div className="sd-step-body">
                            <div className="sd-step-header-row">
                              <span className="sd-step-title">{milestone.label}</span>
                              {isCurrent && (
                                <span className="sd-active-milestone-pill">
                                  Current Status
                                </span>
                              )}
                              {isPassed && (
                                <span className="sd-completed-milestone-pill">
                                  Completed
                                </span>
                              )}
                            </div>
                            <p className="sd-step-desc">{milestone.desc}</p>
                            <span className="sd-step-note">{milestone.note}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Assigned Courier Strip */}
                  <div className="sd-courier-box">
                    <div className="sd-courier-avatar">
                      {order.courierName
                        ? order.courierName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'KP'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sd-courier-name-row">
                        <span className="sd-courier-name">{order.courierName || 'Kasun Perera'}</span>
                        <span className="sd-courier-verified-tag">
                          <ShieldCheck size={12} /> Verified Courier
                        </span>
                      </div>
                      <div className="sd-courier-meta">
                        <span>Colombo Central Fleet</span>
                      </div>
                    </div>
                    <div className="sd-courier-actions">
                      <a
                        href={`tel:${order.courierPhone || '+94771234567'}`}
                        className="sd-courier-call-btn"
                        title="Call courier"
                      >
                        <Phone size={13} /> Call
                      </a>
                    </div>
                  </div>
                </section>

                {/* ==============================================================
                    RIGHT COLUMN: COMPREHENSIVE ORDER DETAILS SECTION
                   ============================================================== */}
                <div className="sd-details-column">
                  {/* Card 1: Sender & Pickup Location */}
                  <section className="sd-card sd-detail-card" aria-label="Pickup Details">
                    <div className="sd-card-header-row">
                      <div className="sd-section-icon-box blue-soft">
                        <MapPin size={17} color="#2563eb" />
                      </div>
                      <div>
                        <h3 className="sd-card-title">Pickup &amp; Sender Details</h3>
                        <span className="sd-card-subtitle">Origin verification</span>
                      </div>
                    </div>

                    <div className="sd-detail-item">
                      <span className="sd-detail-lbl">Pickup Address</span>
                      <div className="sd-detail-val address">{order.pickupAddress}</div>
                    </div>

                    <div className="sd-contacts-grid">
                      <div className="sd-contact-box">
                        <span className="sd-detail-lbl">
                          <User size={12} /> Contact Name
                        </span>
                        <span className="sd-detail-val">
                          {order.pickupContactName || 'Nuwan Pradeep'}
                        </span>
                      </div>
                      <div className="sd-contact-box">
                        <span className="sd-detail-lbl">
                          <Phone size={12} /> Phone Number
                        </span>
                        <span className="sd-detail-val">
                          {order.pickupContactPhone || '+94 77 123 4567'}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Card 2: Recipient & Delivery Destination */}
                  <section className="sd-card sd-detail-card" aria-label="Destination Details">
                    <div className="sd-card-header-row">
                      <div className="sd-section-icon-box green-soft">
                        <MapPin size={17} color="#16a34a" />
                      </div>
                      <div>
                        <h3 className="sd-card-title">Recipient &amp; Destination</h3>
                        <span className="sd-card-subtitle">Drop-off destination</span>
                      </div>
                    </div>

                    <div className="sd-detail-item">
                      <span className="sd-detail-lbl">Delivery Destination</span>
                      <div className="sd-detail-val address">{order.dropoffAddress}</div>
                    </div>

                    <div className="sd-contacts-grid">
                      <div className="sd-contact-box">
                        <span className="sd-detail-lbl">
                          <User size={12} /> Recipient Name
                        </span>
                        <span className="sd-detail-val">
                          {order.dropoffContactName || 'Kasun Perera'}
                        </span>
                      </div>
                      <div className="sd-contact-box">
                        <span className="sd-detail-lbl">
                          <Phone size={12} /> Recipient Phone
                        </span>
                        <span className="sd-detail-val">
                          {order.dropoffContactPhone || '+94 71 998 8776'}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Card 3: Parcel Specifications */}
                  <section className="sd-card sd-detail-card" aria-label="Parcel Specifications">
                    <div className="sd-card-header-row">
                      <div className="sd-section-icon-box purple-soft">
                        <Package size={17} color="#7c3aed" />
                      </div>
                      <div>
                        <h3 className="sd-card-title">Parcel Specifications</h3>
                        <span className="sd-card-subtitle">Package details</span>
                      </div>
                    </div>

                    <div className="sd-specs-grid">
                      <div className="sd-spec-box">
                        <span className="sd-detail-lbl">Description</span>
                        <span className="sd-detail-val">
                          {order.parcelDescription || 'Urgent Legal Contracts & Documents'}
                        </span>
                      </div>
                      <div className="sd-spec-box">
                        <span className="sd-detail-lbl">Size Category</span>
                        <span className="sd-size-with-weight">
                          <span className="sd-size-badge">{order.parcelSize || 'SMALL'}</span>
                          <span className="sd-detail-val">{order.weightKg || '0.5'} kg</span>
                        </span>
                      </div>
                    </div>

                    {order.deliveryInstructions && (
                      <div className="sd-instructions-box">
                        <span className="sd-detail-lbl">Special Instructions</span>
                        <p className="sd-instructions-text">"{order.deliveryInstructions}"</p>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- COMPREHENSIVE STYLES ---------------- */}
      <style jsx global>{`
        /* Reset & Canvas Root */
        .sd-fullpage-root {
          width: 100%;
          min-height: 100vh;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
        }

        /* Edge-to-Edge Navy Header */
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
          padding: 1.75rem 2rem 3rem 2rem;
          background: #f4f7fb;
          width: 100%;
        }

        .sd-content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* White Cards Base */
        .sd-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        /* State Cards (Loading & Error) */
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

        /* Order Layout */
        .sd-order-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Page heading under the top bar */
        .sd-page-heading {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1.5rem;
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

        /* Hero Summary Card */
        .sd-hero-card {
          padding: 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .sd-hero-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1.25rem;
        }

        .sd-hero-id-col {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .sd-hero-tracking-wrap {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .sd-hero-tracking {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .sd-copy-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .sd-copy-pill:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .sd-hero-order-id {
          font-size: 0.825rem;
          color: #64748b;
        }

        .sd-hero-order-id code {
          background: #f1f5f9;
          color: #2563eb;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .sd-hero-status-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .sd-hero-fee {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .sd-fee-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .sd-fee-val {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
        }

        /* Hero Ribbon */
        .sd-hero-ribbon {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          padding-top: 1.15rem;
          border-top: 1px solid #f1f5f9;
        }

        .sd-ribbon-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }

        .sd-ribbon-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-ribbon-text {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }

        .sd-ribbon-item .lbl {
          font-size: 0.68rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .sd-ribbon-item .val {
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f172a;
        }

        /* Status Badges */
        .sd-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.8rem;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .sd-badge-active {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }

        .sd-badge-delivered {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .sd-badge-failed {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .sd-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2563eb;
          box-shadow: 0 0 6px rgba(37, 99, 235, 0.6);
        }

        /* Sections 2-Column Grid */
        .sd-sections-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 1.5rem;
          align-items: stretch;
        }

        /* Timeline Section */
        .sd-timeline-section {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sd-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .sd-section-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-section-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-section-icon-box.blue {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }

        .sd-section-icon-box.blue-soft {
          background: #eff6ff;
          border: 1px solid #dbeafe;
        }

        .sd-section-icon-box.green-soft {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .sd-section-icon-box.purple-soft {
          background: #faf5ff;
          border: 1px solid #e9d5ff;
        }

        .sd-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .sd-section-sub {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }

        .sd-milestone-counter {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
        }

        /* Stepper Items */
        .sd-stepper-container {
          display: flex;
          flex-direction: column;
        }

        .sd-timeline-step {
          display: flex;
          gap: 1.15rem;
          position: relative;
        }

        .sd-step-indicator-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 32px;
        }

        .sd-step-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          font-weight: 700;
          z-index: 2;
          transition: all 0.2s ease;
        }

        .sd-timeline-step.completed .sd-step-circle {
          background: #16a34a;
          color: #ffffff;
          box-shadow: 0 0 0 3px #dcfce7;
        }

        .sd-timeline-step.current .sd-step-circle {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 0 0 4px #dbeafe;
        }

        .sd-timeline-step.pending .sd-step-circle {
          background: #f8fafc;
          color: #94a3b8;
          border: 2px solid #e2e8f0;
        }

        .sd-current-pulse-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffffff;
        }

        .sd-step-track-line {
          width: 2px;
          flex: 1;
          min-height: 44px;
          margin: 4px 0;
        }

        .sd-step-track-line.completed {
          background: #16a34a;
        }

        .sd-step-track-line.active-gradient {
          background: linear-gradient(180deg, #2563eb 0%, #cbd5e1 100%);
        }

        .sd-step-track-line.pending {
          background: #e2e8f0;
        }

        .sd-step-body {
          flex: 1;
          padding-bottom: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .sd-step-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .sd-step-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-timeline-step.completed .sd-step-title {
          color: #0f172a;
        }

        .sd-timeline-step.current .sd-step-title {
          color: #1d4ed8;
        }

        .sd-timeline-step.pending .sd-step-title {
          color: #64748b;
        }

        .sd-active-milestone-pill {
          font-size: 0.68rem;
          font-weight: 700;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
        }

        .sd-completed-milestone-pill {
          font-size: 0.68rem;
          font-weight: 700;
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
        }

        .sd-step-desc {
          font-size: 0.825rem;
          color: #475569;
          margin: 0;
        }

        .sd-step-note {
          font-size: 0.74rem;
          color: #94a3b8;
        }

        /* Assigned Courier Box */
        .sd-courier-box {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.85rem 1rem;
        }

        .sd-courier-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-courier-name-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .sd-courier-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-courier-verified-tag {
          font-size: 0.68rem;
          color: #16a34a;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
        }

        .sd-courier-meta {
          font-size: 0.72rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 2px;
        }

        .sd-courier-actions {
          flex-shrink: 0;
        }

        .sd-courier-call-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #2563eb;
          background: #ffffff;
          border: 1px solid #dbeafe;
          padding: 0.35rem 0.75rem;
          border-radius: 7px;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .sd-courier-call-btn:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        /* Details Column */
        .sd-details-column {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .sd-detail-card {
          padding: 1.35rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sd-card-header-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .sd-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .sd-card-subtitle {
          font-size: 0.72rem;
          color: #64748b;
        }

        .sd-detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .sd-detail-lbl {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.04em;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .sd-detail-val {
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-detail-val.address {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.4;
        }

        .sd-contacts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.75rem 0.85rem;
        }

        .sd-contact-box {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        /* Parcel Specifications */
        .sd-specs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }

        .sd-spec-box {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          padding: 0.65rem 0.85rem;
        }

        .sd-size-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          color: #7c3aed;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          padding: 0.15rem 0.5rem;
          border-radius: 5px;
          width: fit-content;
        }

        .sd-size-with-weight {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .sd-paid-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: #16a34a;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 0.15rem 0.5rem;
          border-radius: 5px;
          width: fit-content;
        }

        .sd-instructions-box {
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .sd-instructions-text {
          font-size: 0.825rem;
          color: #475569;
          margin: 0;
          font-style: italic;
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

        /* Utility buttons */
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

        .sd-btn-primary:hover {
          background: #1d4ed8;
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

        .sd-btn-secondary:hover {
          background: #f8fafc;
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) {
          .sd-sections-grid {
            grid-template-columns: 1fr;
          }

          .sd-hero-ribbon {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .sd-fullpage-header {
            padding: 1rem 1.25rem;
          }

          .sd-fullpage-body {
            padding: 1.25rem 1rem 2.5rem 1rem;
          }

          .sd-hero-card {
            padding: 1.25rem;
          }

          .sd-hero-top-row {
            flex-direction: column;
            gap: 0.85rem;
          }

          .sd-hero-status-col {
            align-items: flex-start;
          }

          .sd-hero-fee {
            align-items: flex-start;
          }

          .sd-hero-ribbon {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .sd-contacts-grid {
            grid-template-columns: 1fr;
          }

          .sd-specs-grid {
            grid-template-columns: 1fr;
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
