'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  Check,
  AlertCircle,
  Loader2,
  Package,
  Copy,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { getPublicTracking, OrderApiError } from '@/api/services/orders.api';
import { useBookingStore } from '@/store/booking.store';

const trackingSearchSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .min(3, 'Please enter a valid tracking number (e.g. SD-10518)'),
});

type TrackingSearchForm = z.infer<typeof trackingSearchSchema>;

function DeliveryTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialNumber = (searchParams.get('number') || searchParams.get('trackingNumber') || '').trim();

  const [currentTrackingNumber, setCurrentTrackingNumber] = useState<string>(initialNumber);
  const [copied, setCopied] = useState<boolean>(false);
  const { recentTrackingSearches, addRecentTrackingSearch } = useBookingStore();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TrackingSearchForm>({
    resolver: zodResolver(trackingSearchSchema),
    defaultValues: {
      trackingNumber: initialNumber,
    },
  });

  useEffect(() => {
    if (initialNumber) {
      setValue('trackingNumber', initialNumber);
      setCurrentTrackingNumber(initialNumber);
    }
  }, [initialNumber, setValue]);

  const {
    data: trackingData,
    isFetching: isLoading,
    error: errorRaw,
    refetch,
  } = useQuery({
    queryKey: ['public-tracking', currentTrackingNumber],
    queryFn: async () => {
      const res = await getPublicTracking(currentTrackingNumber);
      addRecentTrackingSearch(res.trackingNumber);
      return res;
    },
    enabled: Boolean(currentTrackingNumber),
    retry: false,
  });

  const errorObj = errorRaw as OrderApiError | null;
  const error = errorObj?.message || null;

  const onSearchSubmit = (values: TrackingSearchForm) => {
    const clean = values.trackingNumber.trim().toUpperCase();
    setCurrentTrackingNumber(clean);
    router.replace(`/tracking?trackingNumber=${encodeURIComponent(clean)}`);
  };

  const handleCopy = () => {
    if (trackingData?.trackingNumber) {
      navigator.clipboard.writeText(trackingData.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const originBranch = trackingData?.branch || 'Origin Dispatch Branch';
  const destinationBranch = trackingData?.destinationBranch || 'Destination Hub';
  const distance = trackingData?.distanceKm ?? 0;

  const statusCode = (trackingData?.status || '').toUpperCase();
  const statusLabel = trackingData?.statusLabel || trackingData?.status || 'In Progress';
  const isDelivered = statusCode === 'DELIVERED';
  const isCreated = statusCode === 'CREATED' || statusCode === 'CONFIRMED';

  const formatEventTime = (ts?: string) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

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
                {currentTrackingNumber ? `Tracking ${currentTrackingNumber}` : 'Public Parcel Tracking Portal'}
              </div>
            </div>
          </div>

          {/* Quick Header Search */}
          <div className="sd-header-search-wrap">
            <form onSubmit={handleSubmit(onSearchSubmit)} className="sd-hdr-search-form" noValidate>
              <Search size={14} color="#8fa3bf" />
              <input
                type="text"
                placeholder="Enter SD-XXXXX..."
                {...register('trackingNumber')}
                className="sd-hdr-search-inp"
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
          {errors.trackingNumber && (
            <div className="sd-error-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <div className="sd-error-sub" style={{ margin: 0 }}>{errors.trackingNumber.message}</div>
            </div>
          )}

          {/* EMPTY PROMPT WHEN NO TRACKING NUMBER SPECIFIED */}
          {!currentTrackingNumber && !isLoading && (
            <div className="sd-white-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
              <Package size={38} color="#2563eb" style={{ margin: '0 auto 0.75rem auto' }} />
              <h2 className="sd-hero-title" style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>
                Track a SwiftDrop Parcel
              </h2>
              <p className="sd-hero-sub" style={{ marginBottom: '1.25rem' }}>
                Enter your tracking number (e.g. <code>SD-XXXXX</code>) above to view live parcel status and public milestone history.
              </p>
              {recentTrackingSearches.length > 0 && (
                <div className="sd-quick-badges-row" style={{ justifyContent: 'center' }}>
                  <span className="sd-quick-lbl">Recent lookups:</span>
                  {recentTrackingSearches.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setValue('trackingNumber', num);
                        setCurrentTrackingNumber(num);
                      }}
                      className="sd-quick-pill"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && (
            <div className="sd-loading-card">
              <Loader2 size={32} color="#2563eb" className="animate-spin" />
              <div className="sd-loading-title">Looking up parcel {currentTrackingNumber}...</div>
              <p className="sd-loading-sub">Querying SwiftDrop Order Service public tracking endpoint</p>
            </div>
          )}

          {/* ERROR STATE (404 Tracking Not Found or Service Error) */}
          {!isLoading && error && (
            <div className="sd-error-card">
              <AlertCircle size={28} color="#dc2626" />
              <div className="sd-error-title">
                {errorObj?.status === 404 ? 'Tracking Record Not Found' : 'Tracking Lookup Failed'}
              </div>
              <p className="sd-error-sub">{error}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="sd-retry-btn"
              >
                Retry Lookup
              </button>
            </div>
          )}

          {/* ---------------- BALANCED 2-COLUMN DESKTOP / 1-COLUMN MOBILE LAYOUT ---------------- */}
          {!isLoading && !error && trackingData && (
            <div className="sd-tracking-grid">
              {/* LEFT COLUMN: STATUS HERO, ROUTE MAP & SAFE NETWORK SUMMARY */}
              <div className="sd-tracking-left-col">
                <div className="sd-status-hero">
                  <div>
                    {isDelivered ? (
                      <span className="sd-badge-success">{statusLabel}</span>
                    ) : isCreated ? (
                      <span className="sd-badge-pending">{statusLabel}</span>
                    ) : (
                      <span className="sd-badge-assigned">{statusLabel}</span>
                    )}
                  </div>

                  <h2 className="sd-hero-title">
                    {isDelivered
                      ? 'Your parcel has been delivered'
                      : isCreated
                      ? 'Order registered with SwiftDrop'
                      : `Parcel status: ${statusLabel}`}
                  </h2>

                  <p className="sd-hero-sub">
                    Route managed from <strong>{originBranch}</strong> to <strong>{destinationBranch}</strong>.
                  </p>
                </div>

                {/* Live Route Map Graphic */}
                <div className="sd-map-card">
                  <div className="sd-map-grid-bg" />
                  <svg className="sd-map-svg" viewBox="0 0 400 180" preserveAspectRatio="none">
                    <path
                      d="M 60,65 Q 150,40 200,90 T 320,125"
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                    />
                  </svg>
                  <div className="sd-map-marker marker-p" title="Origin">
                    <span>O</span>
                  </div>
                  <div className="sd-map-marker marker-courier" title="Parcel Status">
                    <div className="sd-courier-pulse" />
                    <div className="sd-courier-core" />
                  </div>
                  <div className="sd-map-marker marker-d" title="Destination">
                    <span>D</span>
                  </div>
                  <div className="sd-map-distance-tag">
                    Estimated route distance · {Number(distance).toFixed(2)} km
                  </div>
                </div>

                {/* Safe Network Dispatch Card (No private phone numbers or emails exposed) */}
                <div className="sd-courier-card">
                  <div className="sd-courier-top-row">
                    <div className="sd-courier-left">
                      <div className="sd-courier-avatar">
                        <Truck size={20} />
                      </div>
                      <div>
                        <div className="sd-courier-name">{originBranch}</div>
                        <div className="sd-courier-verified">
                          Destination Hub: {destinationBranch}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                      <ShieldCheck size={14} /> Privacy Protected
                    </div>
                  </div>

                  <div className="sd-courier-bottom-row">
                    <span className="sd-eta-label">Estimated delivery</span>
                    <span className="sd-eta-time">{trackingData.estimatedDelivery || 'Within 24 hours'}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: PUBLIC TRACKING EVENTS TIMELINE & SHIPMENT SUMMARY */}
              <div className="sd-tracking-right-col">
                <div className="sd-white-panel sd-progress-panel">
                  <h3 className="sd-progress-heading">Public Tracking Event Timeline</h3>

                  {trackingData.events && trackingData.events.length > 0 ? (
                    <div className="sd-stepper-list">
                      {trackingData.events.map((ev, idx) => {
                        const isLast = idx === trackingData.events!.length - 1;
                        return (
                          <div key={`${ev.status}-${idx}`} className="sd-step-item">
                            <div className="sd-step-indicator completed">
                              <Check size={13} strokeWidth={3} />
                              {!isLast && <div className="sd-step-line solid" />}
                            </div>
                            <div className="sd-step-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>
                                <span className="sd-step-name">{ev.statusLabel || ev.status}</span>
                                <span className="sd-step-time">{formatEventTime(ev.timestamp)}</span>
                              </div>
                              {ev.location && (
                                <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                                  {ev.location}
                                </span>
                              )}
                              {ev.description && (
                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                  {ev.description}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Current Status: <strong>{statusLabel}</strong>
                    </div>
                  )}
                </div>

                {/* Shipment Details Summary Box */}
                <div className="sd-white-panel sd-shipment-details-card">
                  <div className="sd-shipment-header">
                    <Package size={17} color="#2563eb" />
                    <span>Public Shipment Summary</span>
                  </div>

                  <div className="sd-shipment-rows">
                    <div className="sd-shipment-row">
                      <span className="lbl">Tracking Number:</span>
                      <span className="val bold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {trackingData.trackingNumber}
                        <button type="button" onClick={handleCopy} className="sd-copy-mini-btn" title="Copy tracking number">
                          {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        </button>
                      </span>
                    </div>
                    <div className="sd-shipment-row">
                      <span className="lbl">Current Status:</span>
                      <span className="val bold">{statusLabel}</span>
                    </div>
                    <div className="sd-shipment-row">
                      <span className="lbl">Origin City / Hub:</span>
                      <span className="val">{trackingData.origin || originBranch}</span>
                    </div>
                    <div className="sd-shipment-row">
                      <span className="lbl">Destination City / Hub:</span>
                      <span className="val">{trackingData.destination || destinationBranch}</span>
                    </div>
                    <div className="sd-shipment-row">
                      <span className="lbl">Parcel Category:</span>
                      <span className="val">{trackingData.parcelCategory || 'Standard Parcel'}</span>
                    </div>
                    <div className="sd-shipment-row">
                      <span className="lbl">Origin Branch:</span>
                      <span className="val">{originBranch}</span>
                    </div>
                    <div className="sd-shipment-row">
                      <span className="lbl">Destination Branch:</span>
                      <span className="val">{destinationBranch}</span>
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
