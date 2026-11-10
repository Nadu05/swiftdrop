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
  ExternalLink,
  Compass,
  Building,
  HelpCircle,
  Bell,
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
 * Implements the exact visual design reference from the SwiftDrop Customer App specification:
 * - Brand header ("SwiftDrop" / "My deliveries")
 * - Filter tabs capsule: [ ACTIVE ] [ HISTORY ] [ ADDRESSES ]
 * - Active Delivery Card (with real backend status, courier assignment, branch, and live tracking)
 * - Recent Deliveries Card (with real past records)
 * - Account section (Profile, Addresses, Notifications, Help centre, Report an issue)
 * - Fully responsive: Mobile-first stacked layout + expansive desktop grid
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
        err.message || 'We couldn\'t load your deliveries. Please check your connection and try again.'
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

  // Recent deliveries list: prioritize history orders, fallback to any earlier orders
  const recentDeliveries = (historyDeliveries.length > 0 ? historyDeliveries : orders)
    .filter((o) => o.id !== primaryActiveOrder?.id)
    .slice(0, 4);

  // Format date helper: e.g. "21 Oct" or "21 Oct 2026"
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
        return 'Booking confirmed · Awaiting pickup';
      case 'PICKED UP':
        return 'Courier collected parcel · In transit to hub';
      case 'IN TRANSIT':
        return 'Pickup complete · En route';
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
    <div className="sd-app-container">
      {/* ---------------- TOP HEADER / BRAND ---------------- */}
      <header className="sd-header">
        <div className="sd-brand-row">
          <div className="sd-brand-text">SwiftDrop</div>
          {profile?.name && (
            <Link href="/customer/profile" className="sd-profile-pill" title="View Profile">
              <User size={14} />
              <span>{profile.name}</span>
            </Link>
          )}
        </div>
        <h1 className="sd-title">My deliveries</h1>
        <div className="sd-divider" />
      </header>

      {/* ---------------- SECTION TITLE & NAVIGATION TABS ---------------- */}
      <section className="sd-section">
        <div className="sd-section-header">
          <h2 className="sd-section-title">My deliveries</h2>
          <button
            type="button"
            onClick={loadDeliveries}
            className="sd-refresh-btn"
            title="Refresh Deliveries"
            aria-label="Refresh deliveries"
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Capsule Navigation Tabs: [ ACTIVE ] [ HISTORY ] [ ADDRESSES ] */}
        <div className="sd-tabs-capsule" role="tablist" aria-label="Deliveries filter">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ACTIVE'}
            onClick={() => setActiveTab('ACTIVE')}
            className={`sd-tab ${activeTab === 'ACTIVE' ? 'active' : ''}`}
          >
            ACTIVE
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'HISTORY'}
            onClick={() => setActiveTab('HISTORY')}
            className={`sd-tab ${activeTab === 'HISTORY' ? 'active' : ''}`}
          >
            HISTORY
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
      </section>

      {/* ---------------- LOADING STATE ---------------- */}
      {isLoading && (
        <div className="sd-card sd-loading-card">
          <Loader2 size={32} color="#2563eb" className="animate-spin" />
          <div className="sd-loading-text">Loading your deliveries...</div>
          <p className="sd-loading-subtext">Fetching live records from SwiftDrop Order Service</p>
        </div>
      )}

      {/* ---------------- ERROR STATE ---------------- */}
      {!isLoading && error && (
        <div className="sd-card sd-error-card">
          <div className="sd-error-icon">
            <AlertCircle size={24} color="#dc2626" />
          </div>
          <div className="sd-error-title">We couldn't load your deliveries</div>
          <div className="sd-error-msg">{error}</div>
          <button type="button" onClick={loadDeliveries} className="sd-retry-btn">
            Try again
          </button>
        </div>
      )}

      {/* ---------------- CONTENT BY ACTIVE TAB ---------------- */}
      {!isLoading && !error && (
        <>
          {/* ==============================================================
              TAB 1: ACTIVE DELIVERIES
              Visual match to the reference screenshot
             ============================================================== */}
          {activeTab === 'ACTIVE' && (
            <div className="sd-active-layout">
              {/* PRIMARY ACTIVE DELIVERY CARD */}
              <div className="sd-card sd-active-card">
                {primaryActiveOrder ? (
                  <>
                    {/* Header: Tracking number · Status */}
                    <div className="sd-active-header">
                      <div className="sd-tracking-title">
                        <span className="sd-code">{primaryActiveOrder.trackingNumber}</span>
                        <span className="sd-dot">·</span>
                        <span className="sd-status-label">Active</span>
                      </div>
                    </div>

                    {/* Location / Branch */}
                    <div className="sd-branch-label">
                      {getBranchLocation(primaryActiveOrder)}
                    </div>

                    {/* Courier Assignment Badge */}
                    <div className="sd-badge-row">
                      {primaryActiveOrder.status !== 'Created' ? (
                        <span className="sd-badge-courier">COURIER ASSIGNED</span>
                      ) : (
                        <span className="sd-badge-pending">DISPATCH IN PROGRESS</span>
                      )}
                    </div>

                    {/* Courier Information (authoritative or appropriate state) */}
                    <div className="sd-courier-block">
                      <div className="sd-courier-name">
                        {primaryActiveOrder.courierName ||
                          (primaryActiveOrder.status !== 'Created'
                            ? 'Courier Assigned'
                            : 'Courier not assigned yet')}
                      </div>
                      <div className="sd-courier-vehicle">
                        {primaryActiveOrder.courierVehicle ||
                          (primaryActiveOrder.status !== 'Created'
                            ? 'Motorbike · Fleet Dispatch'
                            : 'Awaiting courier assignment')}
                      </div>
                    </div>

                    {/* Status Milestone Summary */}
                    <div className="sd-milestone-text">
                      {getMilestoneSummary(primaryActiveOrder.status)}
                    </div>

                    {/* Action Button: Track live delivery */}
                    <Link
                      href={`/tracking?number=${encodeURIComponent(primaryActiveOrder.trackingNumber)}`}
                      className="sd-track-button"
                    >
                      Track live delivery
                    </Link>
                  </>
                ) : (
                  /* Empty state for Active tab */
                  <div className="sd-empty-active">
                    <div className="sd-empty-icon">
                      <Package size={28} color="#94a3b8" />
                    </div>
                    <div className="sd-empty-title">No active deliveries</div>
                    <p className="sd-empty-desc">
                      You don't have any active deliveries right now. Book a courier today for secure, fast parcel delivery.
                    </p>
                    <Link href="/book" className="sd-track-button" style={{ display: 'inline-block' }}>
                      Create a delivery
                    </Link>
                  </div>
                )}
              </div>

              {/* RECENT DELIVERIES CARD */}
              <div className="sd-card sd-recent-card">
                <h3 className="sd-card-heading">Recent deliveries</h3>
                {recentDeliveries.length > 0 ? (
                  <div className="sd-recent-list">
                    {recentDeliveries.map((item) => (
                      <Link
                        key={item.id}
                        href={`/bookings/${item.id}`}
                        className="sd-recent-item"
                      >
                        <span className="sd-recent-code">{item.trackingNumber}</span>
                        <span className="sd-dot">·</span>
                        <span className="sd-recent-status">{item.status}</span>
                        {item.createdAt && (
                          <>
                            <span className="sd-dot">·</span>
                            <span className="sd-recent-date">{formatShortDate(item.createdAt)}</span>
                          </>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="sd-recent-empty">No recent deliveries recorded yet.</div>
                )}
              </div>

              {/* ACCOUNT CARD */}
              <div className="sd-card sd-account-card">
                <h3 className="sd-card-heading">Account</h3>
                <div className="sd-account-rows">
                  <div className="sd-account-row">
                    <Link href="/customer/profile" className="sd-account-link">
                      Profile
                    </Link>
                    <span className="sd-dot">·</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ADDRESSES')}
                      className="sd-account-link-btn"
                    >
                      Addresses
                    </button>
                    <span className="sd-dot">·</span>
                    <Link href="/customer/profile" className="sd-account-link">
                      Notifications
                    </Link>
                  </div>

                  <div className="sd-account-row" style={{ marginTop: '0.65rem' }}>
                    <Link href="/health" className="sd-account-link">
                      Help centre
                    </Link>
                    <span className="sd-dot">·</span>
                    <a href="mailto:support@swiftdrop.io" className="sd-account-link">
                      Report an issue
                    </a>
                  </div>
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
              <div className="sd-card sd-search-card">
                <Search size={16} color="#64748b" />
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
                    className="sd-search-clear"
                  >
                    Clear
                  </button>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="sd-card sd-empty-active">
                  <Package size={28} color="#94a3b8" />
                  <div className="sd-empty-title">No delivery history yet</div>
                  <p className="sd-empty-desc">
                    Your completed and past delivery bookings will appear here once placed.
                  </p>
                  <Link href="/book" className="sd-track-button" style={{ display: 'inline-block' }}>
                    Book a delivery
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
                      <Link
                        key={item.id}
                        href={`/bookings/${item.id}`}
                        className="sd-card sd-history-card"
                      >
                        <div className="sd-history-top">
                          <div className="sd-history-title">
                            <span className="sd-code">{item.trackingNumber}</span>
                            <span className="sd-dot">·</span>
                            <span className="sd-history-status">{item.status}</span>
                            {item.createdAt && (
                              <>
                                <span className="sd-dot">·</span>
                                <span className="sd-recent-date">{formatShortDate(item.createdAt)}</span>
                              </>
                            )}
                          </div>
                          <ChevronRight size={16} color="#94a3b8" />
                        </div>

                        <div className="sd-history-addresses">
                          <div className="sd-addr-item">
                            <span className="sd-addr-lbl">From:</span> {item.pickupAddress}
                          </div>
                          <div className="sd-addr-item">
                            <span className="sd-addr-lbl">To:</span> {item.dropoffAddress}
                          </div>
                        </div>

                        <div className="sd-history-footer">
                          <span>Fee: {item.currency || 'LKR'} {Number(item.deliveryFee || 0).toFixed(2)}</span>
                          <span className="sd-view-link">View details →</span>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 3: ADDRESSES
             ============================================================== */}
          {activeTab === 'ADDRESSES' && (
            <div className="sd-addresses-layout">
              {/* Primary Address */}
              <div className="sd-card">
                <h3 className="sd-card-heading">Saved Addresses</h3>
                {profile?.address ? (
                  <div className="sd-address-item">
                    <div className="sd-addr-header">
                      <span className="sd-badge-primary">Default Delivery Address</span>
                    </div>
                    <div className="sd-addr-body">{profile.address}</div>
                    <div className="sd-addr-recipient">
                      Associated with: <strong>{profile.name}</strong> ({profile.phone || 'No phone'})
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <Link href="/customer/profile" className="sd-link-action">
                        Edit in Profile →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="sd-empty-active" style={{ padding: '1.5rem 0' }}>
                    <MapPin size={24} color="#94a3b8" />
                    <div className="sd-empty-title">No saved default address</div>
                    <p className="sd-empty-desc">
                      Add your default home or office delivery address in your customer profile for faster booking.
                    </p>
                    <Link href="/customer/profile" className="sd-link-action">
                      Add Address in Profile →
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent delivery locations from orders */}
              {orders.length > 0 && (
                <div className="sd-card">
                  <h3 className="sd-card-heading">Recent Delivery Locations</h3>
                  <div className="sd-recent-addrs">
                    {Array.from(new Set(orders.map((o) => o.dropoffAddress).filter(Boolean)))
                      .slice(0, 5)
                      .map((addr, idx) => (
                        <div key={idx} className="sd-recent-addr-item">
                          <MapPin size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{addr}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ---------------- COMPONENT-SCOPED STYLING ---------------- */}
      <style jsx global>{`
        /* ==============================================================
           SWIFTDROP CUSTOMER APP THEME
           Direct 1:1 match to the reference mobile design with responsive web expansion
           ============================================================== */
        .sd-app-container {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 0 0.5rem;
          font-family: inherit;
        }

        /* Top Brand Header */
        .sd-header {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .sd-brand-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sd-brand-text {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .sd-profile-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.06);
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          text-decoration: none;
          transition: background 0.15s;
        }

        .sd-profile-pill:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .sd-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .sd-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin-top: 0.75rem;
        }

        /* Section Header & Tabs */
        .sd-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sd-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sd-section-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .sd-refresh-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .sd-refresh-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
        }

        /* Capsule Tabs Container */
        .sd-tabs-capsule {
          display: inline-flex;
          background: #ffffff;
          border-radius: 9999px;
          padding: 3px;
          width: fit-content;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .sd-tab {
          border: none;
          background: transparent;
          padding: 6px 16px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sd-tab.active {
          background: #e0e7ff;
          color: #1e3a8a;
        }

        .sd-tab:focus-visible {
          outline: 2px solid #2563eb;
        }

        /* Standard Reference Card */
        .sd-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 1.5rem;
          color: #0f172a;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .sd-card-heading {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 1rem 0;
          letter-spacing: -0.01em;
        }

        /* Active Card Specifics */
        .sd-active-card {
          gap: 0.6rem;
        }

        .sd-active-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sd-tracking-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sd-code {
          font-family: inherit;
          font-weight: 800;
        }

        .sd-dot {
          color: #64748b;
          font-weight: 600;
        }

        .sd-status-label {
          color: #0f172a;
        }

        .sd-branch-label {
          font-size: 0.85rem;
          color: #475569;
          margin-top: -0.25rem;
        }

        .sd-badge-row {
          margin: 0.25rem 0 0.4rem 0;
        }

        .sd-badge-courier {
          display: inline-block;
          background: #dcfce7;
          color: #15803d;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .sd-badge-pending {
          display: inline-block;
          background: #fef3c7;
          color: #b45309;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .sd-badge-primary {
          display: inline-block;
          background: #e0e7ff;
          color: #1e3a8a;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 9999px;
        }

        .sd-courier-block {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          margin: 0.25rem 0;
        }

        .sd-courier-name {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sd-courier-vehicle {
          font-size: 0.825rem;
          color: #475569;
        }

        .sd-milestone-text {
          font-size: 0.85rem;
          color: #334155;
          margin: 0.35rem 0 0.5rem 0;
        }

        /* Full-width Blue Action Button from Screenshot */
        .sd-track-button {
          background: #2563eb;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          text-align: center;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.15s ease;
          display: block;
          width: 100%;
          border: none;
          cursor: pointer;
        }

        .sd-track-button:hover {
          background: #1d4ed8;
        }

        /* Recent Deliveries List */
        .sd-recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sd-recent-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.875rem;
          color: #0f172a;
          text-decoration: none;
          padding: 0.25rem 0;
          transition: color 0.15s;
        }

        .sd-recent-item:hover {
          color: #2563eb;
        }

        .sd-recent-code {
          font-weight: 700;
        }

        .sd-recent-status {
          color: #334155;
        }

        .sd-recent-date {
          color: #64748b;
        }

        .sd-recent-empty {
          font-size: 0.85rem;
          color: #64748b;
        }

        /* Account Card */
        .sd-account-card {
          gap: 0.5rem;
        }

        .sd-account-rows {
          display: flex;
          flex-direction: column;
        }

        .sd-account-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          flex-wrap: wrap;
        }

        .sd-account-link {
          color: #0f172a;
          text-decoration: none;
          transition: color 0.15s;
        }

        .sd-account-link:hover {
          color: #2563eb;
          text-decoration: underline;
        }

        .sd-account-link-btn {
          background: transparent;
          border: none;
          color: #0f172a;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
        }

        .sd-account-link-btn:hover {
          color: #2563eb;
          text-decoration: underline;
        }

        /* History & Addresses Specifics */
        .sd-history-layout,
        .sd-addresses-layout {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sd-search-card {
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.875rem;
          color: #0f172a;
          background: transparent;
        }

        .sd-search-clear {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .sd-history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sd-history-card {
          text-decoration: none;
          gap: 0.6rem;
          transition: border-color 0.15s;
        }

        .sd-history-card:hover {
          border-color: #2563eb;
        }

        .sd-history-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sd-history-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.95rem;
          color: #0f172a;
        }

        .sd-history-status {
          font-weight: 600;
        }

        .sd-history-addresses {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: 0.8rem;
          color: #475569;
        }

        .sd-addr-lbl {
          font-weight: 600;
          color: #64748b;
        }

        .sd-history-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #64748b;
          border-top: 1px solid #f1f5f9;
          padding-top: 0.5rem;
        }

        .sd-view-link {
          color: #2563eb;
          font-weight: 600;
        }

        .sd-address-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .sd-addr-body {
          font-size: 0.95rem;
          font-weight: 600;
          color: #0f172a;
        }

        .sd-addr-recipient {
          font-size: 0.8rem;
          color: #64748b;
        }

        .sd-link-action {
          color: #2563eb;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
        }

        .sd-link-action:hover {
          text-decoration: underline;
        }

        .sd-recent-addrs {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .sd-recent-addr-item {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          font-size: 0.85rem;
          color: #334155;
        }

        /* Loading & Error Cards */
        .sd-loading-card {
          align-items: center;
          text-align: center;
          padding: 3rem 1.5rem;
          gap: 0.75rem;
        }

        .sd-loading-text {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-loading-subtext {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }

        .sd-error-card {
          align-items: center;
          text-align: center;
          padding: 2.5rem 1.5rem;
          gap: 0.5rem;
          border-color: #fca5a5;
          background: #fef2f2;
        }

        .sd-error-title {
          font-size: 1rem;
          font-weight: 700;
          color: #991b1b;
        }

        .sd-error-msg {
          font-size: 0.85rem;
          color: #b91c1c;
          max-width: 400px;
        }

        .sd-retry-btn {
          margin-top: 0.5rem;
          background: #dc2626;
          color: #ffffff;
          border: none;
          padding: 0.5rem 1.25rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }

        .sd-empty-active {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.5rem;
          padding: 1.5rem 0.5rem;
        }

        .sd-empty-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-empty-desc {
          font-size: 0.85rem;
          color: #64748b;
          max-width: 380px;
          margin: 0 0 0.5rem 0;
        }

        /* ==============================================================
           RESPONSIVE LAYOUT ENGINE (Mobile vs Desktop)
           ============================================================== */
        /* Mobile Default (< 768px): Strictly follows reference screenshot */
        .sd-active-layout {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
        }

        /* Desktop Layout (>= 768px): Expands into a 2-column grid */
        @media (min-width: 768px) {
          .sd-app-container {
            padding: 0 1rem;
          }

          .sd-active-layout {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            grid-template-rows: auto auto;
            gap: 1.5rem;
          }

          .sd-active-card {
            grid-column: 1 / 2;
            grid-row: 1 / 2;
          }

          .sd-recent-card {
            grid-column: 2 / 3;
            grid-row: 1 / 2;
          }

          .sd-account-card {
            grid-column: 1 / 3;
            grid-row: 2 / 3;
          }
        }
      `}</style>
    </div>
  );
}
