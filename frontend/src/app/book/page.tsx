'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Building2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  MapPin,
  Package,
  Scale,
  Route,
  LogIn,
} from 'lucide-react';
import { getOrderQuote, createOrder, OrderApiError } from '@/api/services/orders.api';
import { getCurrentUserProfile } from '@/api/services/auth.api';
import { useBookingStore } from '@/store/booking.store';
import type { ParcelSize, PickupMethod, PaymentMethod } from '@/types/order.types';

const bookingSchema = z
  .object({
    pickupAddress: z
      .string()
      .trim()
      .min(5, 'Please enter a valid pickup address (at least 5 characters)'),
    pickupContactName: z
      .string()
      .trim()
      .min(2, 'Please enter the sender contact name'),
    pickupContactPhone: z
      .string()
      .trim()
      .min(7, 'Please enter a valid sender phone number'),
    dropoffAddress: z
      .string()
      .trim()
      .min(5, 'Please enter a valid destination address (at least 5 characters)'),
    dropoffContactName: z
      .string()
      .trim()
      .min(2, 'Please enter the recipient name'),
    dropoffContactPhone: z
      .string()
      .trim()
      .min(7, 'Please enter a valid recipient phone number'),
    parcelDescription: z
      .string()
      .trim()
      .min(2, 'Please describe the parcel contents'),
    parcelSize: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
    weightKg: z
      .number({ message: 'Please enter a valid parcel weight in kg' })
      .min(0.1, 'Parcel weight must be at least 0.1 kg')
      .max(500, 'Parcel weight cannot exceed 500 kg'),
    pickupMethod: z.enum(['COURIER_PICKUP', 'BRANCH_DROPOFF']),
    paymentMethod: z.enum(['PREPAID', 'COD']),
    codAmount: z
      .number({ message: 'Please enter a valid COD amount' })
      .min(0, 'COD amount cannot be negative'),
    paymentConfirmationToken: z.string().optional(),
    deliveryInstructions: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.paymentMethod === 'COD' && (!values.codAmount || values.codAmount <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codAmount'],
        message: 'Please enter the Cash on Delivery (COD) collection amount (> 0 LKR)',
      });
    }
  });

type BookingFormValues = z.infer<typeof bookingSchema>;

const PARCEL_SIZE_OPTIONS: {
  value: ParcelSize;
  label: string;
  hint: string;
  defaultWeight: number;
}[] = [
  { value: 'SMALL', label: 'Small', hint: 'Documents & envelopes (≤ 2 kg)', defaultWeight: 0.5 },
  { value: 'MEDIUM', label: 'Medium', hint: 'Standard shoebox parcel (≤ 10 kg)', defaultWeight: 2.0 },
  { value: 'LARGE', label: 'Large', hint: 'Carton box / electronics (≤ 25 kg)', defaultWeight: 5.0 },
  { value: 'EXTRA_LARGE', label: 'Extra Large', hint: 'Bulky freight item (> 25 kg)', defaultWeight: 12.0 },
];

export default function RequestDeliveryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { step, setStep, resetBookingUi } = useBookingStore();

  const [debouncedQuoteInputs, setDebouncedQuoteInputs] = useState<{
    pickupAddress: string;
    dropoffAddress: string;
    parcelSize: ParcelSize;
    weightKg: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      pickupAddress: '',
      pickupContactName: '',
      pickupContactPhone: '',
      dropoffAddress: '',
      dropoffContactName: '',
      dropoffContactPhone: '',
      parcelDescription: '',
      parcelSize: 'MEDIUM',
      weightKg: 2.0,
      pickupMethod: 'COURIER_PICKUP',
      paymentMethod: 'PREPAID',
      codAmount: 0,
      paymentConfirmationToken: '',
      deliveryInstructions: '',
    },
    mode: 'onTouched',
  });

  const watchedValues = watch();

  // Reset step to 1 on initial mount
  useEffect(() => {
    resetBookingUi();
  }, [resetBookingUi]);

  // Fetch authenticated user profile via TanStack Query to prefill sender details
  const { data: profile } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: getCurrentUserProfile,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (profile) {
      if (profile.name && !watchedValues.pickupContactName) {
        setValue('pickupContactName', profile.name, { shouldValidate: true });
      }
      if (profile.phone && !watchedValues.pickupContactPhone) {
        setValue('pickupContactPhone', profile.phone, { shouldValidate: true });
      }
      if (profile.address && !watchedValues.pickupAddress) {
        setValue('pickupAddress', profile.address, { shouldValidate: true });
      }
    }
  }, [profile, setValue, watchedValues.pickupContactName, watchedValues.pickupContactPhone, watchedValues.pickupAddress]);

  // Debounce quote inputs for live quotation calculation from POST /api/v1/orders/quote
  useEffect(() => {
    const pickup = watchedValues.pickupAddress?.trim() || '';
    const dropoff = watchedValues.dropoffAddress?.trim() || '';
    const weight = Number(watchedValues.weightKg);
    const size = watchedValues.parcelSize;

    if (pickup.length < 5 || dropoff.length < 5 || !weight || weight <= 0 || isNaN(weight)) {
      setDebouncedQuoteInputs(null);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuoteInputs({
        pickupAddress: pickup,
        dropoffAddress: dropoff,
        parcelSize: size,
        weightKg: weight,
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [
    watchedValues.pickupAddress,
    watchedValues.dropoffAddress,
    watchedValues.parcelSize,
    watchedValues.weightKg,
  ]);

  // Authoritative Delivery Quotation query (POST /api/v1/orders/quote)
  const {
    data: quote,
    isFetching: isLoadingQuote,
    error: quoteErrorRaw,
    refetch: refetchQuote,
  } = useQuery({
    queryKey: ['order-quote', debouncedQuoteInputs],
    queryFn: () => {
      if (!debouncedQuoteInputs) {
        throw new Error('Enter pickup and destination addresses to calculate a quote.');
      }
      return getOrderQuote(debouncedQuoteInputs);
    },
    enabled: Boolean(debouncedQuoteInputs),
    retry: false,
    staleTime: 30_000,
  });

  const quoteError = quoteErrorRaw as OrderApiError | null;

  // Order creation mutation (POST /api/v1/orders)
  const createOrderMutation = useMutation({
    mutationFn: (values: BookingFormValues) =>
      createOrder({
        orderSourceType: 'CUSTOMER',
        pickupMethod: values.pickupMethod as PickupMethod,
        paymentMethod: values.paymentMethod as PaymentMethod,
        codAmount: values.paymentMethod === 'COD' ? Number(values.codAmount) : 0,
        quoteReference: quote?.quoteReference,
        paymentConfirmationToken:
          values.paymentMethod === 'PREPAID' && values.paymentConfirmationToken?.trim()
            ? values.paymentConfirmationToken.trim()
            : undefined,
        pickupAddress: values.pickupAddress.trim(),
        pickupContactName: values.pickupContactName.trim(),
        pickupContactPhone: values.pickupContactPhone.trim(),
        dropoffAddress: values.dropoffAddress.trim(),
        dropoffContactName: values.dropoffContactName.trim(),
        dropoffContactPhone: values.dropoffContactPhone.trim(),
        parcelDescription: values.parcelDescription.trim(),
        parcelSize: values.parcelSize as ParcelSize,
        weightKg: Number(values.weightKg),
        deliveryInstructions: values.deliveryInstructions?.trim() || undefined,
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      const params = new URLSearchParams({
        trackingNumber: order.trackingNumber,
        id: String(order.id),
        fee: String(order.deliveryFee),
        currency: order.currency || 'LKR',
        status: order.statusLabel || order.status,
        pickup: order.pickupAddress,
        dropoff: order.dropoffAddress,
        originBranch: order.originBranchName || '',
        destinationBranch: order.destinationBranchName || '',
        paymentMethod: String(order.paymentMethod || watchedValues.paymentMethod),
        paymentStatus: String(order.paymentStatus || ''),
        pickupMethod: String(order.pickupMethod || watchedValues.pickupMethod),
      });
      router.push(`/book/confirmation?${params.toString()}`);
    },
  });

  const submitError = createOrderMutation.error as OrderApiError | null;

  const handleContinueToReview = async () => {
    const valid = await trigger();
    if (!valid) return;

    if (!quote && !isLoadingQuote) {
      const res = await refetchQuote();
      if (res.error) return;
    }
    if (quoteError) return;

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onConfirmSubmit = (values: BookingFormValues) => {
    createOrderMutation.mutate(values);
  };

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <button
            type="button"
            onClick={() => {
              if (step === 2) {
                setStep(1);
              } else {
                router.push('/customer/dashboard');
              }
            }}
            className="sd-back-btn"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="sd-header-title">
              {step === 1 ? 'Request a delivery' : 'Review & confirm your delivery'}
            </h1>
            <div className="sd-header-sub">
              New delivery · Step {step} of 2 · Connected to SwiftDrop Order &amp; Organization Services
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN CANVAS ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          <form onSubmit={handleSubmit(onConfirmSubmit)} noValidate>
            {/* ---------------- STEP 1: REQUEST A DELIVERY ---------------- */}
            {step === 1 && (
              <div className="sd-step1-grid">
                {/* Left Column: Addresses, Contacts, Parcel, Pickup & Payment Options */}
                <div className="sd-card-panel">
                  <div className="sd-intro-block">
                    <h2 className="sd-section-heading">Where are we delivering?</h2>
                    <p className="sd-section-subheading">
                      Enter sender, recipient, parcel, pickup, and payment details.
                    </p>
                  </div>

                  {/* Sender & Pickup Section */}
                  <div className="sd-subsection-box">
                    <div className="sd-subsection-title">
                      <MapPin size={16} color="#2563eb" />
                      <span>1. Pickup &amp; Sender Information</span>
                    </div>

                    <div className="sd-field-group">
                      <label htmlFor="pickupAddress" className="sd-field-label">
                        Pickup address *
                      </label>
                      <input
                        id="pickupAddress"
                        type="text"
                        placeholder="e.g. 120 Galle Road, Colombo 03"
                        {...register('pickupAddress')}
                        className={`sd-text-input ${errors.pickupAddress ? 'has-error' : ''}`}
                      />
                      {errors.pickupAddress && (
                        <div className="sd-error-hint">{errors.pickupAddress.message}</div>
                      )}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setValue('pickupAddress', '120 Galle Road, Colombo 03', {
                              shouldValidate: true,
                            })
                          }
                          className="sd-location-btn"
                        >
                          Colombo 03 Hub Area ↗
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setValue('pickupAddress', '45 Nawala Road, Rajagiriya', {
                              shouldValidate: true,
                            })
                          }
                          className="sd-location-btn"
                        >
                          Rajagiriya Area ↗
                        </button>
                      </div>
                    </div>

                    <div className="sd-two-col-fields">
                      <div className="sd-field-group">
                        <label htmlFor="pickupContactName" className="sd-field-label">
                          Sender name *
                        </label>
                        <input
                          id="pickupContactName"
                          type="text"
                          placeholder="Sender full name"
                          {...register('pickupContactName')}
                          className={`sd-text-input ${errors.pickupContactName ? 'has-error' : ''}`}
                        />
                        {errors.pickupContactName && (
                          <div className="sd-error-hint">{errors.pickupContactName.message}</div>
                        )}
                      </div>

                      <div className="sd-field-group">
                        <label htmlFor="pickupContactPhone" className="sd-field-label">
                          Sender phone *
                        </label>
                        <input
                          id="pickupContactPhone"
                          type="text"
                          placeholder="+94 77 123 4567"
                          {...register('pickupContactPhone')}
                          className={`sd-text-input ${errors.pickupContactPhone ? 'has-error' : ''}`}
                        />
                        {errors.pickupContactPhone && (
                          <div className="sd-error-hint">{errors.pickupContactPhone.message}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recipient & Destination Section */}
                  <div className="sd-subsection-box">
                    <div className="sd-subsection-title">
                      <MapPin size={16} color="#16a34a" />
                      <span>2. Destination &amp; Recipient Information</span>
                    </div>

                    <div className="sd-field-group">
                      <label htmlFor="dropoffAddress" className="sd-field-label">
                        Destination address *
                      </label>
                      <input
                        id="dropoffAddress"
                        type="text"
                        placeholder="e.g. 45 Peradeniya Road, Kandy"
                        {...register('dropoffAddress')}
                        className={`sd-text-input ${errors.dropoffAddress ? 'has-error' : ''}`}
                      />
                      {errors.dropoffAddress && (
                        <div className="sd-error-hint">{errors.dropoffAddress.message}</div>
                      )}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setValue('dropoffAddress', '45 Peradeniya Road, Kandy', {
                              shouldValidate: true,
                            })
                          }
                          className="sd-location-btn"
                        >
                          Kandy City ↗
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setValue('dropoffAddress', '18 Wakwella Road, Galle', {
                              shouldValidate: true,
                            })
                          }
                          className="sd-location-btn"
                        >
                          Galle Fort Area ↗
                        </button>
                      </div>
                    </div>

                    <div className="sd-two-col-fields">
                      <div className="sd-field-group">
                        <label htmlFor="dropoffContactName" className="sd-field-label">
                          Recipient name *
                        </label>
                        <input
                          id="dropoffContactName"
                          type="text"
                          placeholder="Who will receive the parcel?"
                          {...register('dropoffContactName')}
                          className={`sd-text-input ${errors.dropoffContactName ? 'has-error' : ''}`}
                        />
                        {errors.dropoffContactName && (
                          <div className="sd-error-hint">{errors.dropoffContactName.message}</div>
                        )}
                      </div>

                      <div className="sd-field-group">
                        <label htmlFor="dropoffContactPhone" className="sd-field-label">
                          Recipient phone *
                        </label>
                        <input
                          id="dropoffContactPhone"
                          type="text"
                          placeholder="+94 71 987 6543"
                          {...register('dropoffContactPhone')}
                          className={`sd-text-input ${errors.dropoffContactPhone ? 'has-error' : ''}`}
                        />
                        {errors.dropoffContactPhone && (
                          <div className="sd-error-hint">{errors.dropoffContactPhone.message}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Parcel Details Section */}
                  <div className="sd-subsection-box">
                    <div className="sd-subsection-title">
                      <Package size={16} color="#7c3aed" />
                      <span>3. Parcel Details (Size, Weight &amp; Contents)</span>
                    </div>

                    <div className="sd-field-group">
                      <label htmlFor="parcelDescription" className="sd-field-label">
                        Parcel contents description *
                      </label>
                      <input
                        id="parcelDescription"
                        type="text"
                        placeholder="e.g. Legal contracts, Laptop charger, Apparel box"
                        {...register('parcelDescription')}
                        className={`sd-text-input ${errors.parcelDescription ? 'has-error' : ''}`}
                      />
                      {errors.parcelDescription && (
                        <div className="sd-error-hint">{errors.parcelDescription.message}</div>
                      )}
                    </div>

                    <div className="sd-field-group">
                      <label className="sd-field-label">Parcel size *</label>
                      <div className="sd-parcel-grid-4">
                        {PARCEL_SIZE_OPTIONS.map((opt) => {
                          const isSelected = watchedValues.parcelSize === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setValue('parcelSize', opt.value, { shouldValidate: true });
                                setValue('weightKg', opt.defaultWeight, { shouldValidate: true });
                              }}
                              className={`sd-parcel-btn ${isSelected ? 'selected' : ''}`}
                            >
                              <div style={{ fontWeight: 700 }}>{opt.label}</div>
                              <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>
                                {opt.hint}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="sd-two-col-fields">
                      <div className="sd-field-group">
                        <label htmlFor="weightKg" className="sd-field-label">
                          Parcel weight (kg) *
                        </label>
                        <input
                          id="weightKg"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="500"
                          {...register('weightKg', { valueAsNumber: true })}
                          className={`sd-text-input ${errors.weightKg ? 'has-error' : ''}`}
                        />
                        {errors.weightKg && (
                          <div className="sd-error-hint">{errors.weightKg.message}</div>
                        )}
                      </div>

                      <div className="sd-field-group">
                        <label htmlFor="deliveryInstructions" className="sd-field-label">
                          Delivery instructions (optional)
                        </label>
                        <input
                          id="deliveryInstructions"
                          type="text"
                          placeholder="Gate code, call on arrival, fragile..."
                          {...register('deliveryInstructions')}
                          className="sd-text-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pickup Method & Payment Method Section */}
                  <div className="sd-subsection-box">
                    <div className="sd-subsection-title">
                      <Truck size={16} color="#0891b2" />
                      <span>4. Pickup Method &amp; Payment Selection</span>
                    </div>

                    <div className="sd-field-group">
                      <label className="sd-field-label">Pickup method (BD-04) *</label>
                      <div className="sd-two-col-fields">
                        <button
                          type="button"
                          onClick={() =>
                            setValue('pickupMethod', 'COURIER_PICKUP', { shouldValidate: true })
                          }
                          className={`sd-parcel-btn ${
                            watchedValues.pickupMethod === 'COURIER_PICKUP' ? 'selected' : ''
                          }`}
                        >
                          <div style={{ fontWeight: 700 }}>Courier Pickup</div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '2px' }}>
                            Courier collects from your pickup address
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setValue('pickupMethod', 'BRANCH_DROPOFF', { shouldValidate: true })
                          }
                          className={`sd-parcel-btn ${
                            watchedValues.pickupMethod === 'BRANCH_DROPOFF' ? 'selected' : ''
                          }`}
                        >
                          <div style={{ fontWeight: 700 }}>Branch Drop-Off</div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '2px' }}>
                            Drop off parcel directly at origin branch
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="sd-field-group">
                      <label className="sd-field-label">Payment method (BD-01) *</label>
                      <div className="sd-two-col-fields">
                        <button
                          type="button"
                          onClick={() => {
                            setValue('paymentMethod', 'PREPAID', { shouldValidate: true });
                            setValue('codAmount', 0, { shouldValidate: true });
                          }}
                          className={`sd-parcel-btn ${
                            watchedValues.paymentMethod === 'PREPAID' ? 'selected' : ''
                          }`}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                            <CreditCard size={15} /> Prepaid Online
                          </div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '2px' }}>
                            Sender pays delivery charge upfront
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setValue('paymentMethod', 'COD', { shouldValidate: true })
                          }
                          className={`sd-parcel-btn ${
                            watchedValues.paymentMethod === 'COD' ? 'selected' : ''
                          }`}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                            <Banknote size={15} /> Cash on Delivery (COD)
                          </div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '2px' }}>
                            Courier collects payment upon delivery
                          </div>
                        </button>
                      </div>
                    </div>

                    {watchedValues.paymentMethod === 'COD' && (
                      <div className="sd-field-group">
                        <label htmlFor="codAmount" className="sd-field-label">
                          COD collection amount from recipient (LKR) *
                        </label>
                        <input
                          id="codAmount"
                          type="number"
                          step="50"
                          min="1"
                          placeholder="e.g. 4500.00"
                          {...register('codAmount', { valueAsNumber: true })}
                          className={`sd-text-input ${errors.codAmount ? 'has-error' : ''}`}
                        />
                        {errors.codAmount && (
                          <div className="sd-error-hint">{errors.codAmount.message}</div>
                        )}
                      </div>
                    )}

                    {watchedValues.paymentMethod === 'PREPAID' && (
                      <div className="sd-field-group">
                        <label htmlFor="paymentConfirmationToken" className="sd-field-label">
                          Verified payment reference token (optional)
                        </label>
                        <input
                          id="paymentConfirmationToken"
                          type="text"
                          placeholder="e.g. PAY-VERIFIED-1001 (leave blank to pay later)"
                          {...register('paymentConfirmationToken')}
                          className="sd-text-input"
                        />
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Without a verified token (`PAY-*` / `TXN-*`), the order is created as{' '}
                          <strong>PENDING_PAYMENT</strong> and can be confirmed afterwards.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Resolved Origin/Destination Branches & Live Quotation Card */}
                <div className="sd-card-panel">
                  <div className="sd-field-group">
                    <div className="sd-branch-header-title">
                      Authoritative Route &amp; Branch Resolution
                    </div>
                    <div className="sd-branch-sub">
                      Resolved live from Organization Service (`POST /api/v1/orders/quote`).
                    </div>

                    {/* Quotation Error Alert (e.g. 422 No Branch Coverage) */}
                    {quoteError && (
                      <div className="sd-screenshot-error" style={{ marginBottom: '0.75rem' }}>
                        <AlertCircle size={18} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {quoteError.status === 422
                              ? `No Branch Coverage (${quoteError.locationType || 'ROUTE'})`
                              : 'Quotation Error'}
                          </div>
                          <div>{quoteError.message}</div>
                        </div>
                      </div>
                    )}

                    {/* Resolved Origin & Destination Branch Cards */}
                    <div className="sd-branch-list">
                      <div className={`sd-branch-card ${quote?.originBranch ? 'selected' : ''}`}>
                        <div className="sd-branch-left">
                          <div className={`sd-branch-icon ${quote?.originBranch ? 'selected' : ''}`}>
                            <Building2 size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                              Origin Pickup Branch
                            </div>
                            <div className="sd-branch-name">
                              {isLoadingQuote
                                ? 'Resolving nearest origin branch...'
                                : quote?.originBranch?.branchName || 'Enter pickup address to resolve'}
                            </div>
                            <div className="sd-branch-addr">
                              {quote?.originBranch
                                ? `Code: ${quote.originBranch.branchCode}${
                                    quote.originBranch.distanceKm !== undefined
                                      ? ` · ${quote.originBranch.distanceKm} km from pickup`
                                      : ''
                                  }`
                                : 'Validated against active branch service radius'}
                            </div>
                          </div>
                        </div>
                        {quote?.originBranch?.eligible && (
                          <div className="sd-branch-check">
                            <Check size={18} color="#16a34a" strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <div className={`sd-branch-card ${quote?.destinationBranch ? 'selected' : ''}`}>
                        <div className="sd-branch-left">
                          <div className={`sd-branch-icon ${quote?.destinationBranch ? 'selected' : ''}`}>
                            <Building2 size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                              Destination Delivery Branch
                            </div>
                            <div className="sd-branch-name">
                              {isLoadingQuote
                                ? 'Resolving nearest destination branch...'
                                : quote?.destinationBranch?.branchName || 'Enter destination address to resolve'}
                            </div>
                            <div className="sd-branch-addr">
                              {quote?.destinationBranch
                                ? `Code: ${quote.destinationBranch.branchCode}${
                                    quote.destinationBranch.distanceKm !== undefined
                                      ? ` · ${quote.destinationBranch.distanceKm} km from recipient`
                                      : ''
                                  }`
                                : 'Validated against active branch service radius'}
                            </div>
                          </div>
                        </div>
                        {quote?.destinationBranch?.eligible && (
                          <div className="sd-branch-check">
                            <Check size={18} color="#16a34a" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quotation Breakdown Summary */}
                  <div className="sd-quote-breakdown-box">
                    <div className="sd-quote-meta-row">
                      <span>
                        <Route size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        Estimated Distance:
                      </span>
                      <strong>
                        {quote?.estimatedDistanceKm !== undefined
                          ? `${Number(quote.estimatedDistanceKm).toFixed(2)} km`
                          : '—'}
                      </strong>
                    </div>
                    <div className="sd-quote-meta-row">
                      <span>
                        <Scale size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        Parcel Size &amp; Weight:
                      </span>
                      <strong>
                        {watchedValues.parcelSize} · {watchedValues.weightKg || 0} kg
                      </strong>
                    </div>
                    <div className="sd-quote-meta-row">
                      <span>Selected Pickup Method:</span>
                      <strong>
                        {watchedValues.pickupMethod === 'BRANCH_DROPOFF'
                          ? 'Branch Drop-Off'
                          : 'Courier Pickup'}
                      </strong>
                    </div>
                    <div className="sd-quote-meta-row">
                      <span>Selected Payment Method:</span>
                      <strong>
                        {watchedValues.paymentMethod === 'COD'
                          ? `Cash on Delivery (COD: LKR ${Number(watchedValues.codAmount || 0).toFixed(2)})`
                          : 'Prepaid Online'}
                      </strong>
                    </div>

                    {quote?.breakdown && (
                      <>
                        <div className="sd-review-divider" />
                        <div className="sd-quote-meta-row">
                          <span>Base Fee:</span>
                          <span>
                            {quote.currency} {Number(quote.breakdown.baseFee || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="sd-quote-meta-row">
                          <span>Distance Charge:</span>
                          <span>
                            {quote.currency} {Number(quote.breakdown.distanceFee || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="sd-quote-meta-row">
                          <span>Weight Charge:</span>
                          <span>
                            {quote.currency} {Number(quote.breakdown.weightFee || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="sd-quote-meta-row">
                          <span>Size Surcharge ({watchedValues.parcelSize}):</span>
                          <span>
                            {quote.currency} {Number(quote.breakdown.sizeSurcharge || 0).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Pricing & CTA Box */}
                  <div className="sd-price-box">
                    <div className="sd-fee-row">
                      <span className="sd-fee-label">Estimated delivery charge</span>
                      <span className="sd-fee-amount">
                        {isLoadingQuote ? (
                          <span style={{ fontSize: '0.95rem', color: '#64748b' }}>
                            <Loader2 size={15} className="animate-spin" style={{ display: 'inline', marginRight: '4px' }} />
                            Calculating...
                          </span>
                        ) : quote ? (
                          `${quote.currency || 'LKR'} ${Number(quote.estimatedFee).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        ) : (
                          'Enter route details'
                        )}
                      </span>
                    </div>

                    {quote?.provisionalPricing && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Quote Ref: <code>{quote.quoteReference}</code> · Configurable Order Service rate
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleContinueToReview}
                      disabled={isLoadingQuote || Boolean(quoteError)}
                      className="sd-submit-btn"
                    >
                      Continue to review →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- STEP 2: REVIEW & CONFIRM ---------------- */}
            {step === 2 && (
              <div className="sd-step2-layout">
                <div className="sd-intro-block" style={{ marginBottom: '1.25rem' }}>
                  <h2 className="sd-section-heading">Review your delivery</h2>
                  <p className="sd-section-subheading">
                    Confirm your booking details and submit to the SwiftDrop Order Service (`POST /api/v1/orders`).
                  </p>
                </div>

                {/* Submission Error Alert (401, 422, 400, 503) */}
                {submitError && (
                  <div className="sd-screenshot-error">
                    <AlertCircle size={18} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                        {submitError.status === 401
                          ? 'Authentication Required'
                          : submitError.status === 422
                          ? 'Branch Coverage Validation Failed'
                          : 'Order Creation Failed'}
                      </div>
                      <div>{submitError.message}</div>
                      {submitError.status === 401 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <Link
                            href="/login?callbackUrl=/book"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#be123c',
                              color: '#ffffff',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <LogIn size={13} /> Sign in to complete booking
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2-Column Review Grid */}
                <div className="sd-review-grid">
                  {/* Left Card: Summary Details */}
                  <div className="sd-review-summary-card">
                    <div className="sd-review-row">
                      <span className="sd-review-label">Sender &amp; Pickup:</span>
                      <span className="sd-review-value">
                        {watchedValues.pickupContactName} ({watchedValues.pickupContactPhone}) ·{' '}
                        {watchedValues.pickupAddress}
                      </span>
                    </div>
                    <div className="sd-review-row">
                      <span className="sd-review-label">Recipient &amp; Destination:</span>
                      <span className="sd-review-value">
                        {watchedValues.dropoffContactName} ({watchedValues.dropoffContactPhone}) ·{' '}
                        {watchedValues.dropoffAddress}
                      </span>
                    </div>
                    <div className="sd-review-row">
                      <span className="sd-review-label">Origin Branch:</span>
                      <span className="sd-review-value">
                        {quote?.originBranch?.branchName || 'Resolved on submission'} (
                        {quote?.originBranch?.branchCode || '—'})
                      </span>
                    </div>
                    <div className="sd-review-row">
                      <span className="sd-review-label">Destination Branch:</span>
                      <span className="sd-review-value">
                        {quote?.destinationBranch?.branchName || 'Resolved on submission'} (
                        {quote?.destinationBranch?.branchCode || '—'})
                      </span>
                    </div>
                    <div className="sd-review-row">
                      <span className="sd-review-label">Route Distance:</span>
                      <span className="sd-review-value">
                        {quote?.estimatedDistanceKm !== undefined
                          ? `${Number(quote.estimatedDistanceKm).toFixed(2)} km`
                          : '—'}
                      </span>
                    </div>
                    <div className="sd-review-row">
                      <span className="sd-review-label">Parcel Details:</span>
                      <span className="sd-review-value">
                        {watchedValues.parcelDescription} · {watchedValues.parcelSize} (
                        {watchedValues.weightKg} kg)
                      </span>
                    </div>
                    <div className="sd-review-row">
                      <span className="sd-review-label">Pickup Method:</span>
                      <span className="sd-review-value">
                        {watchedValues.pickupMethod === 'BRANCH_DROPOFF'
                          ? 'Branch Drop-Off at Origin Branch'
                          : 'Courier Pickup from Sender'}
                      </span>
                    </div>
                    <div className="sd-review-row">
                      <span className="sd-review-label">Payment Method:</span>
                      <span className="sd-review-value">
                        {watchedValues.paymentMethod === 'COD'
                          ? `Cash on Delivery (COD Collection: LKR ${Number(
                              watchedValues.codAmount || 0
                            ).toFixed(2)})`
                          : 'Prepaid Online'}
                      </span>
                    </div>
                    <div className="sd-review-divider" />
                    <div className="sd-review-row total">
                      <span className="sd-review-total-label">Estimated Delivery Charge:</span>
                      <span className="sd-review-total-amount">
                        {quote?.currency || 'LKR'}{' '}
                        {Number(quote?.estimatedFee || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="sd-review-actions-panel">
                    <div className="sd-verification-note">
                      <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                      <span>
                        Authoritative quote &amp; branch route verified by SwiftDrop Order Service.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={createOrderMutation.isPending}
                      className="sd-submit-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {createOrderMutation.isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Creating Order...
                        </>
                      ) : (
                        <>Confirm booking &amp; create order →</>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={createOrderMutation.isPending}
                      className="sd-secondary-btn"
                    >
                      ← Back to edit details
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      <style jsx global>{`
        .sd-fullpage-root {
          width: 100%;
          min-height: 100vh;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
        }
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
          gap: 1.25rem;
          max-width: 1200px;
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
        }
        .sd-header-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        .sd-header-sub {
          font-size: 0.78rem;
          color: #8fa3bf;
          margin-top: 3px;
        }
        .sd-fullpage-body {
          flex: 1;
          padding: 2rem 2.5rem 4rem 2.5rem;
          background: #f4f7fb;
          width: 100%;
        }
        .sd-content-wrapper {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .sd-step1-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 2rem;
          align-items: flex-start;
        }
        .sd-card-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.85rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .sd-subsection-box {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .sd-subsection-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }
        .sd-two-col-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        .sd-section-heading {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .sd-section-subheading {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
        }
        .sd-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .sd-field-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #1e293b;
        }
        .sd-text-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0.72rem 0.95rem;
          font-size: 0.88rem;
          color: #0f172a;
          outline: none;
        }
        .sd-text-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .sd-text-input.has-error {
          border-color: #ef4444;
          background: #fef2f2;
        }
        .sd-error-hint {
          font-size: 0.75rem;
          color: #dc2626;
          font-weight: 500;
        }
        .sd-location-btn {
          background: transparent;
          border: none;
          color: #2563eb;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0.1rem 0;
        }
        .sd-parcel-grid-4 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
        }
        .sd-parcel-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.82rem;
          border-radius: 10px;
          padding: 0.7rem 0.65rem;
          cursor: pointer;
          text-align: left;
        }
        .sd-parcel-btn.selected {
          background: #e0ecfe;
          border: 1.5px solid #2563eb;
          color: #1d4ed8;
        }
        .sd-branch-header-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }
        .sd-branch-sub {
          font-size: 0.775rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        .sd-branch-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .sd-branch-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.9rem 1.1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }
        .sd-branch-card.selected {
          border: 1.5px solid #2563eb;
          background: #ffffff;
        }
        .sd-branch-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .sd-branch-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #e2e8f0;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sd-branch-icon.selected {
          background: #e0ecfe;
          color: #2563eb;
        }
        .sd-branch-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
        }
        .sd-branch-addr {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }
        .sd-quote-breakdown-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.82rem;
          color: #334155;
        }
        .sd-quote-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sd-price-box {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
        }
        .sd-fee-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sd-fee-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
        }
        .sd-fee-amount {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
        }
        .sd-submit-btn {
          width: 100%;
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 11px;
          padding: 0.9rem;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
        }
        .sd-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .sd-screenshot-error {
          background: #fef2f2;
          border: 1px solid #fecdd3;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          color: #be123c;
          font-size: 0.84rem;
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin-bottom: 1.25rem;
        }
        .sd-review-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 2rem;
          align-items: flex-start;
        }
        .sd-review-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .sd-review-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          font-size: 0.88rem;
        }
        .sd-review-label {
          color: #64748b;
          font-weight: 500;
        }
        .sd-review-value {
          color: #0f172a;
          font-weight: 600;
          text-align: right;
        }
        .sd-review-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 0.35rem 0;
        }
        .sd-review-total-label {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
        }
        .sd-review-total-amount {
          font-size: 1.4rem;
          font-weight: 800;
          color: #16a34a;
        }
        .sd-review-actions-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .sd-verification-note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #16a34a;
          font-weight: 600;
        }
        .sd-secondary-btn {
          width: 100%;
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 0.85rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
        }
        @media (max-width: 992px) {
          .sd-step1-grid,
          .sd-review-grid,
          .sd-two-col-fields,
          .sd-parcel-grid-4 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
