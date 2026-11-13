'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Clock,
  Compass,
  User,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  ArrowRight,
  MapPin,
  Calendar,
  Box,
  ShieldCheck,
  Search,
  FileText,
  Mail,
  Phone,
  Sparkles,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import { getCurrentUserProfile } from '@/api/services/auth.api';
import type { DeliveryOrder } from '@/types/order.types';
import type { UserProfile, CustomerDeliveryStats } from '@/types/auth.types';

export default function CustomerDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quickTrackingInput, setQuickTrackingInput] = useState<string>('');

  // Fetch authenticated customer profile and orders concurrently
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [userProfile, customerOrders] = await Promise.all([
        getCurrentUserProfile(),
        getCustomerOrders().catch(() => [] as DeliveryOrder[]),
      ]);

      setProfile(userProfile);
      setOrders(Array.isArray(customerOrders) ? customerOrders : []);
    } catch (err: any) {
      setError(
        err.message || 'Unable to load customer dashboard data. Please check your backend connection.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Compute delivery statistics dynamically from real backend order records
  const stats: CustomerDeliveryStats = {
    total: orders.length,
    active: orders.filter((o) => {
      const s = (o.status || '').toUpperCase();
      return s === 'CREATED' || s === 'PICKED UP' || s === 'IN TRANSIT' || s === 'OUT FOR DELIVERY';
    }).length,
    delivered: orders.filter((o) => (o.status || '').toUpperCase() === 'DELIVERED').length,
    failed: orders.filter((o) => {
      const s = (o.status || '').toUpperCase();
      return s === 'FAILED' || s === 'CANCELLED';
    }).length,
  };

  // Find the most recent active order to spotlight
  const activeOrder = orders.find((o) => {
    const s = (o.status || '').toUpperCase();
    return s === 'CREATED' || s === 'PICKED UP' || s === 'IN TRANSIT' || s === 'OUT FOR DELIVERY';
  });

  // Recent 4 deliveries for the table/cards
  const recentOrders = orders.slice(0, 4);

  // User initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'CU';
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
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div className="sd-header-icon-box">
              <LayoutDashboard size={22} color="#38bdf8" />
            </div>
            <div>
              <h1 className="sd-header-title">Customer dashboard</h1>
              <div className="sd-header-sub">
                Welcome back, {profile?.name || 'Customer'} · Central Parcel &amp; Booking Hub
              </div>
            </div>
          </div>

          <div className="sd-header-actions">
            <button
              type="button"
              onClick={loadDashboardData}
              disabled={isLoading}
              className="sd-header-refresh-btn"
              title="Refresh latest data from Order Service"
            >
              <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link href="/book" className="sd-header-book-btn">
              <PlusCircle size={15} />
              <span>New Delivery</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN BODY CANVAS (100% LIGHT THEME, ZERO BLUE MARGINS) ---------------- */}
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
              {/* CUSTOMER HERO CARD */}
              <div className="sd-card sd-hero-card">
                <div className="sd-hero-left">
                  <div className="sd-avatar-circle">
                    {getInitials(profile?.name)}
                  </div>
                  <div>
                    <div className="sd-badge-row">
                      <span className="sd-badge-verified">VERIFIED CUSTOMER</span>
                      <span className="sd-badge-role">ROLE: CUSTOMER</span>
                    </div>
                    <h2 className="sd-hero-name">Welcome back, {profile?.name || 'Customer'}</h2>
                    <div className="sd-hero-meta">
                      <Mail size={13} color="#64748b" />
                      <span>{profile?.email || 'customer@swiftdrop.lk'}</span>
                      <span className="sd-dot">·</span>
                      <MapPin size={13} color="#64748b" />
                      <span>{profile?.address || 'Colombo, Sri Lanka'}</span>
                    </div>
                  </div>
                </div>

                <div className="sd-hero-stats-pill">
                  <div className="sd-pill-stat">
                    <span className="sd-pill-label">Total Orders</span>
                    <span className="sd-pill-value">{stats.total}</span>
                  </div>
                  <div className="sd-pill-divider"></div>
                  <div className="sd-pill-stat">
                    <span className="sd-pill-label">In Transit</span>
                    <span className="sd-pill-value active">{stats.active}</span>
                  </div>
                  <div className="sd-pill-divider"></div>
                  <div className="sd-pill-stat">
                    <span className="sd-pill-label">Delivered</span>
                    <span className="sd-pill-value success">{stats.delivered}</span>
                  </div>
                </div>
              </div>

              {/* QUICK ACTION HUBS (4-CARD GRID) */}
              <div className="sd-action-grid">
                <Link href="/book" className="sd-card sd-action-card booking">
                  <div className="sd-action-icon-wrap blue">
                    <PlusCircle size={22} color="#2563eb" />
                  </div>
                  <div className="sd-action-text">
                    <div className="sd-action-title">Create Delivery</div>
                    <div className="sd-action-sub">Calculate fee, select branch &amp; dispatch parcel</div>
                  </div>
                  <ArrowRight size={16} className="sd-action-arrow" />
                </Link>

                <Link href="/bookings" className="sd-card sd-action-card deliveries">
                  <div className="sd-action-icon-wrap green">
                    <Package size={22} color="#16a34a" />
                  </div>
                  <div className="sd-action-text">
                    <div className="sd-action-title">My Deliveries</div>
                    <div className="sd-action-sub">View active bookings, history &amp; receipts</div>
                  </div>
                  <ArrowRight size={16} className="sd-action-arrow" />
                </Link>

                <Link href="/tracking" className="sd-card sd-action-card tracking">
                  <div className="sd-action-icon-wrap cyan">
                    <Compass size={22} color="#0891b2" />
                  </div>
                  <div className="sd-action-text">
                    <div className="sd-action-title">Track Parcel</div>
                    <div className="sd-action-sub">Live route map, courier info &amp; milestones</div>
                  </div>
                  <ArrowRight size={16} className="sd-action-arrow" />
                </Link>

                <Link href="/customer/profile" className="sd-card sd-action-card profile">
                  <div className="sd-action-icon-wrap purple">
                    <User size={22} color="#7c3aed" />
                  </div>
                  <div className="sd-action-text">
                    <div className="sd-action-title">My Profile</div>
                    <div className="sd-action-sub">Account settings, address &amp; preferences</div>
                  </div>
                  <ArrowRight size={16} className="sd-action-arrow" />
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
                    <div className="sd-tracking-search-desc">Instant courier location, dispatch milestones, and ETA</div>
                  </div>
                </div>

                <form onSubmit={handleQuickTrackSubmit} className="sd-tracking-form">
                  <input
                    type="text"
                    value={quickTrackingInput}
                    onChange={(e) => setQuickTrackingInput(e.target.value)}
                    placeholder="Enter tracking # (e.g. SD-10518)"
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
                      <Package size={17} color="#2563eb" />
                    </div>
                  </div>
                  <div className="sd-metric-number">{stats.total}</div>
                  <div className="sd-metric-caption">All recorded parcels</div>
                </div>

                <div className="sd-card sd-metric-card">
                  <div className="sd-metric-header">
                    <span className="sd-metric-title">ACTIVE SHIPMENTS</span>
                    <div className="sd-metric-icon amber">
                      <Truck size={17} color="#d97706" />
                    </div>
                  </div>
                  <div className="sd-metric-number amber">{stats.active}</div>
                  <div className="sd-metric-caption">In transit or pickup</div>
                </div>

                <div className="sd-card sd-metric-card">
                  <div className="sd-metric-header">
                    <span className="sd-metric-title">DELIVERED</span>
                    <div className="sd-metric-icon green">
                      <CheckCircle2 size={17} color="#16a34a" />
                    </div>
                  </div>
                  <div className="sd-metric-number green">{stats.delivered}</div>
                  <div className="sd-metric-caption">Handed over to recipient</div>
                </div>

                <div className="sd-card sd-metric-card">
                  <div className="sd-metric-header">
                    <span className="sd-metric-title">ACTION REQUIRED</span>
                    <div className="sd-metric-icon red">
                      <AlertCircle size={17} color="#dc2626" />
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
                      <span className="sd-status-badge active">{activeOrder.status || 'In Transit'}</span>
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
                  /* EMPTY STATE */
                  <div className="sd-empty-state">
                    <div className="sd-empty-icon-box">
                      <Box size={32} color="#2563eb" />
                    </div>
                    <h4 className="sd-empty-title">No deliveries recorded yet</h4>
                    <p className="sd-empty-subtitle">
                      You haven't requested any deliveries yet. Book your first courier shipment today!
                    </p>
                    <Link href="/book" className="sd-empty-cta">
                      <PlusCircle size={16} /> Create Your First Delivery
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
                                  {order.status || 'Created'}
                                </span>
                              </div>
                              <div className="sd-order-route">
                                {order.pickupAddress} <span style={{ color: '#94a3b8' }}>→</span> {order.dropoffAddress}
                              </div>
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
      </main>

      {/* ---------------- STYLES: MATCHES EXACT SWIFTDROP CUSTOMER APP LIGHT THEME ---------------- */}
      <style jsx global>{`
        /* Fullpage Root: Breaks out to touch sidebar directly with zero blue margins */
        .sd-fullpage-root {
          width: 100%;
          min-height: 100vh;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
          font-family: inherit;
        }

        /* Top Header Bar */
        .sd-fullpage-header {
          background: #0f1f38;
          color: #ffffff;
          padding: 1.5rem 2.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
        }

        .sd-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
          max-width: 1280px;
          margin: 0 auto;
        }

        .sd-header-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
          gap: 0.75rem;
        }

        .sd-header-refresh-btn {
          background: rgba(255, 255, 255, 0.08);
          color: #e2e8f0;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 0.55rem 0.95rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          transition: background 0.15s;
        }

        .sd-header-refresh-btn:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .sd-header-book-btn {
          background: #2563eb;
          color: #ffffff;
          padding: 0.55rem 1.1rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
          transition: background 0.15s;
        }

        .sd-header-book-btn:hover {
          background: #1d4ed8;
        }

        /* Main Body Canvas */
        .sd-fullpage-body {
          flex: 1;
          padding: 2rem 2.5rem 4rem 2.5rem;
          background: #f4f7fb;
          width: 100%;
        }

        .sd-content-wrapper {
          max-width: 1280px;
          margin: 0 auto;
        }

        /* Generic Clean White Card */
        .sd-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        /* Dashboard Layout */
        .sd-dashboard-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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

        /* Hero Card */
        .sd-hero-card {
          padding: 1.5rem 1.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.25rem;
        }

        .sd-hero-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .sd-avatar-circle {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #e0ecfe;
          color: #2563eb;
          font-weight: 800;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
          flex-shrink: 0;
        }

        .sd-badge-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .sd-badge-verified {
          background: #e8fbf0;
          color: #15803d;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 3px 9px;
          border-radius: 9999px;
        }

        .sd-badge-role {
          background: #e0ecfe;
          color: #1d4ed8;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 3px 9px;
          border-radius: 9999px;
        }

        .sd-hero-name {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0;
          line-height: 1.2;
        }

        .sd-hero-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
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
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem 1.25rem;
        }

        .sd-pill-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sd-pill-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        .sd-pill-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }

        .sd-pill-value.active {
          color: #d97706;
        }

        .sd-pill-value.success {
          color: #16a34a;
        }

        .sd-pill-divider {
          width: 1px;
          height: 28px;
          background: #e2e8f0;
        }

        /* 4-Card Quick Action Grid */
        .sd-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .sd-action-card {
          padding: 1.25rem 1.35rem;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          transition: all 0.2s ease;
        }

        .sd-action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.08);
          border-color: #cbd5e1;
        }

        .sd-action-icon-wrap {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-action-icon-wrap.blue {
          background: #eff6ff;
        }

        .sd-action-icon-wrap.green {
          background: #ecfdf5;
        }

        .sd-action-icon-wrap.cyan {
          background: #ecfeff;
        }

        .sd-action-icon-wrap.purple {
          background: #f5f3ff;
        }

        .sd-action-text {
          flex: 1;
        }

        .sd-action-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-action-sub {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.3;
        }

        .sd-action-arrow {
          color: #cbd5e1;
          transition: transform 0.15s ease, color 0.15s ease;
        }

        .sd-action-card:hover .sd-action-arrow {
          transform: translateX(3px);
          color: #2563eb;
        }

        /* Live Tracking Search Bar Strip */
        .sd-tracking-search-bar {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          border-color: #bfdbfe;
          background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
        }

        .sd-tracking-search-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .sd-tracking-search-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-tracking-search-title {
          font-size: 0.92rem;
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
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.85rem;
          color: #0f172a;
          outline: none;
          min-width: 230px;
        }

        .sd-tracking-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .sd-tracking-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 0.55rem 1rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
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

        @media (max-width: 900px) {
          .sd-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 520px) {
          .sd-metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        .sd-metric-card {
          padding: 1.25rem 1.35rem;
        }

        .sd-metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .sd-metric-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sd-metric-icon {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sd-metric-icon.blue {
          background: #eff6ff;
        }

        .sd-metric-icon.amber {
          background: #fef3c7;
        }

        .sd-metric-icon.green {
          background: #ecfdf5;
        }

        .sd-metric-icon.red {
          background: #fef2f2;
        }

        .sd-metric-number {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
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
          color: #94a3b8;
          margin-top: 4px;
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
          padding: 1.75rem;
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
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sd-recent-subtitle {
          font-size: 0.78rem;
          color: #64748b;
          margin: 3px 0 0 0;
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

        /* Empty State */
        .sd-empty-state {
          padding: 3rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-empty-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sd-empty-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .sd-empty-subtitle {
          font-size: 0.825rem;
          color: #64748b;
          max-width: 380px;
          margin: 0;
        }

        .sd-empty-cta {
          margin-top: 0.5rem;
          background: #2563eb;
          color: #ffffff;
          text-decoration: none;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          transition: background 0.15s;
        }

        .sd-empty-cta:hover {
          background: #1d4ed8;
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
