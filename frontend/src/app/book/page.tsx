'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MapPin,
  User,
  Phone,
  Package,
  Scale,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  bookingFormSchema,
  BookingFormValues,
  STEP_1_FIELDS,
  STEP_2_FIELDS,
  STEP_3_FIELDS,
} from '@/schema/order.schema';

/**
 * Member 06: Customer Booking Page
 * Multi-Step Booking Experience:
 *   Step 1: Pickup Details
 *   Step 2: Delivery Details
 *   Step 3: Parcel Details
 *   Step 4: Review Summary (Pre-Quote)
 */
export default function CustomerBookingPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

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
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  /**
   * Go back to previous step without losing any data.
   */
  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
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
            Complete the 3 quick steps below to specify pickup, destination, and parcel details.
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
          { step: 4, title: 'Review', desc: 'Confirm info' },
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

          {/* STEP 4: REVIEW DETAILS SUMMARY */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} color="#10b981" />
                  Step 4: Review Delivery Information
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Review your information below before requesting a fee estimate from the Order Service.
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

              {/* Notice for the upcoming Quote Step */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#93c5fd',
                }}
              >
                <Info size={20} color="#60a5fa" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Form validation complete!</strong> In the next step, clicking <em>"Get Fee Estimate"</em> will send this validated data to the Order Service API (<code>POST /api/v1/orders/quote</code>) to calculate your delivery fee.
                </div>
              </div>
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
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
                onClick={() => alert('Form is 100% valid! Ready for Step 3: Fee Quote API integration.')}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <Sparkles size={16} /> Ready for Get Estimate (Next Step)
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
