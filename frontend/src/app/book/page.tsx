'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Home,
  AlertCircle,
  Loader2,
  MapPin,
  Package,
  Mail,
  Archive,
  Truck,
  Phone,
  FileText,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { getOrderQuote, createOrder, getCities } from '@/api/services/orders.api';
import { apiClient } from '@/api/axios-client';
import type { UserProfile } from '@/types/auth.types';
import { getBranches, resolveNearestBranch } from '@/api/services/organization.api';
import { getCityCoordinates } from '@/lib/city-coordinates';
import type { CityOption, OrderQuoteResponse, ParcelSize } from '@/types/order.types';
import type { BranchResolutionResponse, BranchResponse } from '@/types/organization.types';

/** Result of asking the Organization Service which branch handles the pickup town. */
type BranchLookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found'; branch: BranchResolutionResponse }
  | { state: 'unsupported'; message: string }
  | { state: 'error'; message: string };

interface SizeOption {
  value: ParcelSize;
  label: string;
  hint: string;
  /** Heaviest parcel (kg) this size can hold. */
  maxKg: number;
  limitLabel: string;
  Icon: typeof Mail;
}

const SIZE_OPTIONS: SizeOption[] = [
  { value: 'SMALL', label: 'Small', hint: 'Envelope / Doc', maxKg: 1, limitLabel: '≤ 1.0 kg', Icon: Mail },
  { value: 'MEDIUM', label: 'Medium', hint: 'Shoebox size', maxKg: 3, limitLabel: '≤ 3.0 kg', Icon: Archive },
  { value: 'LARGE', label: 'Large', hint: 'Carton Box', maxKg: 10, limitLabel: '≤ 10.0 kg', Icon: Package },
  { value: 'EXTRA_LARGE', label: 'XL Bulk', hint: 'Heavy Freight', maxKg: 100, limitLabel: 'Up to 100 kg', Icon: Truck },
];

/** The two screens of the booking flow. */
type Step = 'details' | 'review';
const STEP_NUMBER: Record<Step, number> = { details: 1, review: 2 };
const STEP_TITLE: Record<Step, string> = {
  details: 'Request a delivery',
  review: 'Review your delivery',
};

const CARGO_PRESETS = ['Documents', 'Electronics', 'Clothing', 'Fragile items'];
const MIN_WEIGHT_KG = 0.1;
const MAX_WEIGHT_KG = 100;
const ADDRESS_MAX = 500;
const INSTRUCTIONS_MAX = 250;

/** Rough on-screen estimate by size, used only until the Order Service returns the official quote. */
const PLACEHOLDER_FEE: Record<ParcelSize, number> = {
  SMALL: 850,
  MEDIUM: 1250,
  LARGE: 1800,
  EXTRA_LARGE: 2500,
};

/** 'Saman Bandara' -> 'SB' (avatar letters on the review card). */
function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return letters || '?';
}

/** The smallest parcel size that can hold this weight, or null when the weight is not a usable number. */
function sizeForWeight(weightText: string): ParcelSize | null {
  const kg = Number(weightText);
  if (!weightText.trim() || Number.isNaN(kg) || kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG) return null;
  return SIZE_OPTIONS.find((option) => kg <= option.maxKg)?.value ?? null;
}

/** Fee with two decimals, e.g. 1069.9 -> '1,069.90'. */
function formatFee(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 'OUT_FOR_DELIVERY' -> 'Out for delivery' (the Order Service returns status codes). */
function formatStatus(status?: string): string {
  if (!status) return 'Created';
  const text = status.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Customer Delivery Booking Flow
 * Route: /book
 *
 * Implements Step 1 (Request a delivery) and Step 2 (Review your delivery)
 * with a balanced, full-width responsive layout fitting desktop screens
 * (2-column balanced grid) and mobile viewports (clean single-column stack).
 */
export default function RequestDeliveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');

  // Form State
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');

  // Towns (codes come from the Order Service town list)
  const [cities, setCities] = useState<CityOption[]>([]);
  const [pickupCity, setPickupCity] = useState<string>('');
  const [deliveryCity, setDeliveryCity] = useState<string>('');

  // Branch that handles the pickup (resolved automatically by the Organization Service)
  const [branchLookup, setBranchLookup] = useState<BranchLookup>({ state: 'idle' });
  const [branchRetry, setBranchRetry] = useState<number>(0);
  const [activeBranches, setActiveBranches] = useState<BranchResponse[]>([]);

  // One key per booking form: a retried submit returns the original order instead of a duplicate
  const idempotencyKey = useRef<string>('');

  // Cargo specifications
  const [cargoDescription, setCargoDescription] = useState<string>('');
  const [parcelSize, setParcelSize] = useState<ParcelSize | ''>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');

  // Sender details (auto-populated from authenticated profile)
  const [senderName, setSenderName] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');

  // Fee calculation state
  const [quote, setQuote] = useState<OrderQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('LKR');
  // Set only when the fee came from the Order Service quote for the current inputs
  const [officialFee, setOfficialFee] = useState<number | null>(null);

  // Order submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Auto-populate sender details from session
  useEffect(() => {
    // Ask the Identity Service directly: the shared profile helper returns a demo customer when it is unreachable
    apiClient
      .get<UserProfile>('/api/v1/identity/me')
      .then(({ data: profile }) => {
        // Only fill the empty fields: never overwrite what the customer already typed
        const profileName = profile?.name ?? '';
        const profilePhone = profile?.phone ?? '';
        if (profileName) setSenderName((current) => current || profileName);
        if (profilePhone) setSenderPhone((current) => current || profilePhone);
      })
      .catch(() => {});
  }, []);

  // Load the supported towns for the "Nearest Town / City" dropdowns
  useEffect(() => {
    getCities().then(setCities);
  }, []);

  // Branch addresses for the branch card (optional: the card still works without them)
  useEffect(() => {
    getBranches('ACTIVE')
      .then(setActiveBranches)
      .catch(() => {});
  }, []);

  // Find the nearest eligible branch whenever the pickup town changes
  useEffect(() => {
    if (!pickupCity) {
      setBranchLookup({ state: 'idle' });
      return;
    }
    const coordinates = getCityCoordinates(pickupCity);
    if (!coordinates) {
      setBranchLookup({ state: 'error', message: 'We could not locate this pickup town. Please choose another town.' });
      return;
    }

    let cancelled = false;
    setBranchLookup({ state: 'loading' });
    resolveNearestBranch(coordinates)
      .then((branch) => {
        if (!cancelled) setBranchLookup({ state: 'found', branch });
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (err?.isUnsupportedServiceArea) {
          setBranchLookup({
            state: 'unsupported',
            message: 'No branch covers this pickup town yet. Please choose a nearby town or contact support.',
          });
        } else {
          setBranchLookup({
            state: 'error',
            message: err?.message || 'We could not find your nearest branch right now.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pickupCity, branchRetry]);

  const weightKg = Number(weightInput);
  const selectedSize = SIZE_OPTIONS.find((o) => o.value === parcelSize);
  const cityName = (code: string) => cities.find((c) => c.code === code)?.name || code;

  /** Returns a message when the weight is unusable or too heavy for the chosen size, otherwise null. */
  const getWeightError = (): string | null => {
    if (!weightInput.trim() || Number.isNaN(weightKg) || weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
      return `Enter a weight between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg`;
    }
    if (selectedSize && weightKg > selectedSize.maxKg) {
      return `${selectedSize.label} parcels hold up to ${selectedSize.maxKg.toFixed(1)} kg. Choose a larger size or reduce the weight.`;
    }
    return null;
  };
  const weightError = getWeightError();
  // An empty weight is only flagged once the customer tries to continue
  const showWeightError = weightError !== null && (weightInput.trim() !== '' || Boolean(validationErrors.weight));

  // Live fee calculation using Order Service Quote API (needs both towns and a valid weight)
  useEffect(() => {
    setOfficialFee(null);
    if (!pickupCity || !deliveryCity || !parcelSize || getWeightError() !== null) {
      setEstimatedFee(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingQuote(true);
      try {
        const quoteRes = await getOrderQuote({
          pickupCity,
          dropoffCity: deliveryCity,
          weightKg,
          parcelSize,
        });
        setQuote(quoteRes);
        if (quoteRes.estimatedFee) {
          setEstimatedFee(quoteRes.estimatedFee);
          setOfficialFee(quoteRes.estimatedFee);
          if (quoteRes.currency) setCurrency(quoteRes.currency);
        }
      } catch {
        setEstimatedFee(PLACEHOLDER_FEE[parcelSize]);
      } finally {
        setIsLoadingQuote(false);
      }
    }, 600);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCity, deliveryCity, parcelSize, weightInput]);

  const PHONE_REGEX = /^\+?[0-9\s\-()]{7,15}$/;

  // Weight stepper: 0.1 kg per click, kept inside the allowed range
  const stepWeight = (delta: number) => {
    const current = Number.isNaN(weightKg) ? MIN_WEIGHT_KG : weightKg;
    const next = Math.min(MAX_WEIGHT_KG, Math.max(MIN_WEIGHT_KG, Math.round((current + delta) * 10) / 10));
    updateWeight(next.toFixed(1));
  };

  // Typing or stepping the weight also picks the size range that fits it
  const updateWeight = (value: string) => {
    setWeightInput(value);
    clearError('weight');
    const fitting = sizeForWeight(value);
    if (fitting) {
      setParcelSize(fitting);
      clearError('parcelSize');
    }
  };

  const clearError = (key: string) => {
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  // Validate step 1 fields
  const validateStep1 = () => {
    const errs: { [key: string]: string } = {};
    if (!pickupAddress.trim()) {
      errs.pickupAddress = 'Please enter the pickup address';
    } else if (pickupAddress.trim().length < 5) {
      errs.pickupAddress = 'The pickup address must be at least 5 characters';
    }
    if (!deliveryAddress.trim()) {
      errs.deliveryAddress = 'Please enter the delivery address';
    } else if (deliveryAddress.trim().length < 5) {
      errs.deliveryAddress = 'The delivery address must be at least 5 characters';
    }
    if (!recipientName.trim()) {
      errs.recipientName = 'Please enter the recipient name';
    } else if (recipientName.trim().length < 2) {
      errs.recipientName = 'The recipient name must be at least 2 characters';
    }
    if (!recipientPhone.trim()) {
      errs.recipientPhone = 'Please enter the recipient phone number';
    } else if (!PHONE_REGEX.test(recipientPhone.trim())) {
      errs.recipientPhone = 'Enter a valid phone number, e.g. +94 77 123 4567';
    }
    if (!senderName.trim()) {
      errs.senderName = 'Please enter the sender name';
    } else if (senderName.trim().length < 2) {
      errs.senderName = 'The sender name must be at least 2 characters';
    }
    if (!senderPhone.trim()) {
      errs.senderPhone = 'Please enter the sender mobile number';
    } else if (!PHONE_REGEX.test(senderPhone.trim())) {
      errs.senderPhone = 'Enter a valid phone number, e.g. +94 77 123 4567';
    }
    if (!cargoDescription.trim()) {
      errs.cargoDescription = 'Please describe what is in the parcel';
    }
    if (!parcelSize) {
      errs.parcelSize = 'Please choose a parcel size';
    }
    if (!pickupCity) {
      errs.pickupCity = 'Please choose the nearest pickup town / city';
    } else if (branchLookup.state === 'loading') {
      errs.branch = 'Still finding your nearest branch. Please wait a moment.';
    } else if (branchLookup.state === 'unsupported') {
      errs.branch = branchLookup.message;
    }
    if (!deliveryCity) {
      errs.deliveryCity = 'Please choose the nearest delivery town / city';
    }
    const weightProblem = getWeightError();
    if (weightProblem) {
      errs.weight = weightProblem;
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Continue to review
  const handleContinueToReview = () => {
    if (validateStep1()) {
      setErrorMessage(null);
      setStep('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Bring the first problem field into view
      setTimeout(() => {
        document.querySelector('.sd-text-input.has-error, .sd-weight-box.has-error, .sd-size-grid.has-error')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  // Confirm booking & create official order
  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    if (branchLookup.state === 'unsupported') {
      setErrorMessage(branchLookup.message);
      setIsSubmitting(false);
      return;
    }

    // The branch is not sent: the Order Service asks the Organization service for it and stores it on the order
    if (!parcelSize) {
      setErrorMessage('Please choose a parcel size before confirming.');
      setIsSubmitting(false);
      return;
    }
    const parcelDescription = cargoDescription.trim();

    if (!idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID();
    }

    try {
      const order = await createOrder({
        pickupAddress: pickupAddress.trim(),
        pickupContactName: senderName.trim(),
        pickupContactPhone: senderPhone.trim(),
        dropoffAddress: deliveryAddress.trim(),
        dropoffContactName: recipientName.trim(),
        dropoffContactPhone: recipientPhone.trim(),
        parcelDescription,
        parcelSize,
        weightKg,
        deliveryInstructions: deliveryInstructions.trim(),
        pickupCity,
        dropoffCity: deliveryCity,
        // Only sent when the fee on screen is the Order Service quote for these exact inputs
        ...(officialFee !== null ? { expectedFee: officialFee } : {}),
      }, idempotencyKey.current);

      // Redirect to confirmation page
      const params = new URLSearchParams({
        trackingNumber: order.trackingNumber || 'TRK-PENDING',
        id: String(order.id ?? ''),
        fee: String(order.deliveryFee ?? estimatedFee ?? ''),
        currency: order.currency || currency,
        status: formatStatus(order.status),
        pickup: order.pickupAddress || pickupAddress,
        dropoff: order.dropoffAddress || deliveryAddress,
      });

      router.push(`/book/confirmation?${params.toString()}`);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to reach the API Gateway or Order Service. Please check that the backend is running at http://localhost:8080.'
      );
      setIsSubmitting(false);
    }
  };

  const resolvedBranch = branchLookup.state === 'found' ? branchLookup.branch : null;
  const resolvedBranchInfo = resolvedBranch
    ? activeBranches.find((b) => b.id === resolvedBranch.branchId)
    : undefined;

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- TOP HEADER BAR ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <button
            type="button"
            onClick={() => {
              if (step === 'review') {
                setStep('details');
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
              {STEP_TITLE[step]}
            </h1>
            <div className="sd-header-sub">
              New delivery · Step {STEP_NUMBER[step]} of 2
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN CANVAS ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          {/* ---------------- STEP 1: REQUEST A DELIVERY (DETAILS) ---------------- */}
          {step === 'details' && (
            <div className="sd-left-column sd-details-column">
              <div className="sd-intro-block">
                <h2 className="sd-section-heading">Where are we delivering?</h2>
                <p className="sd-section-subheading">Enter pickup and drop-off details.</p>
              </div>

              {/* Pickup Details (left) and Delivery Destination (right) side by side */}
              <div className="sd-pair-grid">
                {/* ---------------- Pickup Details ---------------- */}
                <div className="sd-card-panel">
                  <div className="sd-section-head">
                    <div className="sd-section-head-left">
                      <div className="sd-section-icon">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div className="sd-section-title">Pickup Details</div>
                        <div className="sd-section-sub">Where should our courier collect the parcel?</div>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Address */}
                  <div className="sd-field-group">
                    <div className="sd-label-row">
                      <label htmlFor="pickupAddress" className="sd-field-label">
                        Street Address &amp; Landmark <span className="sd-required">*</span>
                      </label>
                      <span className="sd-counter">
                        {pickupAddress.length}/{ADDRESS_MAX}
                      </span>
                    </div>
                    <div className="sd-input-wrap">
                      <MapPin size={16} className="sd-input-icon" />
                      <input
                        id="pickupAddress"
                        type="text"
                        placeholder="Street, building, area"
                        maxLength={ADDRESS_MAX}
                        value={pickupAddress}
                        onChange={(e) => {
                          setPickupAddress(e.target.value);
                          clearError('pickupAddress');
                        }}
                        className={`sd-text-input with-icon ${validationErrors.pickupAddress ? 'has-error' : ''}`}
                      />
                      {pickupAddress && (
                        <button
                          type="button"
                          className="sd-clear-btn"
                          aria-label="Clear pickup address"
                          onClick={() => setPickupAddress('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {validationErrors.pickupAddress && (
                      <div className="sd-error-hint">{validationErrors.pickupAddress}</div>
                    )}
                  </div>

                  {/* Pickup Town / City */}
                  <div className="sd-field-group">
                    <div className="sd-label-row">
                      <label htmlFor="pickupCity" className="sd-field-label">
                        Nearest Town / City <span className="sd-required">*</span>
                      </label>
                    </div>
                    <select
                      id="pickupCity"
                      value={pickupCity}
                      onChange={(e) => {
                        setPickupCity(e.target.value);
                        clearError('pickupCity');
                      }}
                      className={`sd-text-input sd-select ${validationErrors.pickupCity ? 'has-error' : ''}`}
                    >
                      <option value="">Select a town / city</option>
                      {cities.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.pickupCity && (
                      <div className="sd-error-hint">{validationErrors.pickupCity}</div>
                    )}
                  </div>

                  {/* Sender details */}
                  <div className="sd-two-col">
                    <div className="sd-field-group">
                      <label htmlFor="senderName" className="sd-field-label">
                        Sender Full Name <span className="sd-required">*</span>
                      </label>
                      <input
                        id="senderName"
                        type="text"
                        placeholder="Who is sending the parcel?"
                        value={senderName}
                        onChange={(e) => {
                          setSenderName(e.target.value);
                          clearError('senderName');
                        }}
                        className={`sd-text-input ${validationErrors.senderName ? 'has-error' : ''}`}
                      />
                      {validationErrors.senderName && (
                        <div className="sd-error-hint">{validationErrors.senderName}</div>
                      )}
                    </div>
                    <div className="sd-field-group">
                      <label htmlFor="senderPhone" className="sd-field-label">
                        Sender Mobile Contact <span className="sd-required">*</span>
                      </label>
                      <input
                        id="senderPhone"
                        type="text"
                        placeholder="+94 7X XXX XXXX"
                        value={senderPhone}
                        onChange={(e) => {
                          setSenderPhone(e.target.value);
                          clearError('senderPhone');
                        }}
                        className={`sd-text-input ${validationErrors.senderPhone ? 'has-error' : ''}`}
                      />
                      {validationErrors.senderPhone && (
                        <div className="sd-error-hint">{validationErrors.senderPhone}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ---------------- Delivery Destination ---------------- */}
                <div className="sd-card-panel">
                  <div className="sd-section-head">
                    <div className="sd-section-head-left">
                      <div className="sd-section-icon">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div className="sd-section-title">Delivery Destination</div>
                        <div className="sd-section-sub">Provide precise recipient dispatch destination</div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="sd-field-group">
                    <div className="sd-label-row">
                      <label htmlFor="deliveryAddress" className="sd-field-label">
                        Drop-off Street Address <span className="sd-required">*</span>
                      </label>
                      <span className="sd-counter">
                        {deliveryAddress.length}/{ADDRESS_MAX}
                      </span>
                    </div>
                    <div className="sd-input-wrap">
                      <MapPin size={16} className="sd-input-icon" />
                      <input
                        id="deliveryAddress"
                        type="text"
                        placeholder="Recipient address and area"
                        maxLength={ADDRESS_MAX}
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value);
                          clearError('deliveryAddress');
                        }}
                        className={`sd-text-input with-icon ${validationErrors.deliveryAddress ? 'has-error' : ''}`}
                      />
                      {deliveryAddress && (
                        <button
                          type="button"
                          className="sd-clear-btn"
                          aria-label="Clear delivery address"
                          onClick={() => setDeliveryAddress('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {validationErrors.deliveryAddress && (
                      <div className="sd-error-hint">{validationErrors.deliveryAddress}</div>
                    )}
                  </div>

                  {/* Delivery Town / City */}
                  <div className="sd-field-group">
                    <div className="sd-label-row">
                      <label htmlFor="deliveryCity" className="sd-field-label">
                        Nearest Town / City <span className="sd-required">*</span>
                      </label>
                    </div>
                    <select
                      id="deliveryCity"
                      value={deliveryCity}
                      onChange={(e) => {
                        setDeliveryCity(e.target.value);
                        clearError('deliveryCity');
                      }}
                      className={`sd-text-input sd-select ${validationErrors.deliveryCity ? 'has-error' : ''}`}
                    >
                      <option value="">Select a town / city</option>
                      {cities.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.deliveryCity && (
                      <div className="sd-error-hint">{validationErrors.deliveryCity}</div>
                    )}
                  </div>

                  {/* Recipient details */}
                  <div className="sd-two-col">
                    <div className="sd-field-group">
                      <label htmlFor="recipientName" className="sd-field-label">
                        Recipient Full Name <span className="sd-required">*</span>
                      </label>
                      <input
                        id="recipientName"
                        type="text"
                        placeholder="Who should receive the parcel?"
                        value={recipientName}
                        onChange={(e) => {
                          setRecipientName(e.target.value);
                          clearError('recipientName');
                        }}
                        className={`sd-text-input ${validationErrors.recipientName ? 'has-error' : ''}`}
                      />
                      {validationErrors.recipientName && (
                        <div className="sd-error-hint">{validationErrors.recipientName}</div>
                      )}
                    </div>
                    <div className="sd-field-group">
                      <label htmlFor="recipientPhone" className="sd-field-label">
                        Recipient Mobile <span className="sd-required">*</span>
                      </label>
                      <input
                        id="recipientPhone"
                        type="text"
                        placeholder="+94 7X XXX XXXX"
                        value={recipientPhone}
                        onChange={(e) => {
                          setRecipientPhone(e.target.value);
                          clearError('recipientPhone');
                        }}
                        className={`sd-text-input ${validationErrors.recipientPhone ? 'has-error' : ''}`}
                      />
                      {validationErrors.recipientPhone && (
                        <div className="sd-error-hint">{validationErrors.recipientPhone}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------------- Cargo Specifications ---------------- */}
              <div className="sd-card-panel">
                <div className="sd-section-head">
                  <div className="sd-section-head-left">
                    <div className="sd-section-icon">
                      <Package size={18} />
                    </div>
                    <div>
                      <div className="sd-section-title">Cargo Specifications</div>
                      <div className="sd-section-sub">
                        Accurate physical dimensions ensure calibrated rate calculation
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cargo description + presets */}
                <div className="sd-field-group">
                  <label htmlFor="cargoDescription" className="sd-field-label">
                    Cargo Item Manifest Description <span className="sd-required">*</span>
                  </label>
                  <input
                    id="cargoDescription"
                    type="text"
                    placeholder="What is in the parcel?"
                    maxLength={500}
                    value={cargoDescription}
                    onChange={(e) => {
                      setCargoDescription(e.target.value);
                      clearError('cargoDescription');
                    }}
                    className={`sd-text-input ${validationErrors.cargoDescription ? 'has-error' : ''}`}
                  />
                  {validationErrors.cargoDescription && (
                    <div className="sd-error-hint">{validationErrors.cargoDescription}</div>
                  )}
                  <div className="sd-chip-row">
                    <span className="sd-chip-label">Presets:</span>
                    {CARGO_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setCargoDescription(preset);
                          clearError('cargoDescription');
                        }}
                        className={`sd-chip ${cargoDescription === preset ? 'selected' : ''}`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size form factor */}
                <div className="sd-field-group">
                  <label className="sd-field-label">Size Form Factor <span className="sd-required">*</span></label>
                  <div className={`sd-size-grid ${validationErrors.parcelSize ? 'has-error' : ''}`}>
                    {SIZE_OPTIONS.map((option) => {
                      const isSelected = parcelSize === option.value;
                      const SizeIcon = option.Icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setParcelSize(option.value);
                            clearError('parcelSize');
                          }}
                          className={`sd-size-card ${isSelected ? 'selected' : ''}`}
                        >
                          <span className="sd-size-top">
                            <SizeIcon size={18} className="sd-size-icon" />
                            <span className={`sd-size-radio ${isSelected ? 'selected' : ''}`}>
                              {isSelected && <Check size={11} strokeWidth={3.5} color="#ffffff" />}
                            </span>
                          </span>
                          <span className="sd-size-name">{option.label}</span>
                          <span className="sd-size-hint">{option.hint}</span>
                          <span className="sd-size-limit">{option.limitLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                  {validationErrors.parcelSize && (
                    <div className="sd-error-hint">{validationErrors.parcelSize}</div>
                  )}
                </div>

                {/* Verified gross weight */}
                <div className="sd-field-group">
                  <label htmlFor="weightKg" className="sd-field-label">
                    Verified Gross Weight <span className="sd-required">*</span>
                  </label>
                  <div className="sd-weight-row">
                    <button
                      type="button"
                      className="sd-step-btn"
                      aria-label="Decrease weight"
                      onClick={() => stepWeight(-0.1)}
                    >
                      <Minus size={16} />
                    </button>
                    <div className={`sd-weight-box ${showWeightError ? 'has-error' : ''}`}>
                      <input
                        id="weightKg"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min={MIN_WEIGHT_KG}
                        max={MAX_WEIGHT_KG}
                        value={weightInput}
                        onChange={(e) => updateWeight(e.target.value)}
                        className="sd-weight-input"
                      />
                      <span className="sd-weight-unit">kg</span>
                    </div>
                    <button
                      type="button"
                      className="sd-step-btn"
                      aria-label="Increase weight"
                      onClick={() => stepWeight(0.1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {showWeightError ? (
                    <div className="sd-error-hint">{weightError}</div>
                  ) : (
                    <div className="sd-hint">Max cargo limit per unit: {MAX_WEIGHT_KG} kg</div>
                  )}
                </div>

                {/* Special delivery instructions */}
                <div className="sd-field-group">
                  <div className="sd-label-row">
                    <label htmlFor="deliveryInstructions" className="sd-field-label">
                      Special Delivery Instructions <span className="sd-optional">(Optional)</span>
                    </label>
                    <span className="sd-counter">
                      {deliveryInstructions.length}/{INSTRUCTIONS_MAX}
                    </span>
                  </div>
                  <textarea
                    id="deliveryInstructions"
                    rows={3}
                    maxLength={INSTRUCTIONS_MAX}
                    placeholder="e.g. Ring the bell, leave with the receptionist"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    className="sd-text-input sd-textarea"
                  />
                </div>
              </div>

              {/* ---------------- Branch Selection ---------------- */}
              <div className="sd-card-panel">
                {/* Choose Branch */}
                <div className="sd-field-group">
                  <div className="sd-branch-header-title">
                    Choose the branch that will handle this delivery
                  </div>
                  <div className="sd-branch-sub">
                    The nearest branch that covers your pickup town is selected for you.
                  </div>

                  {branchLookup.state === 'idle' && (
                    <div className="sd-branch-note">Choose a pickup town to see your branch.</div>
                  )}

                  {branchLookup.state === 'loading' && (
                    <div className="sd-branch-note">
                      <Loader2 size={14} className="animate-spin" /> Finding your nearest branch...
                    </div>
                  )}

                  {resolvedBranch && (
                    <div className="sd-branch-list">
                      <div className="sd-branch-card selected sd-branch-static">
                        <div className="sd-branch-left">
                          <div className="sd-branch-icon selected">
                            <Home size={18} />
                          </div>
                          <div>
                            <div className="sd-branch-name">{resolvedBranch.branchName}</div>
                            <div className="sd-branch-addr">
                              {resolvedBranchInfo
                                ? `${resolvedBranchInfo.addressLine1}, ${resolvedBranchInfo.city} · `
                                : ''}
                              {resolvedBranch.distanceKm.toFixed(2)} km from {cityName(pickupCity)}
                            </div>
                          </div>
                        </div>
                        <div className="sd-branch-check">
                          <Check size={18} color="#16a34a" strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  )}

                  {(branchLookup.state === 'unsupported' || branchLookup.state === 'error') && (
                    <div className="sd-error-hint">
                      {branchLookup.message}
                      {branchLookup.state === 'error' && (
                        <>
                          {' '}
                          <button
                            type="button"
                            className="sd-branch-retry"
                            onClick={() => setBranchRetry((n) => n + 1)}
                          >
                            Try again
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {validationErrors.branch && branchLookup.state === 'loading' && (
                    <div className="sd-error-hint">{validationErrors.branch}</div>
                  )}
                </div>

                {/* Pricing & CTA Box */}
                <div className="sd-price-box">
                  <div className="sd-fee-row">
                    <span className="sd-fee-label">Estimated delivery fee</span>
                    <span className="sd-fee-amount">
                      {isLoadingQuote ? (
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Calculating...</span>
                      ) : (
                        estimatedFee === null ? '—' : `${currency} ${estimatedFee.toLocaleString()}`
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Continue to review */}
              {Object.values(validationErrors).some(Boolean) && (
                <div className="sd-screenshot-error">
                  <AlertCircle size={18} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Please fill in every field correctly before continuing.</span>
                </div>
              )}
              <div className="sd-next-row">
                <button type="button" onClick={handleContinueToReview} className="sd-submit-btn">
                  Continue to review 
                </button>
              </div>
            </div>
          )}

          {/* ---------------- STEP 2: REVIEW & CONFIRM ---------------- */}
          {step === 'review' && (
            <div className="sd-step2-layout">
              <div className="sd-review-intro">
                <h2 className="sd-section-heading">Review your delivery</h2>
                <p className="sd-section-subheading">
                  Confirm your booking details and dispatch with SwiftDrop.
                </p>
              </div>

              {/* Red error alert matching the screenshot */}
              {errorMessage && (
                <div className="sd-screenshot-error">
                  <AlertCircle size={18} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="sd-review-grid">
                <div className="sd-review-summary-card">
                  {/* Courier icon + caption */}
                  <div className="sd-review-hero">
                    <div className="sd-review-hero-icon">
                      <Truck size={28} />
                    </div>
                    <div className="sd-review-hero-caption">
                      Your courier is ready to pick up your parcel
                    </div>
                  </div>

                  {/* Route: pickup -> delivery */}
                  <div className="sd-review-route">
                    <div className="sd-route-stop">
                      <span className="sd-route-dot pickup">
                        <MapPin size={15} />
                      </span>
                      <div className="sd-route-body">
                        <div className="sd-route-kicker">
                          Pickup <span className="sd-route-town">{cityName(pickupCity)}</span>
                        </div>
                        <div className="sd-route-address">{pickupAddress}</div>
                      </div>
                    </div>
                    <div className="sd-route-stop">
                      <span className="sd-route-dot dropoff">
                        <MapPin size={15} />
                      </span>
                      <div className="sd-route-body">
                        <div className="sd-route-kicker">
                          Delivery <span className="sd-route-town">{cityName(deliveryCity)}</span>
                        </div>
                        <div className="sd-route-address">{deliveryAddress}</div>
                      </div>
                    </div>
                  </div>

                  {/* Sender and recipient: name with the contact number below */}
                  <div className="sd-review-people">
                    <div className="sd-person-card">
                      <span className="sd-person-avatar">{initials(senderName)}</span>
                      <div className="sd-person-body">
                        <div className="sd-person-role">Sender</div>
                        <div className="sd-person-name">{senderName}</div>
                        <div className="sd-person-phone">
                          <Phone size={12} /> {senderPhone}
                        </div>
                      </div>
                    </div>
                    <div className="sd-person-card">
                      <span className="sd-person-avatar">{initials(recipientName)}</span>
                      <div className="sd-person-body">
                        <div className="sd-person-role">Recipient</div>
                        <div className="sd-person-name">{recipientName}</div>
                        <div className="sd-person-phone">
                          <Phone size={12} /> {recipientPhone}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parcel and branch */}
                  <div className="sd-review-tiles">
                    <div className="sd-info-tile">
                      <span className="sd-info-icon">
                        <Package size={16} />
                      </span>
                      <div>
                        <div className="sd-info-label">Parcel category</div>
                        <div className="sd-info-value">
                          {selectedSize?.label} ({(Number.isNaN(weightKg) ? 0 : weightKg).toFixed(1)} kg)
                        </div>
                      </div>
                    </div>
                    {cargoDescription.trim() && (
                      <div className="sd-info-tile">
                        <span className="sd-info-icon">
                          <Archive size={16} />
                        </span>
                        <div>
                          <div className="sd-info-label">Cargo</div>
                          <div className="sd-info-value">{cargoDescription.trim()}</div>
                        </div>
                      </div>
                    )}
                    <div className="sd-info-tile">
                      <span className="sd-info-icon">
                        <Home size={16} />
                      </span>
                      <div>
                        <div className="sd-info-label">Handling branch</div>
                        <div className="sd-info-value">
                          {resolvedBranch ? resolvedBranch.branchName : 'Assigned after booking'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {deliveryInstructions.trim() && (
                    <div className="sd-review-note">
                      <FileText size={15} />
                      <div>
                        <div className="sd-info-label">Instructions</div>
                        <div className="sd-review-note-text">{deliveryInstructions.trim()}</div>
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="sd-review-total">
                    <span className="sd-review-total-label">Total Delivery Fee</span>
                    <span className="sd-review-total-amount">
                      {estimatedFee === null ? '—' : `${currency} ${formatFee(estimatedFee)}`}
                    </span>
                  </div>

                  {/* Actions: inside the card, below the total */}
                  <div className="sd-review-actions-panel">
                    <button
                      type="button"
                      onClick={handleConfirmOrder}
                      disabled={isSubmitting}
                      className="sd-submit-btn"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Submitting Order...
                        </>
                      ) : (
                        <>Confirm booking & dispatch </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('details')}
                      disabled={isSubmitting}
                      className="sd-secondary-btn"
                    >
                       Back to edit details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- STYLES (FITS SCREEN PROPERLY) ---------------- */}
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

        /* Fullpage Body Canvas */
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

        /* 2-Column Responsive Desktop Grid for Step 1 */
        .sd-step1-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 2rem;
          align-items: flex-start;
        }

        .sd-step2-layout {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sd-step2-layout .sd-screenshot-error {
          width: 100%;
          max-width: 860px;
        }

        /* Card Panel */
        .sd-card-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.85rem 1.85rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .sd-intro-block {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .sd-section-heading {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .sd-section-subheading {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
        }

        /* Field Groups */
        .sd-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .sd-field-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e293b;
        }

        .sd-text-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.8rem 1rem;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .sd-text-input::placeholder {
          color: #94a3b8;
          font-size: 0.875rem;
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
          align-self: flex-start;
          background: transparent;
          border: none;
          color: #2563eb;
          font-size: 0.775rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0.15rem 0;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .sd-location-btn:hover {
          text-decoration: underline;
        }

        /* Parcel Grid */
        .sd-parcel-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.75rem;
        }

        .sd-parcel-btn {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 500;
          border-radius: 10px;
          padding: 0.8rem 0.5rem;
          cursor: pointer;
          text-align: center;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .sd-parcel-btn:hover {
          border-color: #cbd5e1;
        }

        .sd-parcel-btn.selected {
          background: #e0ecfe;
          border: 1.5px solid #2563eb;
          color: #1d4ed8;
          font-weight: 600;
        }

        /* Branch Selection */
        .sd-branch-header-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
        }

        .sd-branch-sub {
          font-size: 0.775rem;
          color: #64748b;
          margin-bottom: 0.6rem;
        }

        .sd-branch-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sd-branch-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.95rem 1.15rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sd-branch-card:hover {
          border-color: #cbd5e1;
        }

        .sd-branch-card.selected {
          border: 1.5px solid #2563eb;
          background: #fcfdfe;
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
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
          font-size: 0.775rem;
          color: #64748b;
          margin-top: 2px;
        }

        .sd-branch-check {
          display: flex;
          align-items: center;
        }

        .sd-branch-static {
          cursor: default;
        }

        .sd-branch-note {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #64748b;
        }

        .sd-branch-retry {
          background: none;
          border: none;
          padding: 0;
          color: #2563eb;
          font-weight: 600;
          font-size: inherit;
          cursor: pointer;
          text-decoration: underline;
        }

        /* Price Box */
        .sd-price-box {
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
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
          font-weight: 500;
        }

        .sd-fee-amount {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
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
          transition: background 0.15s ease, transform 0.1s ease;
          font-family: inherit;
        }

        .sd-submit-btn:hover {
          background: #1d4ed8;
        }

        .sd-submit-btn:active {
          transform: scale(0.99);
        }

        .sd-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .sd-branch-selected-tag {
          font-size: 0.775rem;
          color: #16a34a;
          font-weight: 600;
        }

        /* Step 2 Review Styles */
        .sd-screenshot-error {
          background: #fef2f2;
          border: 1px solid #fecdd3;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          color: #be123c;
          font-size: 0.85rem;
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          line-height: 1.45;
          margin-bottom: 1.5rem;
        }

        .sd-review-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          width: 100%;
          max-width: 860px;
          gap: 2rem;
          align-items: flex-start;
        }

        /* ---- Review step ---- */
        .sd-review-intro {
          width: 100%;
          max-width: 860px;
          text-align: center;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .sd-review-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 2rem 2.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }

        .sd-review-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.8rem;
        }

        .sd-review-hero-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #e0ecfe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 7px #f1f5f9;
        }

        .sd-review-hero-caption {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        /* Route timeline */
        .sd-review-route {
          display: flex;
          flex-direction: column;
          padding: 1.1rem 1.25rem 0.2rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }

        .sd-route-stop {
          display: flex;
          gap: 0.9rem;
          position: relative;
          padding-bottom: 1.15rem;
        }

        .sd-route-stop:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 15px;
          top: 34px;
          bottom: 2px;
          width: 2px;
          background: repeating-linear-gradient(to bottom, #cbd5e1 0, #cbd5e1 4px, transparent 4px, transparent 8px);
        }

        .sd-route-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-route-dot.pickup {
          background: #e0ecfe;
          color: #2563eb;
        }

        .sd-route-dot.dropoff {
          background: #dcfce7;
          color: #16a34a;
        }

        .sd-route-body {
          min-width: 0;
        }

        .sd-route-kicker {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
        }

        .sd-route-town {
          text-transform: none;
          letter-spacing: 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #2563eb;
          background: #e0ecfe;
          border-radius: 999px;
          padding: 1px 9px;
        }

        .sd-route-address {
          margin-top: 3px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #0f172a;
          overflow-wrap: anywhere;
        }

        /* Sender and recipient */
        .sd-review-people {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.9rem;
        }

        .sd-person-card {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.95rem 1.1rem;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
          min-width: 0;
        }

        .sd-person-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #e0ecfe;
          color: #2563eb;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-person-body {
          min-width: 0;
        }

        .sd-person-role {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
        }

        .sd-person-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          overflow-wrap: anywhere;
        }

        .sd-person-phone {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 1px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #64748b;
        }

        /* Parcel, cargo, branch */
        .sd-review-tiles {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 0.9rem;
        }

        .sd-info-tile {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.85rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          min-width: 0;
        }

        .sd-info-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #e0ecfe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-info-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
        }

        .sd-info-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
          overflow-wrap: anywhere;
        }

        .sd-review-note {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          padding: 0.85rem 1rem;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          color: #64748b;
        }

        .sd-review-note svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .sd-review-note-text {
          font-size: 0.9rem;
          font-weight: 500;
          color: #0f172a;
          overflow-wrap: anywhere;
        }

        /* Total */
        .sd-review-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1.1rem 1.35rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #16a34a;
          border-radius: 14px;
        }

        .sd-review-total-label {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-review-total-amount {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #16a34a;
          white-space: nowrap;
        }

        /* Buttons */
        .sd-review-actions-panel {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 0.85rem;
        }

        .sd-review-actions-panel .sd-submit-btn {
          width: auto;
          flex: 1.6 1 0;
          padding: 1rem;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
        }

        .sd-review-actions-panel .sd-secondary-btn {
          width: auto;
          flex: 1 1 0;
          padding: 1rem;
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
          transition: all 0.15s ease;
          font-family: inherit;
          text-align: center;
        }

        .sd-secondary-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* ---- Added sections: Pickup / Delivery / Cargo ---- */
        .sd-left-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sd-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .sd-section-head-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .sd-section-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #e0ecfe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-section-sub {
          font-size: 0.775rem;
          color: #64748b;
          margin-top: 2px;
        }

        .sd-label-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .sd-counter {
          font-size: 0.72rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .sd-required {
          color: #dc2626;
        }

        .sd-optional {
          font-weight: 500;
          color: #64748b;
        }

        .sd-hint {
          font-size: 0.75rem;
          color: #64748b;
        }

        .sd-two-col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        /* Pickup (left) and Delivery (right) side by side */
        .sd-pair-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: flex-start;
        }

        /* Next button after the cargo section */
        .sd-next-row {
          display: flex;
          justify-content: flex-end;
        }

        .sd-next-row .sd-submit-btn {
          width: auto;
          min-width: 220px;
          padding: 0.9rem 2.25rem;
        }

        .sd-input-wrap {
          position: relative;
        }

        .sd-input-icon {
          position: absolute;
          left: 0.9rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .sd-text-input.with-icon {
          padding-left: 2.5rem;
          padding-right: 2.4rem;
        }

        .sd-clear-btn {
          position: absolute;
          right: 0.7rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0.2rem;
          border-radius: 6px;
        }

        .sd-clear-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .sd-select {
          cursor: pointer;
        }

        .sd-textarea {
          resize: vertical;
          min-height: 84px;
          line-height: 1.45;
        }

        /* Cargo presets */
        .sd-chip-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.15rem;
        }

        .sd-chip-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        .sd-chip {
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 999px;
          padding: 0.25rem 0.7rem;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }

        .sd-chip:hover {
          border-color: #cbd5e1;
        }

        .sd-chip.selected {
          background: #e0ecfe;
          border-color: #2563eb;
          color: #1d4ed8;
        }

        /* Size form factor */
        .sd-size-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        .sd-size-grid.has-error .sd-size-card {
          border-color: #fca5a5;
        }

        .sd-size-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.15rem;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          border-radius: 12px;
          padding: 0.85rem 0.85rem;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: all 0.15s ease;
        }

        .sd-size-card:hover {
          border-color: #cbd5e1;
        }

        .sd-size-card.selected {
          background: #e0ecfe;
          border: 1.5px solid #2563eb;
        }

        .sd-size-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 0.4rem;
        }

        .sd-size-icon {
          color: #64748b;
        }

        .sd-size-card.selected .sd-size-icon {
          color: #2563eb;
        }

        .sd-size-radio {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sd-size-radio.selected {
          background: #2563eb;
          border-color: #2563eb;
        }

        .sd-size-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-size-hint {
          font-size: 0.72rem;
          color: #64748b;
        }

        .sd-size-limit {
          font-size: 0.72rem;
          font-weight: 700;
          color: #1d4ed8;
          margin-top: 0.25rem;
        }

        /* Weight stepper */
        .sd-weight-row {
          display: flex;
          align-items: stretch;
          gap: 0.6rem;
        }

        .sd-step-btn {
          width: 46px;
          flex-shrink: 0;
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
          color: #334155;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .sd-step-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .sd-weight-box {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0 1rem;
        }

        .sd-weight-box:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .sd-weight-box.has-error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .sd-weight-input {
          width: 5.5rem;
          border: none;
          outline: none;
          background: transparent;
          text-align: center;
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          font-family: inherit;
          padding: 0.7rem 0;
          -moz-appearance: textfield;
        }

        .sd-weight-input::-webkit-outer-spin-button,
        .sd-weight-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .sd-weight-unit {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1180px) {
          .sd-pair-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 992px) {
          .sd-step1-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .sd-review-grid {
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
          .sd-next-row .sd-submit-btn {
            width: 100%;
          }

          .sd-review-actions-panel {
            flex-direction: column;
          }

          .sd-review-people {
            grid-template-columns: 1fr;
          }

          .sd-review-summary-card {
            padding: 1.5rem 1.25rem;
          }

          .sd-review-total {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.35rem;
          }

          .sd-size-grid {
            grid-template-columns: 1fr 1fr;
          }

          .sd-section-head {
            flex-direction: column;
            gap: 0.6rem;
          }

          .sd-fullpage-header {
            padding: 1rem 1.25rem;
          }

          .sd-fullpage-body {
            padding: 1.25rem 1rem 3rem 1rem;
          }

          .sd-card-panel {
            padding: 1.35rem 1.15rem;
          }
        }
      `}</style>
    </div>
  );
}
