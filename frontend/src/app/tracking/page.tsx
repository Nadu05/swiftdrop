'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Check,
  AlertCircle,
  Loader2,
  Phone,
  PackageCheck,
  PackageOpen,
  ShieldCheck as VerifiedIcon,
  Package,
  MapPin,
  Calendar,
  Clock,
  Copy,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { getPublicTracking, listMyOrders, getOrderCourier } from '@/api/services/orders.api';
import { getBranchById } from '@/api/services/organization.api';
import type { PublicTrackingResponse } from '@/types/order.types';

/** The delivery lifecycle shown in the progress strip, in order. */
const PROGRESS_STEPS = [
  { key: 'CREATED', label: 'Created', tone: 'teal', Icon: PackageOpen },
  { key: 'PICKED UP', label: 'Picked Up', tone: 'blue', Icon: Package },
  { key: 'IN TRANSIT', label: 'In Transit', tone: 'orange', Icon: Truck },
  { key: 'OUT FOR DELIVERY', label: 'Out for Delivery', tone: 'purple', Icon: MapPin },
  { key: 'DELIVERED', label: 'Delivered', tone: 'green', Icon: PackageCheck },
] as const;

/** Same shape the Order Service accepts for a tracking number (case-insensitive). */
const TRACKING_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9-]{5,29}$/i;

/** '10:10 AM, Nov 14, 2026' (empty when there is no valid time) */
function formatStepTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${time}, ${day}`;
}

/** 'OUT_FOR_DELIVERY' -> 'Out for delivery' */
function formatStatusLabel(status?: string): string {
  if (!status) return 'Created';
  const text = status.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function DeliveryTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialNumber = searchParams.get('number') || searchParams.get('trackingNumber') || '';

  const [queryInput, setQueryInput] = useState<string>(initialNumber);
  const [currentTrackingNumber, setCurrentTrackingNumber] = useState<string>(initialNumber);
  const [trackingData, setTrackingData] = useState<PublicTrackingResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showEntry, setShowEntry] = useState<boolean>(false);
  const [entryValue, setEntryValue] = useState<string>('');

  // Perform tracking search
  const fetchTracking = useCallback(async (num: string) => {
    const clean = num.trim();
    if (!clean) return;

    setIsLoading(true);
    setError(null);

    try {
      // Public tracking (no login): the real status, timeline, towns and distance from the Order Service
      const data = await getPublicTracking(clean);
      let merged: PublicTrackingResponse = data;

      // Signed-in customers also get their own order's details and the courier assigned in the Dispatch
      // Service. If the parcel is not theirs (or they are signed out) the public view is shown as is.
      try {
        const mine = (await listMyOrders()).find(
          (o) => o.trackingNumber?.toUpperCase() === data.trackingNumber.toUpperCase()
        );
        if (mine) {
          const [courier, branch] = await Promise.all([
            getOrderCourier(mine.id),
            mine.branchId ? getBranchById(mine.branchId).catch(() => null) : Promise.resolve(null),
          ]);
          merged = {
            ...data,
            origin: mine.pickupAddress || data.origin,
            destination: mine.dropoffAddress || data.destination,
            distanceKm: data.distanceKm ?? mine.distanceKm,
            senderName: mine.pickupContactName,
            recipientName: mine.dropoffContactName,
            branch: branch?.name ?? mine.branch,
            totalFee: mine.feeBreakdown?.totalFee ?? mine.deliveryFee,
            courierName: courier?.name,
            courierPhone: courier?.phone,
            courierVehicle: courier
              ? [courier.vehicleType && courier.vehicleType.charAt(0) + courier.vehicleType.slice(1).toLowerCase(), courier.vehiclePlate]
                  .filter(Boolean)
                  .join(' · ') || undefined
              : undefined,
          };
        }
      } catch {
        // not signed in / Dispatch unreachable: keep the public data
      }

      setTrackingData(merged);
      setCurrentTrackingNumber(data.trackingNumber);
    } catch (err: any) {
      setTrackingData(null);
      setError(err.message || `We couldn't find a parcel with tracking number "${clean}".`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run on mount or when number param changes
  useEffect(() => {
    if (initialNumber.trim()) fetchTracking(initialNumber.trim());
  }, [initialNumber, fetchTracking]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.trim()) {
      fetchTracking(queryInput.trim());
    }
  };

  const entryTrimmed = entryValue.trim();
  const entryValid = TRACKING_NUMBER_PATTERN.test(entryTrimmed);

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryValid) return;
    setQueryInput(entryTrimmed);
    fetchTracking(entryTrimmed);
  };

  const handleCopy = () => {
    if (currentTrackingNumber) {
      navigator.clipboard.writeText(currentTrackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Courier initials helper (e.g. "Kasun Perera" -> "KP")
  const getInitials = (name?: string) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Delivery progress: where the parcel is on the delivery lifecycle, with the time of each reached step
  const normalizeStatus = (value?: string) => (value || '').replace(/_/g, ' ').trim().toUpperCase();
  const currentStepIndex = Math.max(
    0,
    PROGRESS_STEPS.findIndex((step) => step.key === normalizeStatus(trackingData?.status))
  );
  const stepTimes: Record<string, string> = {};
  (trackingData?.events || []).forEach((event) => {
    const key = normalizeStatus(event.status);
    if (key && event.timestamp && !stepTimes[key]) stepTimes[key] = formatStepTime(event.timestamp);
  });

  const courierName = trackingData?.courierName;
  const branchName = trackingData?.branch || 'Not assigned yet';
  const distance = trackingData?.distanceKm != null ? `${trackingData.distanceKm} km` : '—';

  // Normalized status determination
  const statusStr = (trackingData?.status || 'In Transit').toLowerCase();
  const isDelivered = statusStr === 'delivered';
  const isCreated = statusStr === 'created';

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/customer/dashboard" className="sd-back-btn" aria-label="Back to Customer Dashboard">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="sd-header-title">Delivery tracking</h1>
              <div className="sd-header-sub">
                {currentTrackingNumber ? `Order ${currentTrackingNumber}` : "Parcel tracking"}
              </div>
            </div>
          </div>

          {/* Quick Header Search / Switcher */}
          <div className="sd-header-search-wrap">
            <form onSubmit={handleSearchSubmit} className="sd-hdr-search-form">
              <Search size={14} color="#8fa3bf" />
              <input
                type="text"
                placeholder="Track parcel #..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="sd-hdr-search-inp"
                id="sd-track-input"
              />
              <button type="submit" className="sd-hdr-search-btn">
                Track
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN TRACKING CANVAS ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          {/* PAGE HEADING */}
          {!(!isLoading && !error && trackingData) && (
            <div className="sd-page-heading">
              <h2 className="sd-page-heading-title">Delivery Tracking</h2>
              <p className="sd-page-heading-sub">Follow your parcel from pickup to your doorstep in real time.</p>
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && (
            <div className="sd-loading-card">
              <Loader2 size={32} color="#2563eb" className="animate-spin" />
              <div className="sd-loading-title">Updating live parcel telemetry...</div>
              <p className="sd-loading-sub">Connecting to SwiftDrop Order & Dispatch Service</p>
            </div>
          )}

          {/* ERROR STATE */}
          {!isLoading && error && (
            <div className="sd-error-card">
              <AlertCircle size={24} color="#dc2626" />
              <div className="sd-error-title">Tracking Record Not Found</div>
              <p className="sd-error-sub">{error}</p>
            </div>
          )}

          {!isLoading && !error && !trackingData && (
            <div className="sd-error-card">
              <div className="sd-empty-icon">
                <Truck size={30} />
              </div>
              <div className="sd-error-title">Track your delivery</div>
              <p className="sd-error-sub">
                Enter the tracking number from your booking to see the live status of your delivery.
              </p>
              {!showEntry ? (
                <button type="button" className="sd-retry-btn" onClick={() => setShowEntry(true)}>
                  Enter your tracking number
                </button>
              ) : (
                <form className="sd-entry-form" onSubmit={handleEntrySubmit} noValidate>
                  <div className="sd-entry-row">
                    <input
                      type="text"
                      autoFocus
                      value={entryValue}
                      onChange={(e) => setEntryValue(e.target.value)}
                      placeholder="e.g. SD-261114-4TLZHCQF"
                      className={`sd-entry-input ${entryTrimmed && !entryValid ? 'invalid' : ''}`}
                      aria-label="Tracking number"
                      aria-invalid={entryTrimmed !== '' && !entryValid}
                    />
                    {entryValid && (
                      <button type="submit" className="sd-retry-btn sd-entry-track">
                        Track
                      </button>
                    )}
                  </div>
                  {entryTrimmed && !entryValid && (
                    <span className="sd-entry-hint">
                      Use 6–30 letters, numbers or dashes, like SD-261114-4TLZHCQF.
                    </span>
                  )}
                </form>
              )}
            </div>
          )}

          {/* ---------------- BALANCED 2-COLUMN DESKTOP / 1-COLUMN MOBILE LAYOUT ---------------- */}
          {!isLoading && !error && trackingData && (
            <div className="sd-tracking-stack">
            {/* Status Badge & Hero Headings */}
            <div className="sd-status-hero">
              <div>
                {isDelivered ? (
                  <span className="sd-badge-success">DELIVERED</span>
                ) : isCreated ? (
                  <span className="sd-badge-pending">DISPATCH IN PROGRESS</span>
                ) : null}
              </div>

              {(isDelivered || isCreated) && (
                <>
                  <h2 className="sd-hero-title">
                    {isDelivered ? 'Your parcel has been delivered' : 'Booking received & confirmed'}
                  </h2>

                  <p className="sd-hero-sub">
                    {isDelivered
                      ? 'Successfully handed over to recipient. Thank you for using SwiftDrop.'
                      : 'Your booking is being prepared for courier assignment.'}
                  </p>
                </>
              )}
            </div>

              {/* ---------------- COURIER ---------------- */}
              <div className="sd-cb">
                <div className="sd-cb-avatar">
                  {courierName ? getInitials(courierName) : <Truck size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sd-cb-name-row">
                    <span className="sd-cb-name">{courierName || 'Not assigned yet'}</span>
                    {courierName && (
                      <span className="sd-cb-verified">
                        <VerifiedIcon size={12} /> Verified Courier
                      </span>
                    )}
                  </div>
                  <div className="sd-cb-meta">
                    {courierName
                      ? [trackingData.courierPhone, trackingData.courierVehicle].filter(Boolean).join(' · ') || 'Assigned courier'
                      : 'A courier will be assigned to your delivery soon.'}
                  </div>
                </div>
                {trackingData.courierPhone && (
                  <a href={`tel:${trackingData.courierPhone}`} className="sd-call-btn" title="Call courier">
                    <Phone size={14} />
                    Call
                  </a>
                )}
              </div>

              {/* ---------------- DELIVERY PROGRESS: key details + horizontal stepper ---------------- */}
              <div className="sd-white-panel sd-progress-panel">
                <h3 className="sd-progress-heading">Delivery progress</h3>

                <div className="sd-info-row">
                  <div className="sd-info-cell">
                    <span className="sd-info-lbl">Current Status</span>
                    <span className="sd-info-val">{formatStatusLabel(trackingData.status)}</span>
                  </div>
                  <div className="sd-info-cell">
                    <span className="sd-info-lbl">Last Updated</span>
                    <span className="sd-info-val">{formatStepTime(trackingData.updatedAt) || '—'}</span>
                  </div>
                  <div className="sd-info-cell">
                    <span className="sd-info-lbl">Assigned Branch</span>
                    <span className="sd-info-val">{trackingData.branch || 'Not assigned yet'}</span>
                  </div>
                </div>

                <div className="sd-hstepper" role="list" aria-label="Delivery progress">
                  {PROGRESS_STEPS.map((step, index) => {
                    const done = index <= currentStepIndex;
                    const time = stepTimes[step.key];
                    return (
                      <div className="sd-hstep" role="listitem" key={step.key}>
                        <span className={`sd-hstep-icon ${step.tone} ${done ? '' : 'pending'}`}>
                          <step.Icon size={18} />
                        </span>
                        <div className="sd-hstep-track">
                          <span className={`sd-hstep-line ${index === 0 ? 'edge' : ''} ${done ? 'done' : ''}`} />
                          <span className={`sd-hstep-dot ${done ? 'done' : ''}`}>
                            {done ? <Check size={13} strokeWidth={3} /> : <span>{index + 1}</span>}
                          </span>
                          <span
                            className={`sd-hstep-line ${index === PROGRESS_STEPS.length - 1 ? 'edge' : ''} ${
                              index < currentStepIndex ? 'done' : ''
                            }`}
                          />
                        </div>
                        <span className={`sd-hstep-pill ${step.tone} ${done ? '' : 'pending'}`}>{step.label}</span>
                        <span className="sd-hstep-time">{done ? time || '—' : 'Pending'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ---------------- SHIPMENT SPECIFICATIONS: Sender | Recipient | Order info ---------------- */}
              <div className="sd-white-panel sd-spec-card">
                <h3 className="sd-spec-heading">Shipment Specifications</h3>
                <div className="sd-spec-body">
                  <div className="sd-spec-col">
                    <div className="sd-spec-strong">Sender · Pickup location</div>
                    <div className="sd-spec-text">{trackingData.origin || '—'}</div>
                    {trackingData.senderName && <div className="sd-spec-name">{trackingData.senderName}</div>}
                    <div className="sd-spec-strong sd-spec-gap">Recipient · Delivery location</div>
                    <div className="sd-spec-text">{trackingData.destination || '—'}</div>
                    {trackingData.recipientName && <div className="sd-spec-name">{trackingData.recipientName}</div>}
                  </div>
                  <div className="sd-spec-col">
                    <div className="sd-spec-title">ORDER INFO</div>
                    <div className="sd-spec-line">
                      <span className="sd-spec-lbl">Tracking number</span>
                      <span className="sd-spec-val">
                        {currentTrackingNumber}
                        <button type="button" onClick={handleCopy} className="sd-copy-mini-btn" title="Copy tracking number">
                          {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        </button>
                      </span>
                    </div>
                    <div className="sd-spec-line">
                      <span className="sd-spec-lbl">Assigned branch</span>
                      <span className="sd-spec-val">{branchName}</span>
                    </div>
                    <div className="sd-spec-line">
                      <span className="sd-spec-lbl">Route distance</span>
                      <span className="sd-spec-val">{distance}</span>
                    </div>
                    <div className="sd-spec-line">
                      <span className="sd-spec-lbl">Order total</span>
                      <span className="sd-spec-val">
                        {trackingData.totalFee != null ? `LKR ${trackingData.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- STYLES (FITS SCREEN PROPERLY ON DESKTOP & MOBILE) ---------------- */}
      <style jsx global>{`
        .sd-fullpage-root {
          width: 100%;
          min-height: 100vh;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
        }

        /* Top Header Bar */
        .sd-fullpage-header {
          background: #0f1f38;
          color: #ffffff;
          padding: 1.25rem 2.5rem;
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

        .sd-header-search-wrap {
          display: flex;
          align-items: center;
        }

        .sd-hdr-search-form {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
        }

        .sd-hdr-search-inp {
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 0.8rem;
          width: 130px;
          font-family: inherit;
        }

        .sd-hdr-search-inp::placeholder {
          color: #8fa3bf;
        }

        .sd-hdr-search-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
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
          width: 100%;
        }

        /* Balanced 2-Column Responsive Desktop Grid */
        .sd-tracking-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 2rem;
          align-items: flex-start;
        }

        .sd-tracking-left-col,
        .sd-tracking-right-col {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Hero Status Block */
        .sd-status-hero {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sd-badge-assigned {
          display: inline-block;
          background: #dcfce7;
          color: #15803d;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .sd-badge-success {
          display: inline-block;
          background: #dcfce7;
          color: #15803d;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .sd-badge-pending {
          display: inline-block;
          background: #fef3c7;
          color: #b45309;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .sd-hero-title {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0;
          line-height: 1.25;
        }

        .sd-hero-sub {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
          line-height: 1.45;
        }

        /* Map Card */
        .sd-map-card {
          position: relative;
          height: 220px;
          background: #edf3f9;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
        }

        .sd-map-grid-bg {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.75) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.75) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .sd-map-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .sd-map-marker {
          position: absolute;
          z-index: 2;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .marker-p {
          top: 36%;
          left: 15%;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #2563eb;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
        }

        .marker-courier {
          top: 48%;
          left: 50%;
        }

        .sd-courier-core {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #16a34a;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(22, 163, 74, 0.4);
          position: relative;
          z-index: 2;
        }

        .sd-courier-pulse {
          position: absolute;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(22, 163, 74, 0.25);
          animation: mapPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          transform: translate(-50%, -50%);
          top: 50%;
          left: 50%;
        }

        @keyframes mapPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.6);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.6);
            opacity: 0;
          }
        }

        .marker-d {
          top: 68%;
          left: 80%;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #06b6d4;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(6, 182, 212, 0.4);
        }

        .sd-map-distance-tag {
          position: absolute;
          bottom: 12px;
          left: 14px;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          z-index: 3;
        }

        /* Courier Information Card */
        .sd-courier-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.25rem 1.45rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
        }

        .sd-courier-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .sd-courier-left {
          display: flex;
          align-items: center;
          gap: 0.95rem;
        }

        .sd-courier-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #dbeafe;
          color: #2563eb;
          font-size: 1.05rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-courier-name {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }

        .sd-courier-verified {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .sd-courier-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.775rem;
          font-weight: 700;
          color: #f59e0b;
          margin-top: 3px;
        }

        .sd-courier-actions {
          display: flex;
          align-items: center;
          gap: 1.15rem;
        }

        .sd-action-link {
          font-size: 0.85rem;
          color: #2563eb;
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.15s;
        }

        .sd-action-link:hover {
          text-decoration: underline;
        }

        .sd-courier-bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
        }

        .sd-eta-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .sd-eta-time {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
        }

        /* Clean White Panels */
        .sd-white-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
        }

        .sd-demo-panel {
          padding: 1rem 1.5rem;
        }

        .sd-demo-panel .sd-quick-badges-row {
          margin-top: 0;
          padding-top: 0;
          border-top: none;
        }

        /* Page stack: full-width sections one below another */
        .sd-tracking-stack {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Delivery progress: key details row + horizontal stepper */
        .sd-info-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1rem 0 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .sd-info-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }

        .sd-info-lbl {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 500;
        }

        .sd-info-val {
          font-size: 0.92rem;
          font-weight: 600;
          color: #0f172a;
        }

        .sd-hstepper {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          padding-bottom: 0.25rem;
        }

        .sd-hstep {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
        }

        .sd-hstep-track {
          width: 100%;
          display: flex;
          align-items: center;
        }

        .sd-hstep-line {
          flex: 1;
          height: 3px;
          background: #e2e8f0;
        }

        .sd-hstep-line.done {
          background: #2563eb;
        }

        .sd-hstep-line.edge {
          background: transparent;
        }

        .sd-hstep-track {
          justify-content: center;
        }

        .sd-hstep-dot {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 2px solid #cbd5e1;
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .sd-hstep-dot.done {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
        }

        .sd-hstep-pill {
          font-size: 0.74rem;
          font-weight: 600;
          padding: 0.2rem 0.7rem;
          border-radius: 4px;
          white-space: nowrap;
        }

        .sd-hstep-pill.teal { background: #ccfbf1; color: #0f766e; }
        .sd-hstep-pill.blue { background: #dbeafe; color: #1d4ed8; }
        .sd-hstep-pill.orange { background: #ffedd5; color: #c2410c; }
        .sd-hstep-pill.purple { background: #ede9fe; color: #6d28d9; }
        .sd-hstep-pill.green { background: #dcfce7; color: #15803d; }
        .sd-hstep-pill.pending { background: #f1f5f9; color: #94a3b8; }

        .sd-hstep-time {
          font-size: 0.74rem;
          color: #475569;
          text-align: center;
        }

        /* Shipment specifications: Sender | Recipient | Order info */
        .sd-spec-card {
          padding: 0;
          overflow: hidden;
        }

        .sd-spec-heading {
          margin: 0;
          padding: 1.25rem 1.5rem 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sd-spec-body {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        .sd-spec-gap {
          margin-top: 0.9rem;
        }

        .sd-hstep-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sd-hstep-icon.teal { background: #ccfbf1; color: #0f766e; }
        .sd-hstep-icon.blue { background: #dbeafe; color: #1d4ed8; }
        .sd-hstep-icon.orange { background: #ffedd5; color: #c2410c; }
        .sd-hstep-icon.purple { background: #ede9fe; color: #6d28d9; }
        .sd-hstep-icon.green { background: #dcfce7; color: #15803d; }
        .sd-hstep-icon.pending { background: #f1f5f9; color: #94a3b8; }

        .sd-spec-name {
          font-size: 0.86rem;
          font-weight: 600;
          color: #0f172a;
        }

        .sd-cb {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.85rem 1rem;
        }
        .sd-cb-avatar {
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
        .sd-cb-name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .sd-cb-name { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
        .sd-cb-verified {
          font-size: 0.68rem;
          color: #16a34a;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
        }
        .sd-cb-meta { font-size: 0.72rem; color: #64748b; margin-top: 2px; }

        .sd-call-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1.1rem;
          border-radius: 10px;
          background: #2563eb;
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
        }
        .sd-call-btn:hover { background: #1d4ed8; }

        .sd-spec-col {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
        }

        .sd-spec-body {
          padding-bottom: 1.5rem;
        }

        .sd-spec-col + .sd-spec-col {
          border-left: 1px solid #e2e8f0;
        }

        .sd-spec-title {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #0f172a;
          margin-bottom: 0.6rem;
        }

        .sd-spec-strong {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-spec-text {
          font-size: 0.86rem;
          color: #475569;
          line-height: 1.5;
        }

        .sd-spec-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.84rem;
          padding-top: 0.15rem;
        }

        .sd-spec-lbl {
          color: #64748b;
        }

        .sd-spec-val {
          font-weight: 600;
          color: #0f172a;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          text-align: right;
        }

        /* Delivery Progress Stepper */
        .sd-progress-heading {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 1.25rem 0;
        }

        .sd-stepper-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .sd-step-item {
          display: flex;
          gap: 1.15rem;
          position: relative;
          min-height: 52px;
        }

        .sd-step-indicator {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .sd-step-indicator.completed {
          background: #dcfce7;
          color: #16a34a;
        }

        .sd-step-indicator.pending {
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
        }

        .sd-step-line {
          position: absolute;
          top: 26px;
          left: 12px;
          width: 2px;
          height: calc(100% - 26px + 14px);
          z-index: 0;
        }

        .sd-step-line.solid {
          background: #16a34a;
        }

        .sd-step-line.active {
          background: #16a34a;
        }

        .sd-step-line.gray {
          background: #e2e8f0;
        }

        .sd-step-content {
          display: flex;
          flex: 1;
          align-items: flex-start;
          justify-content: space-between;
          padding-top: 3px;
        }

        .sd-step-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
        }

        .sd-step-name.muted {
          color: #64748b;
          font-weight: 500;
        }

        .sd-step-time {
          font-size: 0.8rem;
          color: #64748b;
          white-space: nowrap;
          margin-left: 0.5rem;
        }

        .sd-step-time.next-step {
          color: #94a3b8;
          font-size: 0.775rem;
        }

        /* Shipment Details Card */
        .sd-shipment-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1rem;
        }

        .sd-shipment-rows {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .sd-shipment-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
        }

        .sd-shipment-row .lbl {
          color: #64748b;
        }

        .sd-shipment-row .val {
          color: #0f172a;
          font-weight: 600;
          text-align: right;
        }

        .sd-shipment-row .val.bold {
          font-weight: 700;
        }

        .sd-copy-mini-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
          padding: 0.2rem 0.35rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .sd-copy-mini-btn:hover {
          background: #e2e8f0;
        }

        .sd-quick-badges-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-top: 0.85rem;
          margin-top: 0.85rem;
          border-top: 1px solid #f1f5f9;
          flex-wrap: wrap;
        }

        .sd-quick-lbl {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 600;
        }

        .sd-quick-pill {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #334155;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sd-quick-pill:hover,
        .sd-quick-pill.active {
          background: #e0ecfe;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        /* Loading & Error */
        .sd-loading-card, .sd-error-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 3rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-loading-title, .sd-error-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-loading-sub, .sd-error-sub {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        .sd-page-heading {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1.5rem;
          text-align: left;
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

        .sd-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #e0ecfe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sd-entry-form {
          width: 100%;
          max-width: 420px;
          margin-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          align-items: stretch;
        }

        .sd-entry-row {
          display: flex;
          gap: 0.5rem;
        }

        .sd-entry-input {
          flex: 1;
          min-width: 0;
          padding: 0.6rem 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        .sd-entry-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .sd-entry-input.invalid {
          border-color: #dc2626;
        }

        .sd-entry-hint {
          font-size: 0.75rem;
          color: #dc2626;
          text-align: left;
        }

        .sd-entry-track {
          margin-top: 0;
          padding: 0.5rem 1.4rem;
        }

        .sd-retry-btn {
          margin-top: 0.5rem;
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 0.5rem 1.15rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* Responsive Breakpoints */
        @media (max-width: 992px) {
          .sd-tracking-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .sd-info-row {
            grid-template-columns: 1fr 1fr;
          }

          .sd-hstepper {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .sd-hstep {
            flex-direction: row;
            justify-content: flex-start;
            gap: 0.75rem;
          }

          .sd-hstep-track {
            width: auto;
          }

          .sd-hstep-line {
            display: none;
          }

          .sd-spec-body {
            grid-template-columns: 1fr;
          }

          .sd-spec-col + .sd-spec-col {
            border-left: none;
            border-top: 1px solid #e2e8f0;
          }

          .sd-fullpage-header {
            padding: 1.25rem 1.5rem;
          }

          .sd-fullpage-body {
            padding: 1.5rem 1.5rem 3rem 1.5rem;
          }
        }

        @media (max-width: 640px) {
          .sd-header-search-wrap {
            display: none;
          }

          .sd-fullpage-header {
            padding: 1rem 1.25rem;
          }

          .sd-fullpage-body {
            padding: 1.25rem 1rem 3rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function DeliveryTrackingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f7fb' }}>
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      }
    >
      <DeliveryTrackingContent />
    </Suspense>
  );
}
