'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Loader2,
  MapPin,
  Package,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import StatsCard from '@/components/dispatcher/overview/StatsCard';
import { useAuthStore } from '@/store/auth.store';
import { getCustomerOrders } from '@/api/services/orders.api';
import { fetchMyMerchantApplications } from '@/api/services/organization.api';
import type { OrderResponse } from '@/types/order.types';
import type { MerchantApplicationResponse } from '@/types/organization.types';

const ACTIVE_ORDER_STATUSES = [
  'BOOKED',
  'CREATED',
  'CONFIRMED',
  'PENDING_ASSIGNMENT',
  'PICKUP_ASSIGNED',
  'COURIER_ASSIGNED',
  'PICKED_UP',
  'AT_ORIGIN_BRANCH',
  'AT_ORIGIN_HUB',
  'IN_TRANSIT',
  'AT_DESTINATION_BRANCH',
  'AT_DESTINATION_HUB',
  'OUT_FOR_DELIVERY',
];

const EXCEPTION_ORDER_STATUSES = [
  'FAILED',
  'DELIVERY_FAILED',
  'CANCELLED',
  'RETURN_TO_SENDER',
  'RETURNED_TO_SENDER',
];

function getStatusBadgeModifier(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'DELIVERED') {
    return 'merchant-status-badge--delivered';
  }
  if (EXCEPTION_ORDER_STATUSES.includes(s)) {
    return 'merchant-status-badge--exception';
  }
  if (['CREATED', 'CONFIRMED', 'BOOKED', 'PENDING_ASSIGNMENT'].includes(s)) {
    return 'merchant-status-badge--created';
  }
  return 'merchant-status-badge--active';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function MerchantDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    []
  );

  // 1. Check merchant onboarding application status from Organization Service
  const {
    data: applications = [],
    isLoading: appsLoading,
    isFetching: appsFetching,
    isError: appsError,
    refetch: refetchApps,
  } = useQuery<MerchantApplicationResponse[]>({
    queryKey: ['merchant', 'applications', 'my', user?.userId],
    queryFn: () => fetchMyMerchantApplications(),
    enabled: !!user?.userId,
    retry: false,
  });

  // 2. Fetch merchant's shipment orders from Order Service
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    isError: ordersError,
    error: ordersErrorObj,
    refetch: refetchOrders,
  } = useQuery<OrderResponse[]>({
    queryKey: ['merchant', 'orders', user?.userId],
    queryFn: () => getCustomerOrders(),
    enabled: !!user?.userId,
    retry: false,
  });

  const isRefreshing = appsFetching || ordersFetching;

  const approvedApp = applications.find((a) => a.status === 'APPROVED') || null;
  const latestApp = approvedApp || applications[0] || null;
  const isPendingApproval =
    latestApp &&
    (latestApp.status === 'PENDING' || latestApp.status === 'MORE_INFORMATION_REQUIRED') &&
    !approvedApp;
  const isRejectedApproval =
    latestApp &&
    (latestApp.status === 'REJECTED' ||
      latestApp.status === 'SUSPENDED' ||
      latestApp.status === 'TERMINATED') &&
    !approvedApp;

  // Compute shipment metrics from real Order Service data
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const pendingDeliveries = orders.filter((o) =>
      ACTIVE_ORDER_STATUSES.includes((o.status || '').toUpperCase())
    ).length;
    const completedDeliveries = orders.filter(
      (o) => (o.status || '').toUpperCase() === 'DELIVERED'
    ).length;
    const failedOrCancelled = orders.filter((o) =>
      EXCEPTION_ORDER_STATUSES.includes((o.status || '').toUpperCase())
    ).length;

    return {
      totalOrders,
      pendingDeliveries,
      completedDeliveries,
      failedOrCancelled,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const normalizedStatus = (order.status || '').toUpperCase();
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && ACTIVE_ORDER_STATUSES.includes(normalizedStatus)) ||
        (statusFilter === 'COMPLETED' && normalizedStatus === 'DELIVERED') ||
        normalizedStatus === statusFilter;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesStatus;
      return (
        matchesStatus &&
        (order.trackingNumber?.toLowerCase().includes(q) ||
          order.dropoffContactName?.toLowerCase().includes(q) ||
          order.dropoffCity?.toLowerCase().includes(q) ||
          order.parcelDescription?.toLowerCase().includes(q))
      );
    });
  }, [orders, statusFilter, searchQuery]);

  // Approval-gated onboarding status view for unapproved / pending / rejected / suspended merchants
  if (!appsLoading && (isPendingApproval || isRejectedApproval)) {
    const isWarningState = Boolean(isPendingApproval);
    return (
      <div className="merchant-dashboard merchant-dashboard--narrow">
        <header className="merchant-page-header">
          <div className="merchant-page-header__title-group">
            <h1 className="merchant-page-header__title">Merchant Onboarding Status</h1>
            <p className="merchant-page-header__subtitle">
              Track your business verification and Head Office approval progress.
            </p>
          </div>
          <div className="merchant-page-header__actions">
            <button
              type="button"
              onClick={() => refetchApps()}
              disabled={appsFetching}
              className="merchant-secondary-btn"
            >
              <RefreshCw
                size={16}
                className={appsFetching ? 'dispatcher-overview__refresh-icon--spinning' : undefined}
                aria-hidden="true"
              />
              <span>{appsFetching ? 'Checking…' : 'Refresh Status'}</span>
            </button>
          </div>
        </header>

        <section
          className={`merchant-surface-card merchant-onboarding-card ${
            isWarningState
              ? 'merchant-onboarding-card--warning'
              : 'merchant-onboarding-card--danger'
          }`}
        >
          <div className="merchant-onboarding-card__layout">
            <div
              className={`merchant-onboarding-card__icon ${
                isWarningState
                  ? 'merchant-onboarding-card__icon--warning'
                  : 'merchant-onboarding-card__icon--danger'
              }`}
            >
              {isWarningState ? <Clock size={24} /> : <ShieldAlert size={24} />}
            </div>

            <div className="merchant-onboarding-card__body">
              <div className="merchant-onboarding-card__top">
                <span className="merchant-onboarding-card__eyebrow">Application Review</span>
                <span
                  className={`merchant-status-badge ${
                    isWarningState
                      ? 'merchant-status-badge--active'
                      : 'merchant-status-badge--exception'
                  }`}
                >
                  {latestApp.statusLabel || latestApp.status.replace(/_/g, ' ')}
                </span>
              </div>

              <h2 className="merchant-onboarding-card__title">
                {latestApp.status === 'MORE_INFORMATION_REQUIRED'
                  ? 'Additional Information Requested'
                  : isWarningState
                    ? 'Your Merchant Application is Under Review'
                    : latestApp.status === 'SUSPENDED'
                      ? 'Merchant Account Suspended'
                      : 'Merchant Application Requires Attention'}
              </h2>

              <p className="merchant-onboarding-card__desc">
                {latestApp.status === 'MORE_INFORMATION_REQUIRED'
                  ? latestApp.infoRequestMessage ||
                    'Head Office Administration requested additional details before approving your application.'
                  : isWarningState
                    ? 'Head Office Administration is currently verifying your business registration and operating branch details. Full merchant shipment dispatch and API access will unlock automatically once approved.'
                    : `Your merchant application (${latestApp.id}) is currently ${latestApp.status.toLowerCase()}. Reason: ${
                        latestApp.rejectionReason ||
                        latestApp.suspensionReason ||
                        'Please contact Head Office support.'
                      }`}
              </p>

              <div className="merchant-onboarding-card__meta-grid">
                <div>
                  <span className="merchant-onboarding-card__meta-label">Application Code</span>
                  <span className="merchant-onboarding-card__meta-value merchant-onboarding-card__meta-value--mono">
                    {latestApp.id}
                  </span>
                </div>
                <div>
                  <span className="merchant-onboarding-card__meta-label">Business Name</span>
                  <span className="merchant-onboarding-card__meta-value">
                    {latestApp.businessName}
                  </span>
                </div>
                <div>
                  <span className="merchant-onboarding-card__meta-label">Category</span>
                  <span className="merchant-onboarding-card__meta-value">
                    {latestApp.categoryLabel || latestApp.category}
                  </span>
                </div>
                <div>
                  <span className="merchant-onboarding-card__meta-label">Submitted Date</span>
                  <span className="merchant-onboarding-card__meta-value">
                    {formatDate(latestApp.submittedAt)}
                  </span>
                </div>
              </div>

              <div className="merchant-onboarding-card__actions">
                <button
                  type="button"
                  onClick={() => refetchApps()}
                  className="merchant-primary-btn"
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  <span>Refresh Approval Status</span>
                </button>
                <Link href="/merchant/application-status" className="merchant-secondary-btn">
                  <FileText size={15} aria-hidden="true" />
                  <span>View Application Details</span>
                </Link>
                <Link href="/merchant/tracking" className="merchant-secondary-btn">
                  <Compass size={15} aria-hidden="true" />
                  <span>Track Existing Parcels</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="merchant-dashboard">
      {/* 1. Unified Page Header */}
      <header className="merchant-page-header">
        <div className="merchant-page-header__title-group">
          <h1 className="merchant-page-header__title">Merchant Operations Dashboard</h1>
          <p className="merchant-page-header__subtitle">
            Welcome back, {user?.fullName || 'Merchant Partner'}
            {latestApp?.businessName ? ` · ${latestApp.businessName}` : ''} — monitor outbound
            shipments, deliveries, and dispatch orders.
          </p>
        </div>

        <div className="merchant-page-header__actions">
          <div className="merchant-date-badge" title="Current operations date">
            <Calendar size={15} className="merchant-date-badge__icon" aria-hidden="true" />
            <span>{currentDate}</span>
          </div>

          <button
            type="button"
            className="merchant-secondary-btn"
            onClick={() => {
              refetchOrders();
              refetchApps();
            }}
            disabled={isRefreshing}
            aria-label="Sync merchant shipments"
          >
            <RefreshCw
              size={15}
              className={isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : undefined}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Syncing…' : 'Sync Shipments'}</span>
          </button>

          <Link href="/merchant/orders/create" className="merchant-primary-btn">
            <PlusCircle size={16} aria-hidden="true" />
            <span>Create New Order</span>
          </Link>
        </div>
      </header>

      {/* 2. Verified Merchant Partner Hero Card (Matches Customer Dashboard Hero Card) */}
      {latestApp && latestApp.status === 'APPROVED' && (
        <section
          className="merchant-surface-card merchant-hero-card"
          aria-label="Verified merchant details"
        >
          <div className="merchant-hero-card__left">
            <div className="merchant-hero-card__avatar" aria-hidden="true">
              <Building2 size={24} />
            </div>
            <div className="merchant-hero-card__info">
              <div className="merchant-hero-card__badges">
                <span className="merchant-badge merchant-badge--verified">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  Approved Partner
                </span>
                <span className="merchant-badge merchant-badge--code">{latestApp.id}</span>
              </div>
              <h2 className="merchant-hero-card__name">{latestApp.businessName}</h2>
              <div className="merchant-hero-card__meta">
                <span>{latestApp.categoryLabel || latestApp.category}</span>
                {latestApp.businessAddress?.city && (
                  <>
                    <span className="merchant-hero-card__dot">·</span>
                    <MapPin size={14} color="#94a3b8" aria-hidden="true" />
                    <span>{latestApp.businessAddress.city}</span>
                  </>
                )}
                {latestApp.businessAddress?.nearestBranch && (
                  <>
                    <span className="merchant-hero-card__dot">·</span>
                    <span>Hub: {latestApp.businessAddress.nearestBranch}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="merchant-hero-card__right">
            <div className="merchant-hero-stats-pill">
              <div className="merchant-pill-stat">
                <span className="merchant-pill-stat__label">Total Orders</span>
                <span className="merchant-pill-stat__value">
                  {ordersLoading ? '…' : metrics.totalOrders}
                </span>
              </div>
              <div className="merchant-pill-divider" />
              <div className="merchant-pill-stat">
                <span className="merchant-pill-stat__label">Active</span>
                <span className="merchant-pill-stat__value merchant-pill-stat__value--active">
                  {ordersLoading ? '…' : metrics.pendingDeliveries}
                </span>
              </div>
              <div className="merchant-pill-divider" />
              <div className="merchant-pill-stat">
                <span className="merchant-pill-stat__label">Delivered</span>
                <span className="merchant-pill-stat__value merchant-pill-stat__value--success">
                  {ordersLoading ? '…' : metrics.completedDeliveries}
                </span>
              </div>
            </div>

            <Link href="/merchant/profile/business" className="merchant-profile-link">
              <span>Business Profile</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {appsError && (
        <div className="merchant-alert-banner" role="status">
          <AlertTriangle size={18} className="merchant-alert-banner__icon" aria-hidden="true" />
          <span>
            Organization Service merchant profile status is temporarily unreachable; displaying live
            Order Service shipments.
          </span>
        </div>
      )}

      {/* 3. KPI Summary Grid (reusing shared SwiftDrop StatsCard component) */}
      <section className="dispatcher-stats-grid" aria-label="Merchant shipment statistics">
        <StatsCard
          title="Total Orders"
          value={ordersLoading ? '…' : ordersError ? 'Unavailable' : metrics.totalOrders}
          description="All booked merchant parcels"
          icon={Package}
          iconColor="#2563eb"
          iconBg="#eff6ff"
        />
        <StatsCard
          title="Pending Deliveries"
          value={ordersLoading ? '…' : ordersError ? 'Unavailable' : metrics.pendingDeliveries}
          description="In transit or awaiting pickup"
          icon={Clock}
          iconColor="#d97706"
          iconBg="#fffbeb"
        />
        <StatsCard
          title="Completed Deliveries"
          value={ordersLoading ? '…' : ordersError ? 'Unavailable' : metrics.completedDeliveries}
          description="Verified proof of delivery"
          icon={CheckCircle2}
          iconColor="#16a34a"
          iconBg="#f0fdf4"
        />
        <StatsCard
          title="Exceptions / RTS"
          value={ordersLoading ? '…' : ordersError ? 'Unavailable' : metrics.failedOrCancelled}
          description="Failed, cancelled, or returned"
          icon={AlertTriangle}
          iconColor="#dc2626"
          iconBg="#fef2f2"
        />
      </section>

      {/* 4. Merchant Quick Actions */}
      <section className="merchant-quick-grid" aria-label="Merchant quick actions">
        <Link href="/merchant/orders/create" className="merchant-quick-card">
          <div className="merchant-quick-card__icon merchant-quick-card__icon--blue">
            <PlusCircle size={20} aria-hidden="true" />
          </div>
          <div className="merchant-quick-card__content">
            <div className="merchant-quick-card__title">Dispatch New Shipment</div>
            <div className="merchant-quick-card__desc">
              Calculate rates, select pickup location &amp; book courier
            </div>
          </div>
          <ArrowRight size={16} className="merchant-quick-card__arrow" aria-hidden="true" />
        </Link>

        <Link href="/merchant/orders" className="merchant-quick-card">
          <div className="merchant-quick-card__icon merchant-quick-card__icon--green">
            <FileText size={20} aria-hidden="true" />
          </div>
          <div className="merchant-quick-card__content">
            <div className="merchant-quick-card__title">Full Shipment Ledger</div>
            <div className="merchant-quick-card__desc">
              Search orders, inspect details, and manage cancellations
            </div>
          </div>
          <ArrowRight size={16} className="merchant-quick-card__arrow" aria-hidden="true" />
        </Link>

        <Link href="/merchant/tracking" className="merchant-quick-card">
          <div className="merchant-quick-card__icon merchant-quick-card__icon--cyan">
            <Compass size={20} aria-hidden="true" />
          </div>
          <div className="merchant-quick-card__content">
            <div className="merchant-quick-card__title">Live Milestone Tracker</div>
            <div className="merchant-quick-card__desc">
              Monitor real-time hub scans and delivery events
            </div>
          </div>
          <ArrowRight size={16} className="merchant-quick-card__arrow" aria-hidden="true" />
        </Link>
      </section>

      {/* 5. Recent Merchant Shipments Table */}
      <section className="merchant-surface-card" aria-label="Recent merchant shipments">
        <div className="merchant-table-card__header">
          <div>
            <h2 className="merchant-table-card__title">
              <Clock size={18} color="#2563eb" aria-hidden="true" />
              <span>Shipment Management Overview</span>
            </h2>
            <p className="merchant-table-card__subtitle">
              Real-time feed of your merchant orders from the SwiftDrop Order Service
            </p>
          </div>

          <div className="merchant-table-card__controls">
            <div className="merchant-search-box">
              <Search size={16} className="merchant-search-box__icon" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracking #, recipient, city…"
                aria-label="Search merchant shipments"
                className="merchant-search-box__input"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter shipments by status"
              className="merchant-filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending / Active</option>
              <option value="COMPLETED">Completed (Delivered)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {ordersError ? (
          <div className="merchant-state-panel">
            <div className="merchant-state-panel__icon merchant-state-panel__icon--warning">
              <AlertTriangle size={24} aria-hidden="true" />
            </div>
            <h3 className="merchant-state-panel__title">Order Service Unavailable</h3>
            <p className="merchant-state-panel__desc">
              {(ordersErrorObj as Error)?.message ||
                'Could not fetch merchant orders from the backend Order Service.'}
            </p>
          </div>
        ) : ordersLoading ? (
          <div className="merchant-state-panel">
            <Loader2
              size={30}
              color="#2563eb"
              className="dispatcher-overview__refresh-icon--spinning"
              aria-hidden="true"
            />
            <h3 className="merchant-state-panel__title">Loading merchant shipments…</h3>
            <p className="merchant-state-panel__desc">
              Synchronizing your latest merchant orders from the Order Service.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="merchant-state-panel">
            <div className="merchant-state-panel__icon">
              <Package size={26} aria-hidden="true" />
            </div>
            <h3 className="merchant-state-panel__title">No shipments found</h3>
            <p className="merchant-state-panel__desc">
              {orders.length === 0
                ? 'You have not created any merchant delivery orders yet. Click "Create New Order" to dispatch your first parcel.'
                : 'No shipments match your current search or status filter.'}
            </p>
            {orders.length === 0 && (
              <Link href="/merchant/orders/create" className="merchant-primary-btn">
                <PlusCircle size={16} aria-hidden="true" />
                <span>Create First Shipment</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="merchant-table-wrap">
            <table className="merchant-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Recipient &amp; Destination</th>
                  <th>Parcel</th>
                  <th>Charge</th>
                  <th>Status</th>
                  <th className="merchant-table__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 15).map((order) => (
                  <tr key={order.id}>
                    <td className="merchant-table__tracking">{order.trackingNumber}</td>
                    <td>
                      <div className="merchant-table__primary">
                        {order.dropoffContactName || 'Recipient'}
                      </div>
                      <div className="merchant-table__secondary">
                        {order.dropoffCity || order.dropoffAddress || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="merchant-table__primary">
                        {order.parcelDescription || order.parcelSize || 'Parcel'}
                      </div>
                      <div className="merchant-table__secondary">
                        {order.weightKg ?? 0} kg &bull; {order.pickupMethod || 'STANDARD'}
                      </div>
                    </td>
                    <td className="merchant-table__charge">
                      {order.currency || 'LKR'}{' '}
                      {Number(order.deliveryFee ?? 0).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`merchant-status-badge ${getStatusBadgeModifier(order.status)}`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="merchant-table__actions-cell">
                      <div className="merchant-table__actions">
                        <Link
                          href={`/merchant/tracking?trackingNumber=${encodeURIComponent(
                            order.trackingNumber
                          )}`}
                          className="merchant-action-chip merchant-action-chip--primary"
                        >
                          <span>Track</span>
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </Link>
                        <Link
                          href={`/merchant/orders/${order.id}`}
                          className="merchant-action-chip"
                        >
                          <span>Details</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
