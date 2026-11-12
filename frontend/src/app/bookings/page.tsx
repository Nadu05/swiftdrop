'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  PlusCircle,
  RotateCcw,
  Search,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronRight,
  Truck,
  User,
  Phone,
  CheckCircle2,
  Compass,
  Building,
  HelpCircle,
  Bell,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import { getCurrentUserProfile } from '@/api/services/auth.api';
import type { DeliveryOrder, OrderStatus } from '@/types/order.types';
import type { UserProfile } from '@/types/auth.types';

type DeliveryTab = 'ACTIVE' | 'HISTORY' | 'ADDRESSES';

/**
 * Member 06: SwiftDrop Customer App — Tracking and History / My Deliveries
 * Route: /bookings
 *
 * Fully integrated with the unified SwiftDrop Customer Light Theme:
 * - #0f1f38 Navy top header with back button to Customer Dashboard
 * - #f4f7fb light canvas connecting seamlessly to Customer Navigation
 * - Clean white cards with #e2e8f0 borders and soft shadows
 * - Real backend data from Order Service
 * - Capsule tabs: [ ACTIVE ] [ HISTORY ] [ ADDRESSES ]
 */
export default function CustomerBookingsPage() {
  const [activeTab, setActiveTab] = useState<DeliveryTab>('ACTIVE');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState<string>('');

  // Fetch authenticated customer orders and profile concurrently
  const loadDeliveries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [orderData, userProfile] = await Promise.all([
        getCustomerOrders(),
        getCurrentUserProfile().catch(() => null),
      ]);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setProfile(userProfile);
    } catch (err: any) {
      setError(
        err.message || 'We could not load your deliveries. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  // Determine active deliveries vs completed/history
  const isActiveStatus = (status: OrderStatus) => {
    const s = (status || '').toUpperCase();
    return s === 'CREATED' || s === 'PICKED UP' || s === 'IN TRANSIT' || s === 'OUT FOR DELIVERY';
  };

  const activeDeliveries = orders.filter((o) => isActiveStatus(o.status));
  const primaryActiveOrder = activeDeliveries[0] || null;
  const historyDeliveries = orders.filter((o) => !isActiveStatus(o.status));

  // Recent deliveries list
  const recentDeliveries = (historyDeliveries.length > 0 ? historyDeliveries : orders)
    .filter((o) => o.id !== primaryActiveOrder?.id)
    .slice(0, 4);

  // Format date helper: e.g. "21 Oct"
  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Human-readable status milestone description
  const getMilestoneSummary = (status?: OrderStatus) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'CREATED':
        return 'Booking confirmed · Awaiting courier pickup';
      case 'PICKED UP':
        return 'Courier collected parcel · In transit to branch';
      case 'IN TRANSIT':
        return 'Pickup complete · Moving through network';
      case 'OUT FOR DELIVERY':
        return 'Out for delivery · Arriving today';
      case 'DELIVERED':
        return 'Delivered successfully';
      case 'FAILED':
      case 'CANCELLED':
        return 'Delivery unfulfilled · Refund processed';
      default:
        return 'Order in progress';
    }
  };

  // Branch / Origin location helper
  const getBranchLocation = (order: DeliveryOrder) => {
    if (order.branch) return order.branch;
    if (order.pickupAddress) {
      const parts = order.pickupAddress.split(',');
      return parts[0].trim() || 'Central Dispatch Hub';
    }
    return 'Colombo Central Branch';
  };

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/customer/dashboard" className="sd-back-btn" aria-label="Back to Customer Dashboard">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="sd-header-title">My deliveries</h1>
              <div className="sd-header-sub">
                Tracking, delivery history &amp; verified booking records
              </div>
            </div>
          </div>

          <div className="sd-header-actions">
            <button
              type="button"
              onClick={loadDeliveries}
              disabled={isLoading}
              className="sd-header-refresh-btn"
              title="Refresh deliveries"
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
          {/* TABS SECTION */}
          <div className="sd-tabs-section">
            <div className="sd-tabs-capsule" role="tablist" aria-label="Deliveries filter">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ACTIVE'}
                onClick={() => setActiveTab('ACTIVE')}
                className={`sd-tab ${activeTab === 'ACTIVE' ? 'active' : ''}`}
              >
                ACTIVE {activeDeliveries.length > 0 && `(${activeDeliveries.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'HISTORY'}
                onClick={() => setActiveTab('HISTORY')}
                className={`sd-tab ${activeTab === 'HISTORY' ? 'active' : ''}`}
              >
                HISTORY {orders.length > 0 && `(${orders.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ADDRESSES'}
                onClick={() => setActiveTab('ADDRESSES')}
                className={`sd-tab ${activeTab === 'ADDRESSES' ? 'active' : ''}`}
              >
                ADDRESSES
              </button>
            </div>
          </div>

          {/* LOADING STATE */}
          {isLoading && (
            <div className="sd-card sd-loading-state">
              <Loader2 size={36} color="#2563eb" className="animate-spin" />
              <div className="sd-loading-title">Loading your deliveries...</div>
              <p className="sd-loading-sub">Fetching live records from SwiftDrop Order Service</p>
            </div>
          )}

          {/* ERROR STATE */}
          {!isLoading && error && (
            <div className="sd-card sd-error-state">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertCircle size={28} color="#dc2626" />
                <div>
                  <div className="sd-error-title">We could not load your deliveries</div>
                  <div className="sd-error-sub">{error}</div>
                </div>
              </div>
              <button type="button" onClick={loadDeliveries} className="sd-btn-danger">
                Try again
              </button>
            </div>
          )}

          {/* ---------------- CONTENT BY ACTIVE TAB ---------------- */}
          {!isLoading && !error && (
            <div className="sd-tab-content-layout">
              {/* ==============================================================
                  TAB 1: ACTIVE DELIVERIES
                 ============================================================== */}
              {activeTab === 'ACTIVE' && (
                <div className="sd-active-grid">
                  {/* PRIMARY ACTIVE DELIVERY CARD */}
                  <div className="sd-card sd-primary-card">
                    {primaryActiveOrder ? (
                      <>
                        <div className="sd-card-top-row">
                          <div className="sd-code-wrap">
                            <span className="sd-order-code">{primaryActiveOrder.trackingNumber}</span>
                            <span className="sd-dot">·</span>
                            <span className="sd-status-pill active">Active</span>
                          </div>
                          <span className="sd-branch-tag">{getBranchLocation(primaryActiveOrder)}</span>
                        </div>

                        <div className="sd-courier-strip">
                          <div className="sd-courier-avatar">
                            <Truck size={18} color="#2563eb" />
                          </div>
                          <div>
                            <div className="sd-courier-name">
                              {primaryActiveOrder.courierName ||
                                (primaryActiveOrder.status !== 'Created'
                                  ? 'Verified Courier Assigned'
                                  : 'Dispatching Courier')}
                            </div>
                            <div className="sd-courier-vehicle">
                              {primaryActiveOrder.courierVehicle || 'Motorbike · Standard Fleet'}
                            </div>
                          </div>
                        </div>

                        <div className="sd-milestone-box">
                          <CheckCircle2 size={15} color="#16a34a" />
                          <span>{getMilestoneSummary(primaryActiveOrder.status)}</span>
                        </div>

                        <div className="sd-address-preview-grid">
                          <div>
                            <span className="sd-addr-lbl">Pickup:</span>
                            <div className="sd-addr-txt">{primaryActiveOrder.pickupAddress}</div>
                          </div>
                          <div>
                            <span className="sd-addr-lbl">Destination:</span>
                            <div className="sd-addr-txt">{primaryActiveOrder.dropoffAddress}</div>
                          </div>
                        </div>

                        <div className="sd-card-actions-row">
                          <Link
                            href={`/tracking?trackingNumber=${encodeURIComponent(primaryActiveOrder.trackingNumber)}`}
                            className="sd-btn-primary"
                          >
                            <Compass size={15} /> Track live delivery
                          </Link>
                          <Link
                            href={`/bookings/${primaryActiveOrder.id}`}
                            className="sd-btn-secondary"
                          >
                            Details &amp; Milestones
                          </Link>
                          <Link
                            href={`/bookings/${primaryActiveOrder.id}/receipt`}
                            className="sd-btn-secondary"
                          >
                            <FileText size={14} /> Receipt
                          </Link>
                        </div>
                      </>
                    ) : (
                      /* Empty state for Active tab */
                      <div className="sd-empty-state">
                        <div className="sd-empty-icon-wrap">
                          <Package size={32} color="#2563eb" />
                        </div>
                        <h3 className="sd-empty-title">No active deliveries</h3>
                        <p className="sd-empty-sub">
                          You don't have any active deliveries right now. Book a courier today for secure, fast parcel delivery.
                        </p>
                        <Link href="/book" className="sd-btn-primary">
                          <PlusCircle size={15} /> Create a delivery
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* RECENT DELIVERIES CARD */}
                  <div className="sd-card sd-recent-card">
                    <div className="sd-recent-header">
                      <h3 className="sd-card-heading">Recent deliveries</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('HISTORY')}
                        className="sd-link-sm"
                      >
                        All History →
                      </button>
                    </div>

                    {recentDeliveries.length > 0 ? (
                      <div className="sd-recent-list">
                        {recentDeliveries.map((item) => (
                          <Link
                            key={item.id}
                            href={`/bookings/${item.id}`}
                            className="sd-recent-row"
                          >
                            <div className="sd-recent-info">
                              <span className="sd-recent-code">{item.trackingNumber || `#${item.id}`}</span>
                              <span className="sd-dot">·</span>
                              <span className="sd-recent-status">{item.status}</span>
                              {item.createdAt && (
                                <>
                                  <span className="sd-dot">·</span>
                                  <span className="sd-recent-date">{formatShortDate(item.createdAt)}</span>
                                </>
                              )}
                            </div>
                            <ChevronRight size={15} color="#94a3b8" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="sd-empty-sub" style={{ padding: '1rem 0' }}>
                        No recent deliveries recorded yet.
                      </div>
                    )}
                  </div>

                  {/* ACCOUNT & SHORTCUTS CARD */}
                  <div className="sd-card sd-shortcuts-card">
                    <h3 className="sd-card-heading">Customer Account</h3>
                    <div className="sd-shortcuts-grid">
                      <Link href="/customer/profile" className="sd-shortcut-item">
                        <User size={16} color="#2563eb" />
                        <span>My Profile</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ADDRESSES')}
                        className="sd-shortcut-item btn-like"
                      >
                        <MapPin size={16} color="#16a34a" />
                        <span>Saved Addresses</span>
                      </button>
                      <Link href="/tracking" className="sd-shortcut-item">
                        <Compass size={16} color="#0891b2" />
                        <span>Live Tracking</span>
                      </Link>
                      <Link href="/customer/dashboard" className="sd-shortcut-item">
                        <CheckCircle2 size={16} color="#7c3aed" />
                        <span>Customer Dashboard</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* ==============================================================
                  TAB 2: FULL HISTORY
                 ============================================================== */}
              {activeTab === 'HISTORY' && (
                <div className="sd-history-layout">
                  {/* Search filter for history */}
                  <div className="sd-card sd-search-bar">
                    <Search size={17} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Filter history by tracking number, pickup, or destination..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="sd-search-input"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch('')}
                        className="sd-clear-btn"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {orders.length === 0 ? (
                    <div className="sd-card sd-empty-state">
                      <div className="sd-empty-icon-wrap">
                        <Package size={32} color="#2563eb" />
                      </div>
                      <h3 className="sd-empty-title">No delivery history yet</h3>
                      <p className="sd-empty-sub">
                        Your completed and past delivery bookings will appear here once placed.
                      </p>
                      <Link href="/book" className="sd-btn-primary">
                        <PlusCircle size={15} /> Book a delivery
                      </Link>
                    </div>
                  ) : (
                    <div className="sd-history-list">
                      {orders
                        .filter((o) => {
                          const q = historySearch.toLowerCase();
                          return (
                            !q ||
                            o.trackingNumber?.toLowerCase().includes(q) ||
                            o.pickupAddress?.toLowerCase().includes(q) ||
                            o.dropoffAddress?.toLowerCase().includes(q)
                          );
                        })
                        .map((item) => (
                          <div key={item.id} className="sd-card sd-history-item-card">
                            <div className="sd-history-item-top">
                              <div className="sd-history-title-wrap">
                                <span className="sd-order-code">{item.trackingNumber || `#${item.id}`}</span>
                                <span className="sd-dot">·</span>
                                <span className="sd-status-pill">{item.status}</span>
                                {item.createdAt && (
                                  <>
                                    <span className="sd-dot">·</span>
                                    <span className="sd-recent-date">{formatShortDate(item.createdAt)}</span>
                                  </>
                                )}
                              </div>
                              <div className="sd-history-fee">
                                {item.currency || 'LKR'} {Number(item.deliveryFee || 0).toFixed(2)}
                              </div>
                            </div>

                            <div className="sd-history-route">
                              <div className="sd-route-row">
                                <span className="sd-route-dot from"></span>
                                <span className="sd-route-txt">{item.pickupAddress}</span>
                              </div>
                              <div className="sd-route-row">
                                <span className="sd-route-dot to"></span>
                                <span className="sd-route-txt">{item.dropoffAddress}</span>
                              </div>
                            </div>

                            <div className="sd-history-actions">
                              <Link
                                href={`/tracking?trackingNumber=${encodeURIComponent(item.trackingNumber || '')}`}
                                className="sd-chip-btn"
                              >
                                Track on Map
                              </Link>
                              <Link
                                href={`/bookings/${item.id}`}
                                className="sd-chip-btn"
                              >
                                Milestones &amp; Details
                              </Link>
                              <Link
                                href={`/bookings/${item.id}/receipt`}
                                className="sd-chip-btn"
                              >
                                View Receipt
                              </Link>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==============================================================
                  TAB 3: ADDRESSES & SAVED LOCATIONS
                 ============================================================== */}
              {activeTab === 'ADDRESSES' && (
                <div className="sd-addresses-layout">
                  <div className="sd-card sd-address-card">
                    <div className="sd-address-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <MapPin size={18} color="#2563eb" />
                        <h3 className="sd-card-heading" style={{ margin: 0 }}>Default Delivery Address</h3>
                      </div>
                      <Link href="/customer/profile" className="sd-link-sm">
                        Edit in Profile →
                      </Link>
                    </div>

                    <div className="sd-address-content">
                      <div className="sd-addr-name">{profile?.name || 'Customer'}</div>
                      <div className="sd-addr-full">
                        {profile?.address || 'No default address saved yet. Update your address in your Profile.'}
                      </div>
                      <div className="sd-addr-contact">
                        <Phone size={13} color="#64748b" />
                        <span>{profile?.phone || '+94 77 123 4567'}</span>
                      </div>
                    </div>
                  </div>

                  {orders.length > 0 && (
                    <div className="sd-card sd-locations-card">
                      <h3 className="sd-card-heading">Recent Delivery Locations</h3>
                      <div className="sd-locations-list">
                        {Array.from(new Set(orders.map((o) => o.dropoffAddress).filter(Boolean)))
                          .slice(0, 5)
                          .map((addr, idx) => (
                            <div key={idx} className="sd-location-item">
                              <MapPin size={15} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>{addr}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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

        .sd-back-btn {
          background: transparent;
          border: none;
          color: #ffffff;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: opacity 0.15s;
        }

        .sd-back-btn:hover {
          opacity: 0.8;
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

        /* Tabs Section */
        .sd-tabs-section {
          margin-bottom: 1.5rem;
        }

        .sd-tabs-capsule {
          display: inline-flex;
          align-items: center;
          background: #e2e8f0;
          padding: 4px;
          border-radius: 12px;
          gap: 2px;
        }

        .sd-tab {
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sd-tab.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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

        /* Tab Content Layouts */
        .sd-active-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Primary Active Card */
        .sd-primary-card {
          padding: 1.75rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .sd-card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .sd-code-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sd-order-code {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sd-dot {
          color: #cbd5e1;
        }

        .sd-status-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          background: #f1f5f9;
          color: #475569;
        }

        .sd-status-pill.active {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .sd-branch-tag {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
        }

        .sd-courier-strip {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem 1rem;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .sd-courier-avatar {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #e0ecfe;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-courier-name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-courier-vehicle {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 1px;
        }

        .sd-milestone-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #15803d;
          background: #f0fdf4;
          padding: 0.65rem 0.95rem;
          border-radius: 8px;
          border: 1px solid #bbf7d0;
        }

        .sd-address-preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          padding-top: 0.25rem;
        }

        @media (max-width: 600px) {
          .sd-address-preview-grid {
            grid-template-columns: 1fr;
          }
        }

        .sd-addr-lbl {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .sd-addr-txt {
          font-size: 0.85rem;
          color: #0f172a;
          font-weight: 500;
        }

        .sd-card-actions-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding-top: 0.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .sd-btn-primary {
          background: #2563eb;
          color: #ffffff;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          transition: background 0.15s;
        }

        .sd-btn-primary:hover {
          background: #1d4ed8;
        }

        .sd-btn-secondary {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 0.6rem 1.1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: background 0.15s;
        }

        .sd-btn-secondary:hover {
          background: #f8fafc;
        }

        /* Recent Card */
        .sd-recent-card {
          padding: 1.5rem 1.75rem;
        }

        .sd-recent-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .sd-card-heading {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .sd-link-sm {
          font-size: 0.78rem;
          font-weight: 600;
          color: #2563eb;
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .sd-recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sd-recent-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0.95rem;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
        }

        .sd-recent-row:hover {
          background: #ffffff;
          border-color: #cbd5e1;
        }

        .sd-recent-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
        }

        .sd-recent-code {
          font-weight: 700;
          color: #0f172a;
        }

        .sd-recent-status {
          color: #64748b;
        }

        .sd-recent-date {
          color: #94a3b8;
          font-size: 0.78rem;
        }

        /* Shortcuts Card */
        .sd-shortcuts-card {
          padding: 1.5rem 1.75rem;
        }

        .sd-shortcuts-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-top: 1rem;
        }

        @media (max-width: 768px) {
          .sd-shortcuts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .sd-shortcut-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 0.9rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          text-decoration: none;
          color: #0f172a;
          font-size: 0.825rem;
          font-weight: 600;
          transition: all 0.15s;
        }

        .sd-shortcut-item.btn-like {
          cursor: pointer;
          font-family: inherit;
        }

        .sd-shortcut-item:hover {
          background: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
        }

        /* History Layout */
        .sd-history-layout {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .sd-search-bar {
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.88rem;
          color: #0f172a;
          background: transparent;
        }

        .sd-clear-btn {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .sd-history-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .sd-history-item-card {
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .sd-history-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .sd-history-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sd-history-fee {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1e40af;
        }

        .sd-history-route {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 0.65rem 0.85rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }

        .sd-route-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.825rem;
          color: #334155;
        }

        .sd-route-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .sd-route-dot.from {
          background: #2563eb;
        }

        .sd-route-dot.to {
          background: #16a34a;
        }

        .sd-history-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding-top: 0.35rem;
        }

        .sd-chip-btn {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          text-decoration: none;
          transition: all 0.15s;
        }

        .sd-chip-btn:hover {
          background: #eff6ff;
          color: #2563eb;
          border-color: #93c5fd;
        }

        /* Addresses Layout */
        .sd-addresses-layout {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .sd-address-card {
          padding: 1.5rem 1.75rem;
        }

        .sd-address-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .sd-address-content {
          padding: 1.15rem 1.35rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .sd-addr-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-addr-full {
          font-size: 0.85rem;
          color: #334155;
        }

        .sd-addr-contact {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        .sd-locations-card {
          padding: 1.5rem 1.75rem;
        }

        .sd-locations-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .sd-location-item {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.75rem 0.95rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
          font-size: 0.825rem;
          color: #334155;
        }

        /* Empty State */
        .sd-empty-state {
          padding: 3.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-empty-icon-wrap {
          width: 58px;
          height: 58px;
          border-radius: 14px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sd-empty-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .sd-empty-sub {
          font-size: 0.825rem;
          color: #64748b;
          max-width: 420px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
