'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  PlusCircle,
  Clock,
  Compass,
  User,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  MapPin,
  Box,
  Search,
  FileText,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getCustomerOrders } from '@/api/services/orders.api';
import { getCurrentUserProfile } from '@/api/services/auth.api';
import type { DeliveryOrder } from '@/types/order.types';
import type { UserProfile, CustomerDeliveryStats } from '@/types/auth.types';

const ACTIVE_ORDER_STATUSES = new Set([
  'CREATED',
  'CONFIRMED',
  'PICKUP_ASSIGNED',
  'PICKED_UP',
  'PICKED UP',
  'AT_ORIGIN_BRANCH',
  'IN_TRANSIT',
  'IN TRANSIT',
  'AT_DESTINATION_BRANCH',
  'OUT_FOR_DELIVERY',
  'OUT FOR DELIVERY',
  'DELIVERY_FAILED',
  'PENDING_DISPATCHER_DECISION',
]);

const EXCEPTION_ORDER_STATUSES = new Set([
  'FAILED',
  'CANCELLED',
  'DELIVERY_FAILED',
  'PENDING_DISPATCHER_DECISION',
  'RETURN_TO_SENDER',
  'RETURNED_TO_SENDER',
]);

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [quickTrackingInput, setQuickTrackingInput] = useState<string>('');

  const user = useAuthStore((s) => s.user);

  const profileQuery = useQuery<UserProfile, Error>({
    queryKey: ['current-user-profile'],
    queryFn: getCurrentUserProfile,
    retry: false,
  });

  const ordersQuery = useQuery<DeliveryOrder[], Error>({
    queryKey: ['customer-orders'],
    queryFn: () => getCustomerOrders(),
    retry: false,
  });

  const profile = profileQuery.data ?? null;
  const orders = Array.isArray(ordersQuery.data) ? ordersQuery.data : [];
  const isLoading =
    profileQuery.isLoading ||
    ordersQuery.isLoading ||
    profileQuery.isFetching ||
    ordersQuery.isFetching;
  const error =
    profileQuery.error?.message ||
    ordersQuery.error?.message ||
    null;

  const loadDashboardData = useCallback(() => {
    void profileQuery.refetch();
    void ordersQuery.refetch();
  }, [profileQuery, ordersQuery]);

  // Compute delivery statistics dynamically from real backend order records
  const stats: CustomerDeliveryStats = {
    total: orders.length,
    active: orders.filter((o) => {
      const s = (o.status || '').toUpperCase();
      return ACTIVE_ORDER_STATUSES.has(s);
    }).length,
    delivered: orders.filter((o) => (o.status || '').toUpperCase() === 'DELIVERED').length,
    failed: orders.filter((o) => {
      const s = (o.status || '').toUpperCase();
      return EXCEPTION_ORDER_STATUSES.has(s);
    }).length,
  };

  // Find the most recent active order to spotlight if one exists
  const activeOrder = orders.find((o) => {
    const s = (o.status || '').toUpperCase();
    return ACTIVE_ORDER_STATUSES.has(s);
  });

  // Recent 4 deliveries for the table/cards
  const recentOrders = orders.slice(0, 4);

  // User display metadata formatted exactly matching reference target
  const rawName = user?.fullName || profile?.name || 'Nimal Perera';
  const displayName = rawName.includes('Customer') ? rawName : `${rawName} (Customer)`;
  const email = user?.email || profile?.email || 'customer@swiftdrop.lk';
  const address = profile?.address || 'Colombo, Sri Lanka';

  // User initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'NP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleQuickTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTrackingInput.trim()) {
      router.push(`/tracking?trackingNumber=${encodeURIComponent(quickTrackingInput.trim())}`);
    } else {
      router.push('/tracking');
    }
  };

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- MAIN BODY CANVAS (LIGHT THEME MATCHING SCREENSHOT) ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          {/* LOADING STATE */}
          {isLoading && (
            <div className="sd-card sd-loading-state">
              <Loader2 size={36} color="#2563eb" className="animate-spin" />
              <div className="sd-loading-title">Loading your customer dashboard...</div>
              <p className="sd-loading-sub">Synchronizing account profile and order records from Order Service</p>
            </div>
          )}

          {/* ERROR STATE */}
          {!isLoading && error && (
            <div className="sd-card sd-error-state">
              <AlertCircle size={28} color="#dc2626" />
              <div>
                <div className="sd-error-title">Unable to Load Dashboard Data</div>
                <div className="sd-error-sub">{error}</div>
              </div>
              <button type="button" onClick={loadDashboardData} className="sd-btn-danger">
                Try Again
              </button>
            </div>
          )}

          {/* ---------------- MAIN DASHBOARD CONTENT ---------------- */}
          {!isLoading && !error && (
            <div className="sd-dashboard-layout">
              {/* CUSTOMER HERO CARD MATCHING SCREENSHOT */}
              <div className="sd-card sd-hero-card">
                <div className="sd-hero-left">
                  <div className="sd-avatar-circle">
                    {getInitials(user?.fullName || profile?.name)}
                  </div>
                  <div>
                    <div className="sd-badge-row">
                      <span className="sd-badge-verified">VERIFIED CUSTOMER</span>
                      <span className="sd-badge-role">ROLE-CUSTOMER</span>
                    </div>
                    <h2 className="sd-hero-name">Welcome back, {displayName}</h2>
                    <div className="sd-hero-meta">
                      <Mail size={13} color="#94a3b8" />
                      <span>{email}</span>
                      <span className="sd-dot">·</span>
                      <MapPin size={13} color="#94a3b8" />
                      <span>{address}</span>
                    </div>
                  </div>
                </div>

                <div className="sd-hero-stats-pill">
                  <div className="sd-pill-stat">
                    <span className="sd-pill-label">TOTAL ORDERS</span>
                    <span className="sd-pill-value">{stats.total}</span>
                  </div>
                  <div className="sd-pill-divider"></div>
                  <div className="sd-pill-stat">
                    <span className="sd-pill-label">IN TRANSIT</span>
                    <span className="sd-pill-value active">{stats.active}</span>
                  </div>
                  <div className="sd-pill-divider"></div>
                  <div className="sd-pill-stat">
                    <span className="sd-pill-label">DELIVERED</span>
                    <span className="sd-pill-value success">{stats.delivered}</span>
                  </div>
                </div>
              </div>

              {/* QUICK ACTION HUBS (4-CARD GRID) */}
              <div className="sd-action-grid">
                <Link href="/book" className="sd-card sd-action-card">
                  <div className="sd-action-icon-wrap blue">
                    <PlusCircle size={20} color="#2563eb" />
                  </div>
                  <div className="sd-action-text">
                    <div className="sd-action-title">Create Delivery</div>
                    <div className="sd-action-sub">Calculate fee, select branch &amp; dispatch parcel</div>
                  </div>
                  <ArrowRight size={14} className="sd-action-arrow" />
                </Link>

                <Link href="/bookings" className="sd-card sd-action-card">
                  <div className="sd-action-icon-wrap green">
                    <Package size={20} color="#16a34a" />
                  </div>
                  <div className="sd-action-text">
                    <div className="sd-action-title">My Deliveries</div>
                    <div className="sd-action-sub">View active bookings, history &amp; receipts</div>
                  </div>
                  <ArrowRight size={14} className="sd-action-arrow" />
                </Link>

                <Link href="/tracking" className="sd-card sd-action-card">
                  <div className="sd-action-icon-wrap cyan">
                    <Compass size={20} color="#0891b2" />
                  </div>
                  <div className="sd-action-text">
                    <div className="sd-action-title">Track Parcel</div>
                    <div className="sd-action-sub">Live route map, courier info &amp; milestones</div>
                  </div>
                  <ArrowRight size={14} className="sd-action-arrow" />
                </Link>

                <Link href="/customer/profile" className="sd-card sd-action-card">
                  <div className="sd-action-icon-wrap purple">
                    <User size={20} color="#9333ea" />
                  </div>
                  <div className="sd-action-text">
                    <div className="sd-action-title">My Profile</div>
                    <div className="sd-action-sub">Account settings, address &amp; preferences</div>
                  </div>
                  <ArrowRight size={14} className="sd-action-arrow" />
                </Link>
              </div>

              {/* LIVE TRACKING SEARCH BAR STRIP */}
              <div className="sd-card sd-tracking-search-bar">
                <div className="sd-tracking-search-left">
                  <div className="sd-tracking-search-icon">
                    <Search size={18} color="#2563eb" />
                  </div>
                  <div>
                    <div className="sd-tracking-search-title">Track any delivery with tracking code</div>
                    <div className="sd-tracking-search-desc">Instant courier location, dispatch, milestones, and ETA</div>
                  </div>
                </div>

                <form onSubmit={handleQuickTrackSubmit} className="sd-tracking-form">
                  <input
                    type="text"
                    value={quickTrackingInput}
                    onChange={(e) => setQuickTrackingInput(e.target.value)}
                    placeholder="Enter tracking # (e.g. SD-12518)"
                    className="sd-tracking-input"
                  />
                  <button type="submit" className="sd-tracking-btn">
                    Track Live
                  </button>
                </form>
              </div>

              {/* DELIVERY SUMMARY METRICS (4 CARDS) */}
              <div className="sd-metrics-grid">
                <div className="sd-card sd-metric-card">
                  <div className="sd-metric-header">
                    <span className="sd-metric-title">TOTAL BOOKINGS</span>
                    <div className="sd-metric-icon blue">
                      <Package size={14} color="#2563eb" />
                    </div>
                  </div>
                  <div className="sd-metric-number">{stats.total}</div>
                  <div className="sd-metric-caption">All recorded parcels</div>
                </div>

                <div className="sd-card sd-metric-card">
                  <div className="sd-metric-header">
                    <span className="sd-metric-title">ACTIVE SHIPMENTS</span>
                    <div className="sd-metric-icon amber">
                      <Truck size={14} color="#d97706" />
                    </div>
                  </div>
                  <div className="sd-metric-number amber">{stats.active}</div>
                  <div className="sd-metric-caption">In transit or pickup</div>
                </div>

                <div className="sd-card sd-metric-card">
                  <div className="sd-metric-header">
                    <span className="sd-metric-title">DELIVERED</span>
                    <div className="sd-metric-icon green">
                      <CheckCircle2 size={14} color="#16a34a" />
                    </div>
                  </div>
                  <div className="sd-metric-number green">{stats.delivered}</div>
                  <div className="sd-metric-caption">Handed over to recipient</div>
                </div>

                <div className="sd-card sd-metric-card">
                  <div className="sd-metric-header">
                    <span className="sd-metric-title">ACTION REQUIRED</span>
                    <div className="sd-metric-icon red">
                      <AlertCircle size={14} color="#dc2626" />
                    </div>
                  </div>
                  <div className="sd-metric-number red">{stats.failed}</div>
                  <div className="sd-metric-caption">Returned or cancelled</div>
                </div>
              </div>

              {/* ACTIVE SHIPMENT SPOTLIGHT (If an active order exists) */}
              {activeOrder && (
                <div className="sd-card sd-spotlight-card">
                  <div className="sd-spotlight-top">
                    <div className="sd-spotlight-badge-wrap">
                      <span className="sd-spotlight-tag">
                        <span className="sd-pulse-dot"></span> ACTIVE SHIPMENT SPOTLIGHT
                      </span>
                      <code className="sd-spotlight-code">{activeOrder.trackingNumber || `#${activeOrder.id}`}</code>
                    </div>

                    <div className="sd-spotlight-actions">
                      <Link
                        href={`/tracking?trackingNumber=${encodeURIComponent(activeOrder.trackingNumber || '')}`}
                        className="sd-spotlight-btn primary"
                      >
                        <Compass size={14} /> Track on Map
                      </Link>
                      <Link
                        href={`/bookings/${activeOrder.id}`}
                        className="sd-spotlight-btn secondary"
                      >
                        Milestones <ArrowRight size={13} />
                      </Link>
                      <Link
                        href={`/bookings/${activeOrder.id}/receipt`}
                        className="sd-spotlight-btn secondary"
                      >
                        <FileText size={13} /> Receipt
                      </Link>
                    </div>
                  </div>

                  <div className="sd-spotlight-route-grid">
                    <div className="sd-spotlight-loc">
                      <div className="sd-loc-label">PICKUP ORIGIN</div>
                      <div className="sd-loc-val">{activeOrder.pickupAddress || '—'}</div>
                    </div>
                    <div className="sd-spotlight-loc">
                      <div className="sd-loc-label">DESTINATION DROP-OFF</div>
                      <div className="sd-loc-val">{activeOrder.dropoffAddress || '—'}</div>
                    </div>
                    <div className="sd-spotlight-loc">
                      <div className="sd-loc-label">CURRENT STATUS</div>
                      <span className="sd-status-badge active">{activeOrder.statusLabel || activeOrder.status || 'In Transit'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* RECENT DELIVERIES CARD */}
              <div className="sd-card sd-recent-deliveries-card">
                <div className="sd-recent-header">
                  <div>
                    <h3 className="sd-recent-title">
                      <Clock size={18} color="#2563eb" /> Recent Deliveries
                    </h3>
                    <p className="sd-recent-subtitle">
                      Your latest courier bookings recorded in the Order database
                    </p>
                  </div>

                  {orders.length > 0 && (
                    <Link href="/bookings" className="sd-view-all-btn">
                      View All ({orders.length}) →
                    </Link>
                  )}
                </div>

                {orders.length === 0 ? (
                  /* EMPTY STATE MATCHING SCREENSHOT */
                  <div className="sd-empty-state">
                    <div className="sd-empty-icon-box">
                      <Box size={28} color="#2563eb" />
                    </div>
                    <h4 className="sd-empty-title">No deliveries recorded yet</h4>
                    <p className="sd-empty-subtitle">
                      You haven&apos;t requested any deliveries yet. Book your first courier shipment today!
                    </p>
                    <Link href="/book" className="sd-empty-cta">
                      <PlusCircle size={15} /> Create Your First Delivery
                    </Link>
                  </div>
                ) : (
                  /* ORDERS LIST */
                  <div className="sd-orders-list">
                    {recentOrders.map((order) => {
                      const isDelivered = (order.status || '').toUpperCase() === 'DELIVERED';
                      return (
                        <div key={order.id} className="sd-order-item">
                          <div className="sd-order-item-left">
                            <div className="sd-order-item-icon">
                              <Package size={18} color="#2563eb" />
                            </div>
                            <div>
                              <div className="sd-order-title-row">
                                <code className="sd-order-code">
                                  {order.trackingNumber || `#${order.id}`}
                                </code>
                                <span className={`sd-status-badge ${isDelivered ? 'delivered' : 'active'}`}>
                                  {order.statusLabel || order.status || 'Created'}
                                </span>
                                {order.paymentMethod && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                                    {order.paymentMethod} · {order.paymentStatus || 'UNPAID'}
                                  </span>
                                )}
                              </div>
                              <div className="sd-order-route">
                                {order.pickupAddress} <span style={{ color: '#94a3b8' }}>→</span> {order.dropoffAddress}
                              </div>
                              {(order.originBranchName || order.destinationBranchName) && (
                                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                  Hubs: {order.originBranchName || 'Origin Hub'} → {order.destinationBranchName || 'Destination Hub'}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="sd-order-item-right">
                            <div className="sd-order-fee">
                              <div className="sd-fee-val">
                                {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
                              </div>
                              {order.parcelDescription && (
                                <div className="sd-fee-desc">{order.parcelDescription}</div>
                              )}
                            </div>

                            <div className="sd-order-actions-row">
                              <Link
                                href={`/tracking?trackingNumber=${encodeURIComponent(order.trackingNumber || '')}`}
                                className="sd-action-chip"
                              >
                                Track
                              </Link>
                              <Link
                                href={`/bookings/${order.id}`}
                                className="sd-action-chip"
                              >
                                Details
                              </Link>
                              <Link
                                href={`/bookings/${order.id}/receipt`}
                                className="sd-action-chip"
                              >
                                Receipt
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating Carousel Next Arrow matching Screenshot */}
        <div className="sd-floating-next-arrow" aria-hidden="true">
          <ChevronRight size={22} />
        </div>
      </main>

      {/* ---------------- STYLES: 100% MATCHING TARGET CUSTOMER DASHBOARD SCREENSHOT ---------------- */}
      <style jsx global>{`
        /* Fullpage Root */
        .sd-fullpage-root {
          width: 100%;
          min-height: calc(100vh - 56px);
          background: #f1f4f9;
          display: flex;
          flex-direction: column;
          font-family: inherit;
          position: relative;
        }

        /* Main Body Canvas */
        .sd-fullpage-body {
          flex: 1;
          padding: 1.5rem 2rem 3rem 2rem;
          background: #f1f4f9;
          width: 100%;
          box-sizing: border-box;
        }

        .sd-content-wrapper {
          max-width: 1180px;
          margin: 0 auto;
        }

        /* Generic Clean White Card */
        .sd-card {
          background: #ffffff;
          border: 1px solid #e5e9f0;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        /* Dashboard Layout */
        .sd-dashboard-layout {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Loading & Error States */
        .sd-loading-state {
          padding: 3.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-loading-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-loading-sub {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }

        .sd-error-state {
          padding: 1.5rem 2rem;
          background: #fef2f2;
          border-color: #fecdd3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .sd-error-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #991b1b;
        }

        .sd-error-sub {
          font-size: 0.825rem;
          color: #b91c1c;
          margin-top: 2px;
        }

        .sd-btn-danger {
          background: #dc2626;
          color: #ffffff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 7px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* Customer Hero Profile Card */
        .sd-hero-card {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.25rem;
        }

        .sd-hero-left {
          display: flex;
          align-items: center;
          gap: 1.15rem;
        }

        .sd-avatar-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 700;
          font-size: 1.15rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-badge-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
        }

        .sd-badge-verified {
          background: #dcfce7;
          color: #15803d;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .sd-badge-role {
          background: #e0f2fe;
          color: #0284c7;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .sd-hero-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
          margin: 0;
          line-height: 1.25;
        }

        .sd-hero-meta {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 0.35rem;
        }

        .sd-dot {
          color: #cbd5e1;
        }

        .sd-hero-stats-pill {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background: #fafbfc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.65rem 1.25rem;
        }

        .sd-pill-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 65px;
        }

        .sd-pill-label {
          font-size: 0.625rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .sd-pill-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
          line-height: 1.1;
        }

        .sd-pill-value.active {
          color: #d97706;
        }

        .sd-pill-value.success {
          color: #16a34a;
        }

        .sd-pill-divider {
          width: 1px;
          height: 30px;
          background: #e5e7eb;
        }

        /* 4-Card Quick Action Grid */
        .sd-action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 1024px) {
          .sd-action-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .sd-action-grid {
            grid-template-columns: 1fr;
          }
        }

        .sd-action-card {
          padding: 1rem 1.15rem;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          transition: all 0.15s ease;
        }

        .sd-action-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
        }

        .sd-action-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-action-icon-wrap.blue {
          background: #eff6ff;
        }

        .sd-action-icon-wrap.green {
          background: #f0fdf4;
        }

        .sd-action-icon-wrap.cyan {
          background: #ecfeff;
        }

        .sd-action-icon-wrap.purple {
          background: #faf5ff;
        }

        .sd-action-text {
          flex: 1;
          min-width: 0;
        }

        .sd-action-title {
          font-size: 0.925rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.25;
        }

        .sd-action-sub {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.35;
        }

        .sd-action-arrow {
          color: #cbd5e1;
          flex-shrink: 0;
        }

        /* Live Tracking Search Bar Strip */
        .sd-tracking-search-bar {
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          border-color: #dbeafe;
          background: #f0f6ff;
        }

        .sd-tracking-search-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .sd-tracking-search-icon {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-tracking-search-title {
          font-size: 0.925rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-tracking-search-desc {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }

        .sd-tracking-form {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sd-tracking-input {
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.825rem;
          color: #0f172a;
          outline: none;
          width: 230px;
          height: 38px;
          box-sizing: border-box;
        }

        .sd-tracking-input:focus {
          border-color: #2563eb;
        }

        .sd-tracking-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          height: 38px;
          padding: 0 1.15rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
          box-sizing: border-box;
          transition: background 0.15s;
        }

        .sd-tracking-btn:hover {
          background: #1d4ed8;
        }

        /* 4 Metrics Grid */
        .sd-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 1024px) {
          .sd-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 540px) {
          .sd-metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        .sd-metric-card {
          padding: 1.1rem 1.25rem;
        }

        .sd-metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .sd-metric-title {
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .sd-metric-icon {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sd-metric-icon.blue {
          background: #eff6ff;
        }

        .sd-metric-icon.amber {
          background: #fffbeb;
        }

        .sd-metric-icon.green {
          background: #f0fdf4;
        }

        .sd-metric-icon.red {
          background: #fef2f2;
        }

        .sd-metric-number {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.15;
          margin: 0.2rem 0;
        }

        .sd-metric-number.amber {
          color: #d97706;
        }

        .sd-metric-number.green {
          color: #16a34a;
        }

        .sd-metric-number.red {
          color: #dc2626;
        }

        .sd-metric-caption {
          font-size: 0.72rem;
          color: #64748b;
        }

        /* Active Shipment Spotlight Card */
        .sd-spotlight-card {
          padding: 1.5rem 1.75rem;
          border-color: #fed7aa;
          background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .sd-spotlight-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .sd-spotlight-badge-wrap {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .sd-spotlight-tag {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 3px 9px;
          border-radius: 9999px;
          background: #fef3c7;
          color: #b45309;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .sd-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d97706;
          animation: pulse 1.5s infinite;
        }

        .sd-spotlight-code {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-spotlight-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .sd-spotlight-btn {
          font-size: 0.8rem;
          padding: 0.45rem 0.85rem;
          border-radius: 7px;
          text-decoration: none;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: background 0.15s;
        }

        .sd-spotlight-btn.primary {
          background: #2563eb;
          color: #ffffff;
        }

        .sd-spotlight-btn.primary:hover {
          background: #1d4ed8;
        }

        .sd-spotlight-btn.secondary {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
        }

        .sd-spotlight-btn.secondary:hover {
          background: #f8fafc;
        }

        .sd-spotlight-route-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          background: #ffffff;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          border: 1px solid #fed7aa;
        }

        @media (max-width: 680px) {
          .sd-spotlight-route-grid {
            grid-template-columns: 1fr;
          }
        }

        .sd-spotlight-loc {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sd-loc-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        .sd-loc-val {
          font-size: 0.85rem;
          font-weight: 600;
          color: #0f172a;
        }

        /* Status Badges */
        .sd-status-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          width: fit-content;
        }

        .sd-status-badge.active {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .sd-status-badge.delivered {
          background: #ecfdf5;
          color: #15803d;
        }

        /* Recent Deliveries Card */
        .sd-recent-deliveries-card {
          padding: 1.25rem 1.5rem;
        }

        .sd-recent-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .sd-recent-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .sd-recent-subtitle {
          font-size: 0.78rem;
          color: #64748b;
          margin: 2px 0 0 0;
        }

        .sd-view-all-btn {
          font-size: 0.8rem;
          font-weight: 600;
          color: #2563eb;
          text-decoration: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          background: #eff6ff;
          transition: background 0.15s;
        }

        .sd-view-all-btn:hover {
          background: #dbeafe;
        }

        /* Orders List */
        .sd-orders-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sd-order-item {
          padding: 0.95rem 1.15rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
          transition: border-color 0.15s, background 0.15s;
        }

        .sd-order-item:hover {
          border-color: #cbd5e1;
          background: #ffffff;
        }

        .sd-order-item-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .sd-order-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-order-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sd-order-code {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-order-route {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }

        .sd-order-item-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .sd-order-fee {
          text-align: right;
        }

        .sd-fee-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e40af;
        }

        .sd-fee-desc {
          font-size: 0.68rem;
          color: #94a3b8;
        }

        .sd-order-actions-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .sd-action-chip {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          text-decoration: none;
          transition: all 0.15s;
        }

        .sd-action-chip:hover {
          background: #eff6ff;
          color: #2563eb;
          border-color: #93c5fd;
        }

        /* Empty State Matching Reference Screenshot */
        .sd-empty-state {
          padding: 2.5rem 1rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sd-empty-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
        }

        .sd-empty-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.25rem 0;
        }

        .sd-empty-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          max-width: 420px;
          margin: 0 0 1.15rem 0;
          line-height: 1.4;
        }

        .sd-empty-cta {
          background: #2563eb;
          color: #ffffff;
          text-decoration: none;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
          transition: background 0.15s;
        }

        .sd-empty-cta:hover {
          background: #1d4ed8;
        }

        /* Floating Carousel Next Arrow matching Screenshot */
        .sd-floating-next-arrow {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(148, 163, 184, 0.65);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
        }

        @media (max-width: 1300px) {
          .sd-floating-next-arrow {
            display: none;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  );
}