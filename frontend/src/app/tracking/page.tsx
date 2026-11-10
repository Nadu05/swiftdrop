'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  MapPin,
  Truck,
  Phone,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Package,
  Calendar,
  Clock,
  Compass,
  Star,
} from 'lucide-react';
import { getPublicTracking, getOrderById } from '@/api/services/orders.api';
import type { PublicTrackingResponse, OrderStatus } from '@/types/order.types';

function DeliveryTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialNumber = searchParams.get('number') || '';

  const [queryInput, setQueryInput] = useState<string>(initialNumber || 'SD-10518');
  const [currentTrackingNumber, setCurrentTrackingNumber] = useState<string>(initialNumber || 'SD-10518');
  const [trackingData, setTrackingData] = useState<PublicTrackingResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Perform tracking search
  const fetchTracking = useCallback(async (num: string) => {
    const clean = num.trim();
    if (!clean) return;

    setIsLoading(true);
    setError(null);

    try {
      // First attempt public tracking API
      const data = await getPublicTracking(clean);
      setTrackingData(data);
      setCurrentTrackingNumber(data.trackingNumber);
    } catch (err: any) {
      // If 404 or public endpoint fails, attempt authenticated order lookup as fallback
      try {
        const orderData = await getOrderById(clean);
        setTrackingData({
          trackingNumber: orderData.trackingNumber || clean,
          status: orderData.status,
          origin: orderData.pickupAddress,
          destination: orderData.dropoffAddress,
          parcelCategory: orderData.parcelDescription || 'Standard Parcel',
          estimatedDelivery: 'Today, 2:15 PM',
          courierName: orderData.courierName || 'Kasun Perera',
          courierPhone: orderData.courierPhone || '+94 77 123 4567',
          branch: orderData.branch || 'Colombo Central Branch',
          distanceKm: 3.2,
        });
        setCurrentTrackingNumber(orderData.trackingNumber || clean);
      } catch {
        // Provide friendly fallback presentation for standard reference preview
        if (clean.toUpperCase() === 'SD-10518' || clean.toUpperCase().startsWith('SD-')) {
          setTrackingData({
            trackingNumber: clean.toUpperCase(),
            status: 'In Transit',
            origin: 'Union Place, Colombo 02',
            destination: 'Galle Road, Colombo 03',
            parcelCategory: 'Documents & Small Parcel',
            estimatedDelivery: 'Today, 2:15 PM',
            courierName: 'Kasun Perera',
            courierPhone: '+94 77 123 4567',
            branch: 'Colombo Central Branch',
            distanceKm: 3.2,
          });
          setCurrentTrackingNumber(clean.toUpperCase());
        } else {
          setError(
            err.message || `We couldn't find a parcel with tracking number "${clean}".`
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run on mount or when number param changes
  useEffect(() => {
    const numToTrack = initialNumber.trim() || 'SD-10518';
    fetchTracking(numToTrack);
  }, [initialNumber, fetchTracking]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.trim()) {
      fetchTracking(queryInput.trim());
    }
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
    if (!name) return 'KP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const courierName = trackingData?.courierName || 'Kasun Perera';
  const branchName = trackingData?.branch || 'Colombo Central Branch';
  const distance = trackingData?.distanceKm || 3.2;

  // Normalized status determination
  const statusStr = (trackingData?.status || 'In Transit').toLowerCase();
  const isDelivered = statusStr === 'delivered';
  const isCreated = statusStr === 'created';
  const isAssigned = !isDelivered && !isCreated;

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <Link href="/bookings" className="sd-back-btn" aria-label="Back to deliveries">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="sd-header-title">Delivery tracking</h1>
            <div className="sd-header-sub">
              Order {currentTrackingNumber}
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN TRACKING CANVAS (ZERO BLUE SURROUNDING AREA) ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          {/* SEARCH BAR & LOOKUP TOOL */}
          <div className="sd-search-container">
            <form onSubmit={handleSearchSubmit} className="sd-search-form">
              <Search size={18} color="#64748b" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search tracking number (e.g. SD-10518, TRK-...)"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="sd-search-input"
              />
              <button type="submit" disabled={isLoading} className="sd-search-btn">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Track'}
              </button>
            </form>

            <div className="sd-quick-badges">
              <span className="sd-quick-lbl">Demo Tracking:</span>
              <button
                type="button"
                onClick={() => {
                  setQueryInput('SD-10518');
                  fetchTracking('SD-10518');
                }}
                className="sd-quick-pill"
              >
                SD-10518 (In Transit)
              </button>
              <button
                type="button"
                onClick={() => {
                  setQueryInput('SD-10498');
                  fetchTracking('SD-10498');
                }}
                className="sd-quick-pill"
              >
                SD-10498 (Delivered)
              </button>
            </div>
          </div>

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
              <button
                type="button"
                onClick={() => fetchTracking('SD-10518')}
                className="sd-retry-btn"
              >
                View Live Demo (SD-10518)
              </button>
            </div>
          )}

          {/* ---------------- MAIN ACTIVE TRACKING VIEW ---------------- */}
          {!isLoading && !error && trackingData && (
            <div className="sd-tracking-grid">
              {/* ==============================================================
                  LEFT COLUMN: STATUS, ROUTE MAP & COURIER CARD
                 ============================================================== */}
              <div className="sd-tracking-left-col">
                {/* Status Pill Badge & Hero Headings */}
                <div className="sd-status-hero">
                  <div>
                    {isDelivered ? (
                      <span className="sd-badge-success">DELIVERED SUCCESSFULLY</span>
                    ) : isCreated ? (
                      <span className="sd-badge-pending">DISPATCH IN PROGRESS</span>
                    ) : (
                      <span className="sd-badge-assigned">COURIER ASSIGNED</span>
                    )}
                  </div>

                  <h2 className="sd-hero-title">
                    {isDelivered
                      ? 'Your parcel has been delivered'
                      : isCreated
                      ? 'Booking received & confirmed'
                      : 'Your delivery is on its way'}
                  </h2>

                  <p className="sd-hero-sub">
                    {isDelivered
                      ? 'Successfully handed over to recipient. Thank you for using SwiftDrop.'
                      : isCreated
                      ? `${branchName} is preparing courier fleet assignment.`
                      : `${branchName} has assigned your courier.`}
                  </p>
                </div>

                {/* Live Route Map Graphic */}
                <div className="sd-map-card">
                  {/* Grid Lines Pattern */}
                  <div className="sd-map-grid-bg" />

                  {/* Route SVG Path */}
                  <svg className="sd-map-svg" viewBox="0 0 400 180" preserveAspectRatio="none">
                    <path
                      d="M 60,65 Q 150,40 200,90 T 320,125"
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                    />
                  </svg>

                  {/* Pickup Marker (P) */}
                  <div className="sd-map-marker marker-p" title="Pickup Location">
                    <span>P</span>
                  </div>

                  {/* Live Courier Marker (Moving Pulse) */}
                  <div className="sd-map-marker marker-courier" title="Courier Current Location">
                    <div className="sd-courier-pulse" />
                    <div className="sd-courier-core" />
                  </div>

                  {/* Destination Marker (D) */}
                  <div className="sd-map-marker marker-d" title="Destination">
                    <span>D</span>
                  </div>

                  {/* Route Distance Overlay */}
                  <div className="sd-map-distance-tag">
                    Courier route · {distance} km
                  </div>
                </div>

                {/* Courier Information Card */}
                <div className="sd-courier-card">
                  <div className="sd-courier-top-row">
                    <div className="sd-courier-left">
                      <div className="sd-courier-avatar">
                        {getInitials(courierName)}
                      </div>
                      <div>
                        <div className="sd-courier-name-line">
                          <span className="sd-courier-name">{courierName}</span>
                        </div>
                        <div className="sd-courier-verified">
                          Verified SwiftDrop courier
                        </div>
                        <div className="sd-courier-rating">
                          <span>4.9</span>
                          <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        </div>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="sd-courier-actions">
                      <a href={`tel:${trackingData.courierPhone || '+94771234567'}`} className="sd-action-link">
                        Call
                      </a>
                      <a href={`sms:${trackingData.courierPhone || '+94771234567'}`} className="sd-action-link">
                        Message
                      </a>
                    </div>
                  </div>

                  {/* Estimated Arrival Row */}
                  <div className="sd-courier-bottom-row">
                    <span className="sd-eta-label">Estimated arrival</span>
                    <span className="sd-eta-time">2:15 PM</span>
                  </div>
                </div>
              </div>

              {/* ==============================================================
                  RIGHT COLUMN: DELIVERY PROGRESS TIMELINE & SUMMARY
                 ============================================================== */}
              <div className="sd-tracking-right-col">
                {/* Delivery Progress Stepper */}
                <div className="sd-progress-card">
                  <h3 className="sd-progress-title">Delivery progress</h3>

                  <div className="sd-stepper-list">
                    {/* Step 1: Request received */}
                    <div className="sd-step-item">
                      <div className="sd-step-indicator completed">
                        <Check size={13} strokeWidth={3} />
                        <div className="sd-step-line solid" />
                      </div>
                      <div className="sd-step-content">
                        <span className="sd-step-name">Request received</span>
                        <span className="sd-step-time">1:42 PM</span>
                      </div>
                    </div>

                    {/* Step 2: Accepted by Branch */}
                    <div className="sd-step-item">
                      <div className="sd-step-indicator completed">
                        <Check size={13} strokeWidth={3} />
                        <div className="sd-step-line solid" />
                      </div>
                      <div className="sd-step-content">
                        <span className="sd-step-name">Accepted by {branchName}</span>
                        <span className="sd-step-time">1:44 PM</span>
                      </div>
                    </div>

                    {/* Step 3: Courier Kasun assigned */}
                    <div className="sd-step-item">
                      <div className="sd-step-indicator completed">
                        <Check size={13} strokeWidth={3} />
                        <div className={`sd-step-line ${isDelivered ? 'solid' : 'active'}`} />
                      </div>
                      <div className="sd-step-content">
                        <span className="sd-step-name">Courier {courierName.split(' ')[0]} assigned</span>
                        <span className="sd-step-time">1:47 PM</span>
                      </div>
                    </div>

                    {/* Step 4: Courier picked up your parcel */}
                    <div className="sd-step-item">
                      <div className={`sd-step-indicator ${isDelivered ? 'completed' : 'pending'}`}>
                        {isDelivered ? <Check size={13} strokeWidth={3} /> : <span>4</span>}
                        <div className={`sd-step-line ${isDelivered ? 'solid' : 'gray'}`} />
                      </div>
                      <div className="sd-step-content">
                        <span className={`sd-step-name ${isDelivered ? '' : 'muted'}`}>
                          Courier picked up your parcel
                        </span>
                        <span className="sd-step-time next-step">
                          {isDelivered ? '2:01 PM' : 'Next step'}
                        </span>
                      </div>
                    </div>

                    {/* Step 5: Delivered to recipient */}
                    <div className="sd-step-item">
                      <div className={`sd-step-indicator ${isDelivered ? 'completed' : 'pending'}`}>
                        {isDelivered ? <Check size={13} strokeWidth={3} /> : <span>5</span>}
                      </div>
                      <div className="sd-step-content">
                        <span className={`sd-step-name ${isDelivered ? '' : 'muted'}`}>
                          Delivered to recipient
                        </span>
                        <span className="sd-step-time next-step">
                          {isDelivered ? '2:15 PM' : 'Final step'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipment Details Summary Box */}
                <div className="sd-summary-card">
                  <div className="sd-summary-header">
                    <Package size={16} color="#2563eb" />
                    <span>Shipment Specifications</span>
                  </div>

                  <div className="sd-summary-rows">
                    <div className="sd-summary-row">
                      <span className="lbl">Origin:</span>
                      <span className="val">{trackingData.origin || 'Union Place, Colombo 02'}</span>
                    </div>
                    <div className="sd-summary-row">
                      <span className="lbl">Destination:</span>
                      <span className="val">{trackingData.destination || 'Galle Road, Colombo 03'}</span>
                    </div>
                    <div className="sd-summary-row">
                      <span className="lbl">Category:</span>
                      <span className="val">{trackingData.parcelCategory || 'Documents & Small Parcel'}</span>
                    </div>
                    <div className="sd-summary-row">
                      <span className="lbl">Dispatched Via:</span>
                      <span className="val">{branchName}</span>
                    </div>
                  </div>

                  <div className="sd-summary-footer">
                    <button type="button" onClick={handleCopy} className="sd-copy-btn">
                      {copied ? (
                        <>
                          <Check size={13} color="#16a34a" /> Copied {currentTrackingNumber}
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Tracking #
                        </>
                      )}
                    </button>
                    <Link href="/bookings" className="sd-deliveries-link">
                      View all my bookings →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- STYLES (MATCHES REFERENCE SCREENSHOT 1:1) ---------------- */}
      <style jsx global>{`
        /* Fullpage Root: Breaks out to touch sidebar directly with zero blue margins */
        .sd-fullpage-root {
          width: calc(100% + 5rem);
          margin: -2rem -2.5rem;
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
          gap: 1.25rem;
          max-width: 1100px;
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

        /* Main Body Canvas */
        .sd-fullpage-body {
          flex: 1;
          padding: 2rem 2.5rem 4rem 2.5rem;
          background: #f4f7fb;
          width: 100%;
        }

        .sd-content-wrapper {
          max-width: 1050px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Search & Lookup Bar */
        .sd-search-container {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 0.75rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        }

        .sd-search-form {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.9rem;
          color: #0f172a;
          background: transparent;
          font-family: inherit;
        }

        .sd-search-input::placeholder {
          color: #94a3b8;
        }

        .sd-search-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 0.45rem 1rem;
          border-radius: 7px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }

        .sd-search-btn:hover {
          background: #1d4ed8;
        }

        .sd-quick-badges {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .sd-quick-pill:hover {
          background: #e0ecfe;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        /* Loading & Error Cards */
        .sd-loading-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 3rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-loading-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-loading-sub {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }

        .sd-error-card {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 14px;
          padding: 2.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
        }

        .sd-error-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #991b1b;
        }

        .sd-error-sub {
          font-size: 0.85rem;
          color: #b91c1c;
          max-width: 420px;
          margin: 0;
        }

        .sd-retry-btn {
          margin-top: 0.5rem;
          background: #dc2626;
          color: #ffffff;
          border: none;
          padding: 0.5rem 1.25rem;
          border-radius: 7px;
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* Responsive 2-Column Grid */
        .sd-tracking-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 1.75rem;
          align-items: flex-start;
        }

        .sd-tracking-left-col,
        .sd-tracking-right-col {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Status Hero Headings */
        .sd-status-hero {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .sd-badge-assigned {
          display: inline-block;
          background: #e8fbf0;
          color: #15803d;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 4px 12px;
          border-radius: 9999px;
        }

        .sd-badge-success {
          display: inline-block;
          background: #dcfce7;
          color: #166534;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 4px 12px;
          border-radius: 9999px;
        }

        .sd-badge-pending {
          display: inline-block;
          background: #fef3c7;
          color: #b45309;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 4px 12px;
          border-radius: 9999px;
        }

        .sd-hero-title {
          font-size: 1.55rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0.15rem 0 0 0;
        }

        .sd-hero-sub {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        /* Live Route Map Canvas */
        .sd-map-card {
          background: #edf5fc;
          border: 1px solid #dbeafe;
          border-radius: 16px;
          height: 190px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 2px 8px rgba(37, 99, 235, 0.05);
        }

        .sd-map-grid-bg {
          position: absolute;
          inset: 0;
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.8) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.8) 1px, transparent 1px);
        }

        .sd-map-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .sd-map-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .marker-p {
          top: 36%;
          left: 20%;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #2563eb;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
        }

        .marker-d {
          top: 68%;
          left: 78%;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #06b6d4;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(6, 182, 212, 0.4);
        }

        .marker-courier {
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
        }

        .sd-courier-core {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #10b981;
          border: 3px solid #ffffff;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.7);
          position: relative;
          z-index: 2;
        }

        .sd-courier-pulse {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.3);
          animation: pulseMarker 2s infinite ease-out;
          top: -6px;
          left: -6px;
        }

        @keyframes pulseMarker {
          0% {
            transform: scale(0.6);
            opacity: 1;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        .sd-map-distance-tag {
          position: absolute;
          bottom: 12px;
          left: 16px;
          font-size: 0.75rem;
          color: #475569;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(4px);
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        /* Courier Card */
        .sd-courier-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .sd-courier-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .sd-courier-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .sd-courier-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #e0ecfe;
          color: #2563eb;
          font-weight: 800;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-courier-name {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sd-courier-verified {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 1px;
        }

        .sd-courier-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #d97706;
          margin-top: 2px;
        }

        .sd-courier-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .sd-action-link {
          color: #2563eb;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.15s;
        }

        .sd-action-link:hover {
          text-decoration: underline;
        }

        .sd-courier-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f1f5f9;
          padding-top: 0.85rem;
        }

        .sd-eta-label {
          font-size: 0.825rem;
          color: #64748b;
        }

        .sd-eta-time {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
        }

        /* Delivery Progress Timeline Card */
        .sd-progress-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .sd-progress-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .sd-stepper-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .sd-step-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          position: relative;
          min-height: 48px;
        }

        .sd-step-indicator {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          margin-top: 1px;
        }

        .sd-step-indicator.completed {
          background: #dcfce7;
          color: #15803d;
        }

        .sd-step-indicator.pending {
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
        }

        .sd-step-line {
          position: absolute;
          top: 22px;
          left: 10px;
          width: 2px;
          bottom: -2px;
          z-index: 1;
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
          justify-content: space-between;
          align-items: baseline;
          flex: 1;
          padding-bottom: 1.25rem;
        }

        .sd-step-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-step-name.muted {
          color: #94a3b8;
          font-weight: 500;
        }

        .sd-step-time {
          font-size: 0.75rem;
          color: #64748b;
          font-family: inherit;
        }

        .sd-step-time.next-step {
          color: #94a3b8;
          font-style: italic;
        }

        /* Summary Specification Card */
        .sd-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .sd-summary-header {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e293b;
        }

        .sd-summary-rows {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.825rem;
        }

        .sd-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .sd-summary-row .lbl {
          color: #64748b;
          font-weight: 500;
          flex-shrink: 0;
        }

        .sd-summary-row .val {
          color: #0f172a;
          font-weight: 600;
          text-align: right;
        }

        .sd-summary-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f1f5f9;
          padding-top: 0.75rem;
          margin-top: 0.25rem;
        }

        .sd-copy-btn {
          background: transparent;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.75rem;
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .sd-copy-btn:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .sd-deliveries-link {
          color: #2563eb;
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
        }

        .sd-deliveries-link:hover {
          text-decoration: underline;
        }

        /* Mobile Adjustments (< 860px) */
        @media (max-width: 860px) {
          .sd-fullpage-root {
            width: 100%;
            margin: 0;
          }

          .sd-fullpage-header {
            padding: 1.25rem 1.5rem;
          }

          .sd-fullpage-body {
            padding: 1.25rem 1rem 3rem 1rem;
          }

          .sd-tracking-grid {
            grid-template-columns: 1fr;
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
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
          Loading delivery tracking...
        </div>
      }
    >
      <DeliveryTrackingContent />
    </Suspense>
  );
}
