'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  PlusCircle,
  Package,
  CheckCircle2,
  AlertTriangle,
  Compass,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { createOrder } from '@/api/services/orders.api';
import { fetchMyMerchantApplications } from '@/api/services/organization.api';
import type { CreateOrderRequest, CreateOrderResponse } from '@/types/order.types';
import type { MerchantApplicationResponse } from '@/types/organization.types';

const orderSchema = z.object({
  // Recipient
  dropoffContactName: z.string().min(2, 'Recipient name is required'),
  dropoffContactPhone: z.string().min(9, 'Recipient phone is required'),
  dropoffContactEmail: z.string().email().optional().or(z.literal('')),

  // Pickup
  pickupAddress: z.string().min(5, 'Pickup address is required'),
  pickupCity: z.string().min(2, 'Pickup city is required'),
  pickupPostalCode: z.string().optional(),
  pickupContactName: z.string().min(2, 'Pickup contact name is required'),
  pickupContactPhone: z.string().min(9, 'Pickup contact phone is required'),

  // Delivery
  dropoffAddress: z.string().min(5, 'Delivery address is required'),
  dropoffCity: z.string().min(2, 'Delivery city is required'),
  dropoffPostalCode: z.string().optional(),
  deliveryInstructions: z.string().optional(),

  // Parcel
  parcelDescription: z.string().min(2, 'Parcel description is required'),
  parcelSize: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
  weightKg: z.number().min(0.1, 'Weight must be at least 0.1 kg').max(100),
  fragile: z.boolean().optional(),

  // Payment
  paymentMethod: z.enum(['COD', 'PREPAID']),
  codAmount: z.number().min(0).optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function MerchantCreateOrderPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [successOrder, setSuccessOrder] = useState<CreateOrderResponse | null>(null);

  const { data: applications = [], isLoading: appsLoading } = useQuery<MerchantApplicationResponse[]>({
    queryKey: ['merchant', 'applications', 'my', user?.userId],
    queryFn: fetchMyMerchantApplications,
    enabled: !!user?.userId,
    retry: false,
  });

  const isApproved = applications.some((a) => a.status === 'APPROVED');
  const latestApp = applications[0] || null;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      parcelSize: 'MEDIUM',
      paymentMethod: 'COD',
      fragile: false,
      weightKg: 1,
    },
  });

  const paymentMethod = watch('paymentMethod');

  const createMutation = useMutation({
    mutationFn: (payload: CreateOrderRequest) => createOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
      setSuccessOrder(data);
      reset();
    },
  });

  const onSubmit = (values: OrderFormValues) => {
    const payload: CreateOrderRequest = {
      orderSourceType: 'MERCHANT',
      pickupMethod: 'COURIER_PICKUP',
      paymentMethod: values.paymentMethod,
      codAmount: values.paymentMethod === 'COD' ? values.codAmount : undefined,
      pickupAddress: values.pickupAddress,
      pickupCity: values.pickupCity,
      pickupPostalCode: values.pickupPostalCode || '00000',
      pickupContactName: values.pickupContactName,
      pickupContactPhone: values.pickupContactPhone,
      dropoffAddress: values.dropoffAddress,
      dropoffCity: values.dropoffCity,
      dropoffPostalCode: values.dropoffPostalCode || '00000',
      dropoffContactName: values.dropoffContactName,
      dropoffContactPhone: values.dropoffContactPhone,
      dropoffContactEmail: values.dropoffContactEmail || undefined,
      parcelDescription: values.parcelDescription,
      parcelSize: values.parcelSize,
      weightKg: values.weightKg,
      fragile: values.fragile,
      deliveryInstructions: values.deliveryInstructions || undefined,
    };
    createMutation.mutate(payload);
  };

  if (appsLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <RefreshCw className="h-6 w-6 text-slate-500 mx-auto animate-spin" />
        <p className="text-xs text-slate-400 mt-3">Verifying merchant status…</p>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        <div className={`rounded-2xl border p-8 ${latestApp?.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${latestApp?.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white mb-2">Order Creation Restricted</h1>
              <p className="text-sm text-slate-300">
                {latestApp?.status === 'PENDING'
                  ? 'Your merchant application is pending approval. Order creation will be enabled once your application is approved by Head Office.'
                  : latestApp?.status === 'REJECTED'
                  ? `Your merchant application was rejected. Reason: ${latestApp.rejectionReason || 'Please contact support.'}`
                  : 'Please complete your merchant registration to create orders.'}
              </p>
              <div className="mt-4 flex gap-3">
                <Link href="/merchant/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (successOrder) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="rounded-2xl bg-[#0c1829] border border-emerald-500/25 p-8 text-center space-y-5">
          <div className="flex items-center justify-center">
            <div className="p-4 rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Order Created!</h1>
          <p className="text-sm text-slate-400">
            Your delivery order has been successfully placed with the SwiftDrop Order Service.
          </p>
          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 text-left space-y-2">
            <div>
              <span className="text-xs text-slate-500">Tracking Number</span>
              <p className="text-lg font-extrabold text-indigo-300 font-mono">{successOrder.trackingNumber}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Order ID</span>
              <p className="text-xs font-bold text-white">{successOrder.id}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Status</span>
              <p className="text-xs font-bold text-sky-400">{successOrder.status}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Delivery Fee</span>
              <p className="text-sm font-bold text-white">{successOrder.currency || 'LKR'} {Number(successOrder.deliveryFee ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={`/merchant/tracking?trackingNumber=${encodeURIComponent(successOrder.trackingNumber)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              <Compass className="h-4 w-4" />
              Track Parcel
            </Link>
            <Link
              href={`/merchant/orders/${successOrder.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-slate-200 text-xs font-semibold hover:bg-white/5"
            >
              <Package className="h-4 w-4" />
              View Order Details
            </Link>
            <button
              type="button"
              onClick={() => setSuccessOrder(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-slate-200 text-xs font-semibold hover:bg-white/5 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              Create Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/merchant/orders" className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Create Delivery Order</h1>
          <p className="text-sm text-slate-400">Submit a new merchant delivery through SwiftDrop</p>
        </div>
      </div>

      {createMutation.isError && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300">{(createMutation.error as Error)?.message || 'Failed to create order. Please try again.'}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Recipient Section */}
        <FormSection title="Recipient Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *" error={errors.dropoffContactName?.message}>
              <input {...register('dropoffContactName')} placeholder="John Doe" className={inputCls(!!errors.dropoffContactName)} />
            </Field>
            <Field label="Phone Number *" error={errors.dropoffContactPhone?.message}>
              <input {...register('dropoffContactPhone')} type="tel" placeholder="+94 77 123 4567" className={inputCls(!!errors.dropoffContactPhone)} />
            </Field>
            <Field label="Email (optional)" error={errors.dropoffContactEmail?.message} className="sm:col-span-2">
              <input {...register('dropoffContactEmail')} type="email" placeholder="recipient@example.com" className={inputCls(!!errors.dropoffContactEmail)} />
            </Field>
          </div>
        </FormSection>

        {/* Pickup Section */}
        <FormSection title="Pickup Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pickup Address *" error={errors.pickupAddress?.message} className="sm:col-span-2">
              <input {...register('pickupAddress')} placeholder="123 Main Street, Colombo 03" className={inputCls(!!errors.pickupAddress)} />
            </Field>
            <Field label="City *" error={errors.pickupCity?.message}>
              <input {...register('pickupCity')} placeholder="Colombo" className={inputCls(!!errors.pickupCity)} />
            </Field>
            <Field label="Postal Code" error={undefined}>
              <input {...register('pickupPostalCode')} placeholder="00300 (optional)" className={inputCls(false)} />
            </Field>
            <Field label="Contact Name *" error={errors.pickupContactName?.message}>
              <input {...register('pickupContactName')} placeholder="Your name or staff name" className={inputCls(!!errors.pickupContactName)} />
            </Field>
            <Field label="Contact Phone *" error={errors.pickupContactPhone?.message}>
              <input {...register('pickupContactPhone')} type="tel" placeholder="+94 11 234 5678" className={inputCls(!!errors.pickupContactPhone)} />
            </Field>
          </div>
        </FormSection>

        {/* Delivery Section */}
        <FormSection title="Delivery Address">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Delivery Address *" error={errors.dropoffAddress?.message} className="sm:col-span-2">
              <input {...register('dropoffAddress')} placeholder="456 Delivery Road, Kandy" className={inputCls(!!errors.dropoffAddress)} />
            </Field>
            <Field label="City *" error={errors.dropoffCity?.message}>
              <input {...register('dropoffCity')} placeholder="Kandy" className={inputCls(!!errors.dropoffCity)} />
            </Field>
            <Field label="Postal Code" error={undefined}>
              <input {...register('dropoffPostalCode')} placeholder="20000 (optional)" className={inputCls(false)} />
            </Field>
            <Field label="Delivery Instructions (optional)" error={undefined} className="sm:col-span-2">
              <input {...register('deliveryInstructions')} placeholder="Leave at reception, call before delivery…" className={inputCls(false)} />
            </Field>
          </div>
        </FormSection>

        {/* Parcel Section */}
        <FormSection title="Parcel Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Parcel Description *" error={errors.parcelDescription?.message} className="sm:col-span-2">
              <input {...register('parcelDescription')} placeholder="e.g. Electronics, Clothing, Documents" className={inputCls(!!errors.parcelDescription)} />
            </Field>
            <Field label="Parcel Size *" error={errors.parcelSize?.message}>
              <select {...register('parcelSize')} className={selectCls(!!errors.parcelSize)}>
                <option value="SMALL">Small (up to 1kg)</option>
                <option value="MEDIUM">Medium (1–5kg)</option>
                <option value="LARGE">Large (5–15kg)</option>
                <option value="EXTRA_LARGE">Extra Large (15kg+)</option>
              </select>
            </Field>
            <Field label="Weight (kg) *" error={errors.weightKg?.message}>
              <input {...register('weightKg', { valueAsNumber: true })} type="number" step="0.1" min="0.1" placeholder="1.5" className={inputCls(!!errors.weightKg)} />
            </Field>
            <Field label="Fragile?" error={undefined}>
              <div className="flex items-center gap-2 mt-1">
                <input {...register('fragile')} type="checkbox" id="fragile" className="w-4 h-4 rounded accent-indigo-500" />
                <label htmlFor="fragile" className="text-xs text-slate-300">Mark as fragile</label>
              </div>
            </Field>
          </div>
        </FormSection>

        {/* Payment Section */}
        <FormSection title="Payment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Payment Method *" error={errors.paymentMethod?.message}>
              <select {...register('paymentMethod')} className={selectCls(!!errors.paymentMethod)}>
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="PREPAID">Prepaid</option>
              </select>
            </Field>
            {paymentMethod === 'COD' && (
              <Field label="COD Amount (LKR)" error={errors.codAmount?.message}>
                <input {...register('codAmount', { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" className={inputCls(!!errors.codAmount)} />
              </Field>
            )}
          </div>
        </FormSection>

        {/* Submit */}
        <div className="flex gap-3">
          <Link
            href="/merchant/orders"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-slate-300 text-sm font-semibold hover:bg-white/5"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            {createMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Creating Order…
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                Create Delivery Order
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#0c1829] border border-white/10 p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, error, children, className = '' }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2.5 rounded-xl bg-slate-950 border ${
    hasError ? 'border-rose-500/50' : 'border-white/10'
  } text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400`;
}

function selectCls(hasError: boolean) {
  return `w-full px-3 py-2.5 rounded-xl bg-slate-950 border ${
    hasError ? 'border-rose-500/50' : 'border-white/10'
  } text-xs text-white focus:outline-none focus:border-indigo-400`;
}
