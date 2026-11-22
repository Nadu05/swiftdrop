'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { getPublicTracking } from '@/api/services/orders.api';
import type { PublicTrackingResponse } from '@/types/order.types';

function getStatusStyle(status: string): string {
  if (status === 'DELIVERED') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (['CANCELLED', 'DELIVERY_FAILED', 'RETURN_TO_SENDER', 'RETURNED_TO_SENDER'].includes(status))
    return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  if (['CREATED', 'CONFIRMED'].includes(status)) return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialTracking = searchParams?.get('trackingNumber') || '';

  const [inputValue, setInputValue] = useState(initialTracking);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);

  const {
    data: tracking,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<PublicTrackingResponse>({
    queryKey: ['merchant', 'tracking', trackingNumber],
    queryFn: () => getPublicTracking(trackingNumber),
    enabled: !!trackingNumber.trim(),
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim().toUpperCase();
    if (trimmed) setTrackingNumber(trimmed);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
          <Compass className="h-4 w-4" />
          <span>Live Parcel Tracking</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Track Your Parcel</h1>
        <p className="text-sm text-slate-400 mt-1">
          Enter a tracking number to view real-time delivery status and milestone events.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            placeholder="Enter tracking number (e.g. SD-10518)"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0c1829] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading || isFetching}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
        >
          {isLoading || isFetching ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4" />
              Track
            </>
          )}
        </button>
      </form>

      {/* No Query Yet */}
      {!trackingNumber && (
        <div className="rounded-xl bg-[#0c1829] border border-white/10 p-12 text-center space-y-3">
          <Compass className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-white">Enter a Tracking Number</p>
          <p className="text-xs text-slate-400">
            Use the search above to track any SwiftDrop parcel using its tracking number.
          </p>
        </div>
      )}

      {/* Loading */}
      {trackingNumber && (isLoading || isFetching) && (
        <div className="rounded-xl bg-[#0c1829] border border-white/10 p-10 text-center">
          <RefreshCw className="h-6 w-6 text-slate-500 mx-auto animate-spin" />
          <p className="text-xs text-slate-400 mt-3">Fetching tracking data for {trackingNumber}…</p>
        </div>
      )}

      {/* Error */}
      {isError && !isFetching && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Tracking Not Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {(error as Error)?.message || `No parcel found with tracking number "${trackingNumber}".`}
            </p>
          </div>
        </div>
      )}

      {/* Tracking Result */}
      {tracking && !isFetching && (
        <div className="space-y-4">
          {/* Status Header Card */}
          <div className="rounded-xl bg-[#0c1829] border border-white/10 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Tracking Number</p>
                <p className="text-xl font-extrabold text-white font-mono">{tracking.trackingNumber}</p>
                {tracking.parcelCategory && (
                  <p className="text-xs text-slate-400 mt-1">{tracking.parcelCategory}</p>
                )}
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusStyle(tracking.status)}`}>
                  {tracking.statusLabel || tracking.status.replace(/_/g, ' ')}
                </span>
                {tracking.updatedAt && (
                  <p className="text-[11px] text-slate-500">Updated: {formatDateTime(tracking.updatedAt)}</p>
                )}
              </div>
            </div>

            {/* Route Info */}
            {(tracking.origin || tracking.destination) && (
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                {tracking.origin && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-indigo-400" />
                    {tracking.origin}
                  </span>
                )}
                {tracking.origin && tracking.destination && (
                  <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                )}
                {tracking.destination && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    {tracking.destination}
                  </span>
                )}
                {tracking.distanceKm && (
                  <span className="ml-auto text-slate-500">{tracking.distanceKm} km</span>
                )}
              </div>
            )}

            {tracking.estimatedDelivery && (
              <div className="mt-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-indigo-300 font-semibold">Estimated Delivery:</span>
                <span className="text-slate-300">{tracking.estimatedDelivery}</span>
              </div>
            )}
          </div>

          {/* Tracking Timeline */}
          {Array.isArray(tracking.events) && tracking.events.length > 0 && (
            <div className="rounded-xl bg-[#0c1829] border border-white/10 p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-5">
                <Clock className="h-3.5 w-3.5" />
                Delivery Timeline
              </h2>
              <ol className="relative border-l border-white/10 ml-2 space-y-5">
                {[...tracking.events].reverse().map((event, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <li key={idx} className="ml-5">
                      <span
                        className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full border ${
                          isFirst ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-700 border-slate-600'
                        }`}
                      >
                        {isFirst ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        )}
                      </span>
                      <div>
                        <p className={`text-xs font-bold ${isFirst ? 'text-indigo-300' : 'text-slate-300'}`}>
                          {event.statusLabel || event.status.replace(/_/g, ' ')}
                        </p>
                        {event.location && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{event.description}</p>
                        )}
                        {event.timestamp && (
                          <p className="text-[11px] text-slate-600 mt-1">{formatDateTime(event.timestamp)}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {(!tracking.events || tracking.events.length === 0) && (
            <div className="rounded-xl bg-[#0c1829] border border-white/10 p-8 text-center space-y-2">
              <Package className="h-7 w-7 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">No tracking events available yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MerchantTrackingPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto py-16 text-center">
        <RefreshCw className="h-6 w-6 text-slate-500 mx-auto animate-spin" />
      </div>
    }>
      <TrackingContent />
    </Suspense>
  );
}
