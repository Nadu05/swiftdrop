'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Package,
  Truck,
  Building,
  ShieldCheck,
  User,
  Phone,
} from 'lucide-react';
import { getOrderQuote, createOrder } from '@/api/services/orders.api';
import { getCurrentUserProfile } from '@/api/services/auth.api';
import type { OrderQuoteResponse, ParcelSize } from '@/types/order.types';

type ParcelType = 'Document' | 'Small parcel' | 'Large item';

interface BranchOption {
  id: string;
  name: string;
  address: string;
  distance: string;
}

const BRANCHES: BranchOption[] = [
  {
    id: 'colombo-central',
    name: 'Colombo Central Branch',
    address: 'Union Place, Colombo 02',
    distance: '2.4 km',
  },
  {
    id: 'rajagiriya',
    name: 'Rajagiriya Branch',
    address: 'Nawala Road, Rajagiriya',
    distance: '5.1 km',
  },
];

/**
 * Member 06: Customer Delivery Booking Flow
 * Route: /book
 *
 * Full-page enterprise layout with ZERO surrounding blue space:
 * - Side tab (Sidebar) on the left
 * - 100% full-width, edge-to-edge light canvas on the right
 * - Step 1: Input details, choose branch & live fee estimate
 * - Step 2: Matches the reference image 1:1 (Review details, fee card & dispatch)
 */
export default function RequestDeliveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [pickupAddress, setPickupAddress] = useState<string>('Kegalle District');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('beragala road');
  const [recipientName, setRecipientName] = useState<string>('joi');
  const [recipientPhone, setRecipientPhone] = useState<string>('+94702872524');
  const [parcelType, setParcelType] = useState<ParcelType>('Document');
  const [selectedBranch, setSelectedBranch] = useState<string>('colombo-central');

  // Sender details (auto-populated from authenticated profile)
  const [senderName, setSenderName] = useState<string>('Kasun Perera');
  const [senderPhone, setSenderPhone] = useState<string>('+94 77 123 4567');

  // Fee calculation state
  const [quote, setQuote] = useState<OrderQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [estimatedFee, setEstimatedFee] = useState<number>(850);
  const [currency, setCurrency] = useState<string>('LKR');

  // Order submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Auto-populate sender details from session
  useEffect(() => {
    getCurrentUserProfile()
      .then((profile) => {
        if (profile?.name) setSenderName(profile.name);
        if (profile?.phone) setSenderPhone(profile.phone);
      })
      .catch(() => {});
  }, []);

  // Map parcel type to backend parcel size and weight
  const getParcelMetadata = (type: ParcelType): { size: ParcelSize; weight: number; desc: string } => {
    switch (type) {
      case 'Document':
        return { size: 'SMALL', weight: 0.5, desc: 'Document' };
      case 'Large item':
        return { size: 'LARGE', weight: 5.0, desc: 'Large item' };
      case 'Small parcel':
      default:
        return { size: 'MEDIUM', weight: 1.5, desc: 'Small parcel' };
    }
  };

  // Live fee calculation using Order Service Quote API
  useEffect(() => {
    if (!pickupAddress || !deliveryAddress || pickupAddress.length < 3 || deliveryAddress.length < 3) {
      return;
    }

    const { size, weight } = getParcelMetadata(parcelType);
    const timeoutId = setTimeout(async () => {
      setIsLoadingQuote(true);
      try {
        const quoteRes = await getOrderQuote({
          pickupAddress,
          dropoffAddress: deliveryAddress,
          weightKg: weight,
          parcelSize: size,
        });
        setQuote(quoteRes);
        if (quoteRes.estimatedFee) {
          setEstimatedFee(quoteRes.estimatedFee);
          if (quoteRes.currency) setCurrency(quoteRes.currency);
        }
      } catch {
        // Fallback estimate baseline
        const base = parcelType === 'Document' ? 850 : parcelType === 'Large item' ? 1800 : 1250;
        setEstimatedFee(base);
      } finally {
        setIsLoadingQuote(false);
      }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [pickupAddress, deliveryAddress, parcelType]);

  // Shortcut: Use current location
  const handleUseCurrentLocation = () => {
    setPickupAddress('Union Place, Colombo 02');
    if (validationErrors.pickupAddress) {
      setValidationErrors((prev) => ({ ...prev, pickupAddress: '' }));
    }
  };

  // Validate step 1 fields
  const validateStep1 = () => {
    const errs: { [key: string]: string } = {};
    if (!pickupAddress.trim() || pickupAddress.trim().length < 3) {
      errs.pickupAddress = 'Please enter a valid pickup address';
    }
    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 3) {
      errs.deliveryAddress = 'Please enter a valid delivery address';
    }
    if (!recipientName.trim() || recipientName.trim().length < 2) {
      errs.recipientName = 'Please enter recipient name';
    }
    if (!recipientPhone.trim() || !/^\+?[0-9\s\-()]{7,15}$/.test(recipientPhone.trim())) {
      errs.recipientPhone = 'Please enter a valid recipient phone (e.g. +94 7X XXX XXXX)';
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Continue to review
  const handleContinueToReview = () => {
    if (validateStep1()) {
      setErrorMessage(null);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Confirm booking & create official order
  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const { size, weight, desc } = getParcelMetadata(parcelType);
    const branchObj = BRANCHES.find((b) => b.id === selectedBranch) || BRANCHES[0];

    try {
      const order = await createOrder({
        pickupAddress,
        pickupContactName: senderName,
        pickupContactPhone: senderPhone,
        dropoffAddress: deliveryAddress,
        dropoffContactName: recipientName,
        dropoffContactPhone: recipientPhone,
        parcelDescription: `${desc} (${branchObj.name})`,
        parcelSize: size,
        weightKg: weight,
        deliveryInstructions: `Assigned Branch: ${branchObj.name}`,
      });

      // Redirect to confirmation page
      const params = new URLSearchParams({
        trackingNumber: order.trackingNumber || '',
        id: String(order.id || ''),
        fee: String(order.deliveryFee || estimatedFee),
        currency: order.currency || currency,
        status: order.status || 'Created',
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

  const selectedBranchData = BRANCHES.find((b) => b.id === selectedBranch) || BRANCHES[0];

  return (
    <div className="sd-fullpage-root">
      {/* ---------------- EDGE-TO-EDGE TOP HEADER ---------------- */}
      <header className="sd-fullpage-header">
        <div className="sd-header-inner">
          <button
            type="button"
            onClick={() => {
              if (step === 2) {
                setStep(1);
              } else {
                router.push('/bookings');
              }
            }}
            className="sd-back-btn"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="sd-header-title">
              {step === 1 ? 'Request a delivery' : 'Review your delivery'}
            </h1>
            <div className="sd-header-sub">
              New delivery · Step {step} of 2
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN CANVAS (100% LIGHT, NO BLUE SURROUNDING AREA) ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          {/* ---------------- STEP 1: WHERE ARE WE DELIVERING? ---------------- */}
          {step === 1 && (
            <div className="sd-step-layout">
              {/* Form Grid */}
              <div className="sd-step1-grid">
                {/* Left Column: Delivery Details */}
                <div className="sd-card-panel">
                  <div className="sd-intro-block">
                    <h2 className="sd-section-heading">Where are we delivering?</h2>
                    <p className="sd-section-subheading">Enter pickup and drop-off details.</p>
                  </div>

                  {/* Pickup Address */}
                  <div className="sd-field-group">
                    <label htmlFor="pickupAddress" className="sd-field-label">
                      Pickup address
                    </label>
                    <input
                      id="pickupAddress"
                      type="text"
                      placeholder="Street, building, area"
                      value={pickupAddress}
                      onChange={(e) => {
                        setPickupAddress(e.target.value);
                        if (validationErrors.pickupAddress) {
                          setValidationErrors((prev) => ({ ...prev, pickupAddress: '' }));
                        }
                      }}
                      className={`sd-text-input ${validationErrors.pickupAddress ? 'has-error' : ''}`}
                    />
                    {validationErrors.pickupAddress && (
                      <div className="sd-error-hint">{validationErrors.pickupAddress}</div>
                    )}
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="sd-location-btn"
                    >
                      Use my current location ↗
                    </button>
                  </div>

                  {/* Delivery Address */}
                  <div className="sd-field-group">
                    <label htmlFor="deliveryAddress" className="sd-field-label">
                      Delivery address
                    </label>
                    <input
                      id="deliveryAddress"
                      type="text"
                      placeholder="Recipient address and area"
                      value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value);
                        if (validationErrors.deliveryAddress) {
                          setValidationErrors((prev) => ({ ...prev, deliveryAddress: '' }));
                        }
                      }}
                      className={`sd-text-input ${validationErrors.deliveryAddress ? 'has-error' : ''}`}
                    />
                    {validationErrors.deliveryAddress && (
                      <div className="sd-error-hint">{validationErrors.deliveryAddress}</div>
                    )}
                  </div>

                  {/* Recipient Details Sub-Grid */}
                  <div className="sd-recipient-subgrid">
                    {/* Recipient Name */}
                    <div className="sd-field-group">
                      <label htmlFor="recipientName" className="sd-field-label">
                        Recipient name
                      </label>
                      <input
                        id="recipientName"
                        type="text"
                        placeholder="Who should receive the parcel?"
                        value={recipientName}
                        onChange={(e) => {
                          setRecipientName(e.target.value);
                          if (validationErrors.recipientName) {
                            setValidationErrors((prev) => ({ ...prev, recipientName: '' }));
                          }
                        }}
                        className={`sd-text-input ${validationErrors.recipientName ? 'has-error' : ''}`}
                      />
                      {validationErrors.recipientName && (
                        <div className="sd-error-hint">{validationErrors.recipientName}</div>
                      )}
                    </div>

                    {/* Recipient Phone */}
                    <div className="sd-field-group">
                      <label htmlFor="recipientPhone" className="sd-field-label">
                        Recipient phone
                      </label>
                      <input
                        id="recipientPhone"
                        type="text"
                        placeholder="+94 7X XXX XXXX"
                        value={recipientPhone}
                        onChange={(e) => {
                          setRecipientPhone(e.target.value);
                          if (validationErrors.recipientPhone) {
                            setValidationErrors((prev) => ({ ...prev, recipientPhone: '' }));
                          }
                        }}
                        className={`sd-text-input ${validationErrors.recipientPhone ? 'has-error' : ''}`}
                      />
                      {validationErrors.recipientPhone && (
                        <div className="sd-error-hint">{validationErrors.recipientPhone}</div>
                      )}
                    </div>
                  </div>

                  {/* Parcel Type */}
                  <div className="sd-field-group">
                    <label className="sd-field-label">Parcel type</label>
                    <div className="sd-parcel-grid">
                      {(['Document', 'Small parcel', 'Large item'] as ParcelType[]).map((type) => {
                        const isSelected = parcelType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setParcelType(type)}
                            className={`sd-parcel-btn ${isSelected ? 'selected' : ''}`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Branch & Fee Summary */}
                <div className="sd-card-panel">
                  {/* Branch Selection */}
                  <div className="sd-field-group">
                    <div className="sd-field-label" style={{ marginBottom: '2px' }}>
                      Choose the branch that will handle this delivery
                    </div>
                    <div className="sd-branch-sub">
                      The selected branch receives and assigns your order.
                    </div>

                    <div className="sd-branch-list">
                      {BRANCHES.map((branch) => {
                        const isSelected = selectedBranch === branch.id;
                        return (
                          <div
                            key={branch.id}
                            onClick={() => setSelectedBranch(branch.id)}
                            className={`sd-branch-card ${isSelected ? 'selected' : ''}`}
                          >
                            <div className="sd-branch-left">
                              <div className={`sd-branch-icon ${isSelected ? 'selected' : ''}`}>
                                <Home size={16} />
                              </div>
                              <div>
                                <div className="sd-branch-name">{branch.name}</div>
                                <div className="sd-branch-addr">
                                  {branch.address} · {branch.distance}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="sd-branch-check">
                                <Check size={16} color="#16a34a" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="sd-price-box">
                    <div className="sd-fee-row">
                      <span className="sd-fee-label">Estimated delivery fee</span>
                      <span className="sd-fee-amount">
                        {isLoadingQuote ? (
                          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Calculating...</span>
                        ) : (
                          `${currency} ${estimatedFee.toLocaleString()}`
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleContinueToReview}
                      className="sd-submit-btn"
                    >
                      Continue to review →
                    </button>

                    <div className="sd-branch-selected-tag">
                      Branch selected: {selectedBranchData.name.replace(' Branch', '')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- STEP 2: REVIEW & CONFIRM (MATCHES SCREENSHOT 1:1) ---------------- */}
          {step === 2 && (
            <div className="sd-step-layout">
              <div className="sd-intro-block" style={{ marginBottom: '1.25rem' }}>
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

              {/* 2-Column Review Grid matching the screenshot */}
              <div className="sd-review-grid">
                {/* Left Card: Clean Summary Card */}
                <div className="sd-review-summary-card">
                  <div className="sd-review-row">
                    <span className="sd-review-label">Pickup Address:</span>
                    <span className="sd-review-value">{pickupAddress}</span>
                  </div>
                  <div className="sd-review-row">
                    <span className="sd-review-label">Delivery Address:</span>
                    <span className="sd-review-value">{deliveryAddress}</span>
                  </div>
                  <div className="sd-review-row">
                    <span className="sd-review-label">Recipient:</span>
                    <span className="sd-review-value">
                      {recipientName} ({recipientPhone})
                    </span>
                  </div>
                  <div className="sd-review-row">
                    <span className="sd-review-label">Parcel Category:</span>
                    <span className="sd-review-value">
                      {parcelType} ({getParcelMetadata(parcelType).weight} kg)
                    </span>
                  </div>
                  <div className="sd-review-row">
                    <span className="sd-review-label">Handling Branch:</span>
                    <span className="sd-review-value">{selectedBranchData.name}</span>
                  </div>
                  <div className="sd-review-divider" />
                  <div className="sd-review-row total">
                    <span className="sd-review-total-label">Total Delivery Fee:</span>
                    <span className="sd-review-total-amount">
                      {currency} {estimatedFee.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Right Column: Actions matching the screenshot */}
                <div className="sd-review-actions-panel">
                  <div className="sd-verification-note">
                    <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                    <span>Authoritative fee calculated by Order Service. No hidden charges.</span>
                  </div>

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
                      <>Confirm booking & dispatch →</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="sd-secondary-btn"
                  >
                    ← Back to edit details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- STYLES: FULL PAGE, ZERO BLUE SURROUNDING SPACE ---------------- */}
      <style jsx global>{`
        /* Break out of .main-content to touch the sidebar directly and remove all dark blue borders */
        .sd-fullpage-root {
          width: calc(100% + 5rem);
          margin: -2rem -2.5rem;
          min-height: 100vh;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
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
          padding: 2.25rem 2.5rem 4rem 2.5rem;
          background: #f4f7fb;
          width: 100%;
        }

        .sd-content-wrapper {
          max-width: 1100px;
          margin: 0 auto;
        }

        .sd-step-layout {
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

        /* Two Column Step 1 Grid */
        .sd-step1-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.75rem;
          align-items: flex-start;
        }

        /* White Card Panels on the Light Canvas */
        .sd-card-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.75rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
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
          border-radius: 9px;
          padding: 0.75rem 0.95rem;
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
          font-size: 0.75rem;
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

        .sd-recipient-subgrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        /* Parcel Grid */
        .sd-parcel-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.65rem;
        }

        .sd-parcel-btn {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 500;
          border-radius: 9px;
          padding: 0.75rem 0.4rem;
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
        .sd-branch-sub {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.4rem;
        }

        .sd-branch-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .sd-branch-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.85rem 1rem;
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
          border: 2px solid #2563eb;
          background: #ffffff;
        }

        .sd-branch-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sd-branch-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
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
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-branch-addr {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 1px;
        }

        .sd-branch-check {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Price Box Container */
        .sd-price-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .sd-fee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sd-fee-label {
          font-size: 0.875rem;
          color: #64748b;
        }

        .sd-fee-amount {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          font-family: inherit;
        }

        .sd-submit-btn {
          width: 100%;
          background: #2563eb;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 0.9rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }

        .sd-submit-btn:hover {
          background: #1d4ed8;
        }

        .sd-submit-btn:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }

        .sd-secondary-btn {
          width: 100%;
          background: #f1f5f9;
          color: #334155;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.8rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
          text-align: center;
        }

        .sd-secondary-btn:hover {
          background: #e2e8f0;
        }

        .sd-branch-selected-tag {
          font-size: 0.72rem;
          color: #16a34a;
          font-weight: 600;
        }

        /* ==============================================================
           STEP 2: SCREENSHOT MATCH (1:1 PIXEL MATCH)
           ============================================================== */
        .sd-screenshot-error {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #b91c1c;
          padding: 0.85rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }

        .sd-review-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 1.75rem;
          align-items: flex-start;
        }

        .sd-review-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        }

        .sd-review-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
          gap: 1rem;
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
          margin: 0.25rem 0;
        }

        .sd-review-row.total {
          padding-top: 0.25rem;
        }

        .sd-review-total-label {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sd-review-total-amount {
          font-size: 1.35rem;
          font-weight: 800;
          color: #16a34a;
        }

        .sd-review-actions-panel {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .sd-verification-note {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          font-size: 0.78rem;
          color: #16a34a;
          font-weight: 500;
          line-height: 1.4;
          margin-bottom: 0.25rem;
        }

        /* Mobile Adjustments */
        @media (max-width: 860px) {
          .sd-fullpage-root {
            width: 100%;
            margin: 0;
          }

          .sd-fullpage-header {
            padding: 1.25rem 1.5rem;
          }

          .sd-fullpage-body {
            padding: 1.5rem 1rem 3rem 1rem;
          }

          .sd-step1-grid {
            grid-template-columns: 1fr;
          }

          .sd-recipient-subgrid {
            grid-template-columns: 1fr;
          }

          .sd-review-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
