'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MapPin,
  Package,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  Calculator,
  Loader2,
  RotateCcw,
  Receipt,
  ShieldCheck,
  Send,
} from 'lucide-react';
import {
  bookingFormSchema,
  BookingFormValues,
  STEP_1_FIELDS,
  STEP_2_FIELDS,
  STEP_3_FIELDS,
} from '@/schema/order.schema';
import { getOrderQuote, createOrder } from '@/api/services/orders.api';
import type { OrderQuoteResponse } from '@/types/order.types';

/**
 * Member 06: Customer Booking Page
 * Multi-Step Booking Experience:
 *   Step 1: Pickup Details
 *   Step 2: Delivery Details
 *   Step 3: Parcel Details
 *   Step 4: Review Summary, Live Fee Quote (POST /api/v1/orders/quote),
 *           and Explicit Confirmation (POST /api/v1/orders)
 */
export default function CustomerBookingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // State for Quote API integration
  const [quote, setQuote] = useState<OrderQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // State for Order Creation API integration
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // React Hook Form handles all fields across all steps in one single unified state
  const {
    register,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    mode: 'onTouched', // Validate as soon as user leaves a field
    defaultValues: {
      pickupAddress: '',
      pickupContactName: '',
      pickupContactPhone: '',
      dropoffAddress: '',
      dropoffContactName: '',
      dropoffContactPhone: '',
      parcelDescription: '',
      parcelSize: 'MEDIUM',
      weightKg: 1,
      deliveryInstructions: '',
    },
  });

  // Watch current values so Step 4 (Review) can preview them live
  const formValues = watch();

  /**
   * Advance to the next step ONLY after validating current step fields.
   */
  const handleNextStep = async () => {
    let fieldsToValidate: (keyof BookingFormValues)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = STEP_1_FIELDS;
    } else if (currentStep === 2) {
      fieldsToValidate = STEP_2_FIELDS;
    } else if (currentStep === 3) {
      fieldsToValidate = STEP_3_FIELDS;
    }

    // trigger() runs Zod validation only on the current step's fields
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      // If moving into Step 4, automatically request a quote if not already fetched
      if (currentStep === 3 && !quote && !isLoadingQuote) {
        setCurrentStep(4);
        fetchQuote();
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      }
    }
  };

  /**
   * Go back to previous step without losing any data.
   */
  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  /**
   * Request authoritative fee quote from backend:
   * POST /api/v1/orders/quote
   */
  const fetchQuote = async () => {
    if (isLoadingQuote) return;

    setIsLoadingQuote(true);
    setQuoteError(null);

    const values = getValues();

    try {
      const response = await getOrderQuote({
        pickupAddress: values.pickupAddress,
        dropoffAddress: values.dropoffAddress,
        weightKg: values.weightKg,
        parcelSize: values.parcelSize,
      });
      setQuote(response);
    } catch (err: any) {
      setQuoteError(
        err.message || 'Unable to calculate delivery fee. Please check your connection and try again.'
      );
    } finally {
      setIsLoadingQuote(false);
    }
  };

  /**
   * Explicit Booking Confirmation:
   * Sends POST /api/v1/orders with all validated booking information.
   * Redirects to Confirmation Page upon receiving authoritative tracking number.
   */
  const handleConfirmBooking = async () => {
    // Prevent accidental duplicate submissions
    if (isCreatingOrder || isLoadingQuote) return;

    setIsCreatingOrder(true);
    setOrderError(null);

    const values = getValues();

    try {
      const createdOrder = await createOrder({
        pickupAddress: values.pickupAddress,
        pickupContactName: values.pickupContactName,
        pickupContactPhone: values.pickupContactPhone,
        dropoffAddress: values.dropoffAddress,
        dropoffContactName: values.dropoffContactName,
        dropoffContactPhone: values.dropoffContactPhone,
        parcelDescription: values.parcelDescription,
        parcelSize: values.parcelSize,
        weightKg: values.weightKg,
        deliveryInstructions: values.deliveryInstructions,
      });

      // Redirect to confirmation page with authoritative backend response
      const queryParams = new URLSearchParams({
        trackingNumber: createdOrder.trackingNumber || '',
        id: String(createdOrder.id || ''),
        fee: String(createdOrder.deliveryFee || quote?.estimatedFee || ''),
        currency: createdOrder.currency || quote?.currency || 'LKR',
        status: createdOrder.status || 'Created',
        pickup: createdOrder.pickupAddress || values.pickupAddress,
        dropoff: createdOrder.dropoffAddress || values.dropoffAddress,
      });

      router.push(`/book/confirmation?${queryParams.toString()}`);
    } catch (err: any) {
      setOrderError(
        err.message || 'We could not create your booking. Please check your connection and try again.'
      );
      setIsCreatingOrder(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '2rem 2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-primary">Customer Booking</span>
            <span className="badge badge-success">Member 06 Experience</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Book a New Parcel Delivery
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Complete the steps below to calculate your delivery fee and review your booking.
          </p>
        </div>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
          }}
        >
          <Truck size={28} color="#ffffff" />
        </div>
      </div>

      {/* Progress Step Indicator */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 2rem',
        }}
      >
        {[
          { step: 1, title: 'Pickup', desc: 'Sender details' },
          { step: 2, title: 'Delivery', desc: 'Recipient details' },
          { step: 3, title: 'Parcel', desc: 'Size & weight' },
          { step: 4, title: 'Review & Confirm', desc: 'Quote & confirmation' },
        ].map((item, index) => {
          const isActive = currentStep === item.step;
          const isCompleted = currentStep > item.step;

          return (
            <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: index < 3 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    background: isCompleted
                      ? '#10b981'
                      : isActive
                      ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                      : 'rgba(30, 41, 59, 0.8)',
                    color: '#ffffff',
                    border: isActive ? '2px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: isActive ? '0 0 16px rgba(59, 130, 246, 0.5)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isCompleted ? <CheckCircle2 size={18} /> : item.step}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? '#ffffff' : isCompleted ? '#34d399' : '#94a3b8' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.desc}</div>
                </div>
              </div>

              {index < 3 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    margin: '0 0.75rem',
                    background: isCompleted ? '#10b981' : 'rgba(59, 130, 246, 0.15)',
                    transition: 'all 0.3s ease',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Multi-Step Form Card */}
      <div className="glass-card" style={{ padding: '2rem 2.5rem' }}>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* STEP 1: PICKUP DETAILS */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} color="#3b82f6" />
                  Step 1: Pickup Location & Sender Information
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Where should our courier pick up this parcel?
                </p>
              </div>

              {/* Pickup Address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="pickupAddress" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Pickup Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    id="pickupAddress"
                    rows={3}
                    placeholder="e.g. No. 12, Galle Road, Colombo 03, Western Province"
                    {...register('pickupAddress')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: errors.pickupAddress ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
                {errors.pickupAddress && (
                  <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={14} />
                    {errors.pickupAddress.message}
                  </p>
                )}
              </div>

              {/* Sender Contact Name & Phone Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Contact Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="pickupContactName" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Sender Contact Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="pickupContactName"
                      type="text"
                      placeholder="e.g. Kamal Perera"
                      {...register('pickupContactName')}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: errors.pickupContactName ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  {errors.pickupContactName && (
                    <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} />
                      {errors.pickupContactName.message}
                    </p>
                  )}
                </div>

                {/* Contact Phone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="pickupContactPhone" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Sender Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="pickupContactPhone"
                      type="tel"
                      placeholder="e.g. +94771234567"
                      {...register('pickupContactPhone')}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: errors.pickupContactPhone ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  {errors.pickupContactPhone && (
                    <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} />
                      {errors.pickupContactPhone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DELIVERY / DROPOFF DETAILS */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} color="#10b981" />
                  Step 2: Delivery Destination & Recipient Information
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Who is receiving this parcel and where should it be delivered?
                </p>
              </div>

              {/* Drop-off Address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="dropoffAddress" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Delivery / Drop-off Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    id="dropoffAddress"
                    rows={3}
                    placeholder="e.g. No. 45, Peradeniya Road, Kandy, Central Province"
                    {...register('dropoffAddress')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: errors.dropoffAddress ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
                {errors.dropoffAddress && (
                  <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={14} />
                    {errors.dropoffAddress.message}
                  </p>
                )}
              </div>

              {/* Recipient Contact Name & Phone Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Recipient Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="dropoffContactName" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Recipient Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="dropoffContactName"
                      type="text"
                      placeholder="e.g. Nimal Silva"
                      {...register('dropoffContactName')}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: errors.dropoffContactName ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  {errors.dropoffContactName && (
                    <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} />
                      {errors.dropoffContactName.message}
                    </p>
                  )}
                </div>

                {/* Recipient Phone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="dropoffContactPhone" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Recipient Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="dropoffContactPhone"
                      type="tel"
                      placeholder="e.g. +94719876543"
                      {...register('dropoffContactPhone')}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: errors.dropoffContactPhone ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  {errors.dropoffContactPhone && (
                    <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} />
                      {errors.dropoffContactPhone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PARCEL DETAILS */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={20} color="#8b5cf6" />
                  Step 3: Parcel Specifications & Instructions
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Provide package dimensions, weight, and any special delivery instructions.
                </p>
              </div>

              {/* Parcel Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="parcelDescription" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Parcel Description / Contents <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="parcelDescription"
                  type="text"
                  placeholder="e.g. Electronics, Books, Garments, Medical supplies"
                  {...register('parcelDescription')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: errors.parcelDescription ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                {errors.parcelDescription && (
                  <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={14} />
                    {errors.parcelDescription.message}
                  </p>
                )}
              </div>

              {/* Size & Weight Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Parcel Size Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="parcelSize" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Parcel Size Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    id="parcelSize"
                    {...register('parcelSize')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: errors.parcelSize ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="SMALL">Small (Documents / Envelope, &lt; 1kg)</option>
                    <option value="MEDIUM">Medium (Shoebox size, 1 - 5kg)</option>
                    <option value="LARGE">Large (Carton / Box, 5 - 15kg)</option>
                    <option value="EXTRA_LARGE">Extra Large (Heavy crate / Bulk, &gt; 15kg)</option>
                  </select>
                  {errors.parcelSize && (
                    <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} />
                      {errors.parcelSize.message}
                    </p>
                  )}
                </div>

                {/* Weight in kg */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="weightKg" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Estimated Weight (in kg) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="weightKg"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      placeholder="e.g. 2.5"
                      {...register('weightKg', { valueAsNumber: true })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: errors.weightKg ? '1px solid #ef4444' : '1px solid rgba(59, 130, 246, 0.2)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  {errors.weightKg && (
                    <p role="alert" style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} />
                      {errors.weightKg.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Instructions (Optional) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="deliveryInstructions" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Delivery Instructions <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  id="deliveryInstructions"
                  rows={2}
                  placeholder="e.g. Leave package with apartment security guard, call recipient 10 minutes prior to arrival"
                  {...register('deliveryInstructions')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW DETAILS SUMMARY & LIVE FEE QUOTE */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={20} color="#38bdf8" />
                  Step 4: Review Delivery Details & Confirm Booking
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Review your information, verify your official fee quote, and explicitly confirm to create the delivery booking.
                </p>
              </div>

              {/* Summary Review Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Pickup Summary Card */}
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem' }}>
                    <MapPin size={16} /> PICKUP LOCATION
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>{formValues.pickupAddress || '—'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Contact: <strong style={{ color: '#e2e8f0' }}>{formValues.pickupContactName}</strong> ({formValues.pickupContactPhone})
                  </div>
                </div>

                {/* Dropoff Summary Card */}
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700, fontSize: '0.85rem' }}>
                    <MapPin size={16} /> DELIVERY DESTINATION
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>{formValues.dropoffAddress || '—'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Recipient: <strong style={{ color: '#e2e8f0' }}>{formValues.dropoffContactName}</strong> ({formValues.dropoffContactPhone})
                  </div>
                </div>
              </div>

              {/* Parcel Specs Summary Card */}
              <div
                style={{
                  padding: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a78bfa', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Package size={16} /> PARCEL SPECIFICATIONS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Contents: </span>
                    <strong style={{ color: '#ffffff' }}>{formValues.parcelDescription || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Size Category: </span>
                    <span className="badge badge-primary">{formValues.parcelSize}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Weight: </span>
                    <strong style={{ color: '#ffffff' }}>{formValues.weightKg} kg</strong>
                  </div>
                </div>
                {formValues.deliveryInstructions && (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Instructions: </span>
                    <em>"{formValues.deliveryInstructions}"</em>
                  </div>
                )}
              </div>

              {/* ---------------- LIVE QUOTE SECTION ---------------- */}
              {/* STATE 1: LOADING QUOTE */}
              {isLoadingQuote && (
                <div
                  style={{
                    padding: '2rem',
                    borderRadius: '14px',
                    background: 'rgba(30, 58, 138, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                  }}
                >
                  <Loader2 size={32} color="#60a5fa" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      Calculating Delivery Fee...
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Communicating with Order Service via API Gateway (POST /api/v1/orders/quote)
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 2: QUOTE ERROR */}
              {!isLoadingQuote && quoteError && (
                <div
                  style={{
                    padding: '1.5rem',
                    borderRadius: '14px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <AlertCircle size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
                        Unable to Calculate Delivery Fee
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                        {quoteError}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={fetchQuote}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <RotateCcw size={14} /> Retry Fee Calculation
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 3: SUCCESSFUL QUOTE DISPLAY */}
              {!isLoadingQuote && quote && (
                <div
                  style={{
                    padding: '1.75rem 2rem',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={20} color="#34d399" />
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                        Authoritative Delivery Quote
                      </span>
                    </div>
                    <span className="badge badge-success">Backend Verified</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Estimated Delivery Fee
                      </div>
                      <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
                        {quote.currency || 'LKR'} {Number(quote.estimatedFee).toFixed(2)}
                      </div>
                    </div>
                    {quote.estimatedDistanceKm && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Route Distance</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                          {quote.estimatedDistanceKm} km
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fee Breakdown if returned by backend */}
                  {quote.breakdown && (
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.825rem', color: '#94a3b8' }}>
                      <div>
                        Base Rate: <strong style={{ color: '#ffffff' }}>{quote.currency} {Number(quote.breakdown.baseFee).toFixed(2)}</strong>
                      </div>
                      <div>
                        Weight Rate: <strong style={{ color: '#ffffff' }}>{quote.currency} {Number(quote.breakdown.weightFee).toFixed(2)}</strong>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Pricing calculated securely by Order Service (:8083)
                    </div>
                    <button
                      type="button"
                      onClick={fetchQuote}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#60a5fa',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        textDecoration: 'underline',
                      }}
                    >
                      <RotateCcw size={12} /> Recalculate
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 4: INITIAL STATE (NOT YET REQUESTED) */}
              {!isLoadingQuote && !quote && !quoteError && (
                <div
                  style={{
                    padding: '1.5rem',
                    borderRadius: '12px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Calculator size={24} color="#60a5fa" />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        Ready to calculate delivery fee
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Click to request an authoritative quote from the Order Service backend.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchQuote}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  >
                    <Calculator size={16} /> Get Fee Estimate
                  </button>
                </div>
              )}

              {/* ORDER CREATION ERROR STATE */}
              {orderError && (
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f87171' }}>
                      Booking Creation Failed
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#e2e8f0', marginTop: '0.2rem' }}>
                      {orderError}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '2.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(59, 130, 246, 0.15)',
            }}
          >
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={isLoadingQuote || isCreatingOrder}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isLoadingQuote || isCreatingOrder ? 0.6 : 1 }}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <Link href="/" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Cancel
              </Link>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Continue to Step {currentStep + 1} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!quote) {
                    fetchQuote();
                  } else {
                    handleConfirmBooking();
                  }
                }}
                disabled={isLoadingQuote || isCreatingOrder}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: quote ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                  opacity: isLoadingQuote || isCreatingOrder ? 0.6 : 1,
                  cursor: isLoadingQuote || isCreatingOrder ? 'not-allowed' : 'pointer',
                  boxShadow: quote ? '0 0 20px rgba(16, 185, 129, 0.4)' : undefined,
                }}
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    Creating your booking...
                  </>
                ) : isLoadingQuote ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    Calculating fee...
                  </>
                ) : quote ? (
                  <>
                    <Send size={16} /> Confirm Booking & Create Order
                  </>
                ) : (
                  <>
                    <Calculator size={16} /> Get Fee Estimate First
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Spin animation for spinner */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
