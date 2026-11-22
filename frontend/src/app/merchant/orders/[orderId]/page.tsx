'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Compass,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  TruckIcon,
  CreditCard,
  Info,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getOrderById, cancelCustomerOrder } from '@/api/services/orders.api';
import type { DeliveryOrder, OrderTrackingEventDto } from '@/types/order.types';

const CANCELLABLE_STATUSES = ['CREATED', 'CONFIRMED'];

function getStatusStyle(status: string): string {
  if (status === 'DELIVERED') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (['CANCELLED', 'DELIVERY_FAILED', 'RETURN_TO_SENDER', 'RETURNED_TO_SENDER'].includes(status))
    return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  if (['CREATED', 'CONFIRMED'].includes(status))
    return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs text-slate-200 font-medium text-right">{value || '—'}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#0c1829] border border-white/10 p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-4">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function MerchantOrderDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const orderId = params?.orderId as string;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DeliveryOrder>({
    queryKey: ['merchant', 'order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId && !!user?.userId,
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelCustomerOrder(orderId, cancelReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
      setShowCancelModal(false);
      setCancelReason('');
      setCancelError(null);
    },
    onError: (err: any) => {
      setCancelError(err?.message || 'Failed to cancel order. Please try again.');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <RefreshCw className="h-7 w-7 text-slate-500 mx-auto animate-spin" />
        <p className="text-sm text-slate-400 mt-3">Loading order details…</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Order Not Found</h2>
        <p className="text-sm text-slate-400">
          {(error as Error)?.message || `Could not find order "${orderId}".`}
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
          <Link href="/merchant/orders" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-slate-300 text-xs font-semibold hover:bg-white/5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const events: OrderTrackingEventDto[] = Array.isArray(order.trackingEvents) ? order.trackingEvents : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/merchant/orders"
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-white font-mono">
              {order.trackingNumber}
            </h1>
            <p className="text-xs text-slate-400">Order #{order.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusStyle(order.status)}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          <Link
            href={`/merchant/tracking?trackingNumber=${encodeURIComponent(order.trackingNumber)}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold"
          >
            <Compass className="h-3.5 w-3.5" />
            Track Parcel
          </Link>
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recipient */}
          <SectionCard title="Recipient Information" icon={User}>
            <DetailRow label="Name" value={order.dropoffContactName} />
            <DetailRow label="Phone" value={order.dropoffContactPhone} />
            {order.dropoffContactEmail && <DetailRow label="Email" value={order.dropoffContactEmail} />}
          </SectionCard>

          {/* Pickup */}
          <SectionCard title="Pickup Details" icon={MapPin}>
            <DetailRow label="Address" value={order.pickupAddress} />
            {order.pickupCity && <DetailRow label="City" value={order.pickupCity} />}
            {order.pickupPostalCode && <DetailRow label="Postal Code" value={order.pickupPostalCode} />}
            <DetailRow label="Contact Name" value={order.pickupContactName} />
            <DetailRow label="Contact Phone" value={order.pickupContactPhone} />
            <DetailRow label="Pickup Method" value={order.pickupMethod?.replace(/_/g, ' ')} />
            {order.originBranchName && <DetailRow label="Origin Branch" value={order.originBranchName} />}
          </SectionCard>

          {/* Delivery */}
          <SectionCard title="Delivery Details" icon={TruckIcon}>
            <DetailRow label="Address" value={order.dropoffAddress} />
            {order.dropoffCity && <DetailRow label="City" value={order.dropoffCity} />}
            {order.dropoffPostalCode && <DetailRow label="Postal Code" value={order.dropoffPostalCode} />}
            {order.destinationBranchName && <DetailRow label="Destination Branch" value={order.destinationBranchName} />}
            {order.deliveryInstructions && <DetailRow label="Instructions" value={order.deliveryInstructions} />}
            {order.distanceKm && <DetailRow label="Distance" value={`${order.distanceKm} km`} />}
          </SectionCard>

          {/* Parcel */}
          <SectionCard title="Parcel Details" icon={Package}>
            <DetailRow label="Description" value={order.parcelDescription} />
            <DetailRow label="Size" value={order.parcelSize} />
            <DetailRow label="Weight" value={order.weightKg ? `${order.weightKg} kg` : undefined} />
            <DetailRow label="Fragile" value={order.fragile ? 'Yes' : 'No'} />
            {order.declaredValue && <DetailRow label="Declared Value" value={`${order.currency || 'LKR'} ${order.declaredValue.toLocaleString()}`} />}
          </SectionCard>

          {/* Payment */}
          <SectionCard title="Payment" icon={CreditCard}>
            <DetailRow label="Payment Method" value={order.paymentMethod?.replace(/_/g, ' ')} />
            <DetailRow label="Delivery Fee" value={`${order.currency || 'LKR'} ${Number(order.deliveryFee ?? 0).toLocaleString()}`} />
            {order.codAmount && <DetailRow label="COD Amount" value={`${order.currency || 'LKR'} ${order.codAmount.toLocaleString()}`} />}
            <DetailRow label="Payment Status" value={order.paymentStatus?.replace(/_/g, ' ')} />
          </SectionCard>
        </div>

        {/* Right Column: Timeline + Meta */}
        <div className="space-y-5">
          {/* Order Meta */}
          <SectionCard title="Order Information" icon={Info}>
            <DetailRow label="Order ID" value={<span className="font-mono text-xs">{order.id}</span>} />
            <DetailRow label="Source" value={order.orderSourceType} />
            <DetailRow label="Created" value={formatDateTime(order.createdAt)} />
            <DetailRow label="Updated" value={formatDateTime(order.updatedAt)} />
            {order.courierName && <DetailRow label="Courier" value={order.courierName} />}
          </SectionCard>

          {/* Tracking Timeline */}
          <div className="rounded-xl bg-[#0c1829] border border-white/10 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-5">
              <Clock className="h-3.5 w-3.5" />
              Tracking Timeline
            </h3>

            {events.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-7 w-7 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No tracking events yet</p>
              </div>
            ) : (
              <ol className="relative border-l border-white/10 ml-2 space-y-5">
                {[...events].reverse().map((event, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <li key={idx} className="ml-5">
                      <span
                        className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full border ${
                          isFirst
                            ? 'bg-indigo-600 border-indigo-400'
                            : 'bg-slate-700 border-slate-600'
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
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0c1829] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20">
                  <XCircle className="h-5 w-5 text-rose-400" />
                </div>
                <h2 className="text-base font-bold text-white">Cancel Order</h2>
              </div>
              <button
                type="button"
                onClick={() => { setShowCancelModal(false); setCancelError(null); }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Are you sure you want to cancel order <strong className="text-white font-mono">{order.trackingNumber}</strong>? This action cannot be undone.
            </p>

            {cancelError && (
              <div className="mb-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
                {cancelError}
              </div>
            )}

            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Cancellation Reason (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for cancellation…"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400 resize-none"
            />

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setShowCancelModal(false); setCancelError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-slate-300 text-xs font-semibold hover:bg-white/5 cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
