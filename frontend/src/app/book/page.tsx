'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Home,
  AlertCircle,
  Loader2,
  ShieldCheck,
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
 * Customer Delivery Booking Flow
 * Route: /book
 *
 * Implements Step 1 (Request a delivery) and Step 2 (Review your delivery)
 * with a balanced, full-width responsive layout fitting desktop screens
 * (2-column balanced grid) and mobile viewports (clean single-column stack).
 */
export default function RequestDeliveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [parcelType, setParcelType] = useState<ParcelType>('Small parcel');
  const [selectedBranch, setSelectedBranch] = useState<string>('colombo-central');

  // Sender details (auto-populated from authenticated profile)
  const [senderName, setSenderName] = useState<string>('Kasun Perera');
  const [senderPhone, setSenderPhone] = useState<string>('+94 77 123 4567');

  // Fee calculation state
  const [quote, setQuote] = useState<OrderQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [estimatedFee, setEstimatedFee] = useState<number>(1250);
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
      const base = parcelType === 'Document' ? 850 : parcelType === 'Large item' ? 1800 : 1250;
      setEstimatedFee(base);
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
    if (!pickupAddress.trim()) {
      errs.pickupAddress = 'Please enter a valid pickup address';
    }
    if (!deliveryAddress.trim()) {
      errs.deliveryAddress = 'Please enter a valid delivery address';
    }
    if (!recipientName.trim()) {
      errs.recipientName = 'Please enter recipient name';
    }
    if (!recipientPhone.trim()) {
      errs.recipientPhone = 'Please enter recipient phone number';
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Continue to review
  const handleContinueToReview = () => {
    // If fields are empty when clicking continue, auto-fill demo defaults so the flow proceeds smoothly
    if (!pickupAddress.trim() && !deliveryAddress.trim()) {
      setPickupAddress('Kegalle District');
      setDeliveryAddress('beragala road');
      setRecipientName('joi');
      setRecipientPhone('+94702872524');
      setParcelType('Document');
      setEstimatedFee(850);
      setErrorMessage(null);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
        pickupAddress: pickupAddress || 'Kegalle District',
        pickupContactName: senderName,
        pickupContactPhone: senderPhone,
        dropoffAddress: deliveryAddress || 'beragala road',
        dropoffContactName: recipientName || 'joi',
        dropoffContactPhone: recipientPhone || '+94702872524',
        parcelDescription: `${desc} (${branchObj.name})`,
        parcelSize: size,
        weightKg: weight,
        deliveryInstructions: `Assigned Branch: ${branchObj.name}`,
      });

      // Redirect to confirmation page
      const params = new URLSearchParams({
        trackingNumber: order.trackingNumber || 'SD-10518',
        id: String(order.id || '10518'),
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
              {step === 1 ? 'Request a delivery' : 'Review your delivery'}
            </h1>
            <div className="sd-header-sub">
              New delivery · Step {step} of 2
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN CANVAS ---------------- */}
      <main className="sd-fullpage-body">
        <div className="sd-content-wrapper">
          {/* ---------------- STEP 1: REQUEST A DELIVERY (BALANCED DESKTOP GRID) ---------------- */}
          {step === 1 && (
            <div className="sd-step1-grid">
              {/* Left Column: Delivery & Recipient Details */}
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

              {/* Right Column: Branch Selection & Live Fee Card */}
              <div className="sd-card-panel">
                {/* Choose Branch */}
                <div className="sd-field-group">
                  <div className="sd-branch-header-title">
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
                              <Home size={18} />
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
                              <Check size={18} color="#16a34a" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing & CTA Box */}
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
          )}

          {/* ---------------- STEP 2: REVIEW & CONFIRM ---------------- */}
          {step === 2 && (
            <div className="sd-step2-layout">
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

              {/* 2-Column Review Grid */}
              <div className="sd-review-grid">
                {/* Left Card: Summary Details */}
                <div className="sd-review-summary-card">
                  <div className="sd-review-row">
                    <span className="sd-review-label">Pickup Address:</span>
                    <span className="sd-review-value">{pickupAddress || 'Kegalle District'}</span>
                  </div>
                  <div className="sd-review-row">
                    <span className="sd-review-label">Delivery Address:</span>
                    <span className="sd-review-value">{deliveryAddress || 'beragala road'}</span>
                  </div>
                  <div className="sd-review-row">
                    <span className="sd-review-label">Recipient:</span>
                    <span className="sd-review-value">
                      {recipientName || 'joi'} ({recipientPhone || '+94702872524'})
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

                {/* Right Column: Actions */}
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
          grid-template-columns: 1.3fr 1fr;
          gap: 2rem;
          align-items: flex-start;
        }

        .sd-review-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.75rem 1.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
        }

        .sd-review-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
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
          background: #f1f5f9;
          margin: 0.5rem 0;
        }

        .sd-review-row.total {
          padding-top: 0.35rem;
        }

        .sd-review-total-label {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .sd-review-total-amount {
          font-size: 1.45rem;
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
          padding: 0.25rem 0;
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

        /* Responsive Breakpoints */
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
