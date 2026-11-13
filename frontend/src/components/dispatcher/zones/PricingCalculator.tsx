'use client';

import React, { useState } from 'react';
import { Calculator, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import type { DeliveryZone, ParcelSizeBracket, FeeCalculationResult } from './types';
import { calculateFeeEstimate, formatLKR } from './zonesPricingApi';

interface PricingCalculatorProps {
  zones: DeliveryZone[];
}

export default function PricingCalculator({ zones }: PricingCalculatorProps) {
  const [pickupZoneId, setPickupZoneId] = useState(zones[0]?.id || 'ZN-001');
  const [destinationZoneId, setDestinationZoneId] = useState(zones[1]?.id || 'ZN-002');
  const [weightKg, setWeightKg] = useState<number>(2.5);
  const [parcelSize, setParcelSize] = useState<ParcelSizeBracket>('MEDIUM');
  const [distanceKm, setDistanceKm] = useState<number>(14.5);
  const [result, setResult] = useState<FeeCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCalculating(true);
      const res = await calculateFeeEstimate({
        pickupZoneId,
        destinationZoneId,
        weightKg: Number(weightKg),
        parcelSize,
        distanceKm: Number(distanceKm),
      });
      setResult(res);
    } catch (err) {
      console.error('Calculation failed:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const pickupZoneName = zones.find((z) => z.id === pickupZoneId)?.name || 'Pickup Zone';
  const destZoneName = zones.find((z) => z.id === destinationZoneId)?.name || 'Destination Zone';

  return (
    <article className="dispatcher-card dispatcher-calculator-card" style={{ padding: '1.35rem' }}>
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Delivery Fee Tariff Calculator</h2>
          <p className="dispatcher-card__subtitle">
            Simulate parcel quotes and audit delivery surcharge formulas across zones
          </p>
        </div>
        <span className="dispatcher-pill-badge">TEST ESTIMATOR</span>
      </div>

      <div className="dispatcher-calculator-layout">
        {/* Input Parameters Form */}
        <form onSubmit={handleCalculate} className="dispatcher-calculator-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {/* Pickup Zone */}
            <div className="dispatcher-reports-filter-group">
              <label htmlFor="calc-pickup" className="dispatcher-reports-filter-label">
                Origin / Pickup Zone
              </label>
              <div className="dispatcher-select-wrapper">
                <select
                  id="calc-pickup"
                  className="dispatcher-select dispatcher-reports-select"
                  value={pickupZoneId}
                  onChange={(e) => setPickupZoneId(e.target.value)}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination Zone */}
            <div className="dispatcher-reports-filter-group">
              <label htmlFor="calc-dest" className="dispatcher-reports-filter-label">
                Destination Zone
              </label>
              <div className="dispatcher-select-wrapper">
                <select
                  id="calc-dest"
                  className="dispatcher-select dispatcher-reports-select"
                  value={destinationZoneId}
                  onChange={(e) => setDestinationZoneId(e.target.value)}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
            {/* Weight */}
            <div className="dispatcher-reports-filter-group">
              <label htmlFor="calc-weight" className="dispatcher-reports-filter-label">
                Parcel Weight (kg)
              </label>
              <input
                id="calc-weight"
                type="number"
                min="0.1"
                step="0.1"
                className="dispatcher-reports-date-input"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
              />
            </div>

            {/* Size */}
            <div className="dispatcher-reports-filter-group">
              <label htmlFor="calc-size" className="dispatcher-reports-filter-label">
                Parcel Category
              </label>
              <div className="dispatcher-select-wrapper">
                <select
                  id="calc-size"
                  className="dispatcher-select dispatcher-reports-select"
                  value={parcelSize}
                  onChange={(e) => setParcelSize(e.target.value as ParcelSizeBracket)}
                >
                  <option value="SMALL">Small (Documents)</option>
                  <option value="MEDIUM">Medium (Shoebox)</option>
                  <option value="LARGE">Large (Carton)</option>
                  <option value="EXTRA_LARGE">Extra Large (Heavy)</option>
                </select>
              </div>
            </div>

            {/* Estimated Distance */}
            <div className="dispatcher-reports-filter-group">
              <label htmlFor="calc-dist" className="dispatcher-reports-filter-label">
                Transit Distance (km)
              </label>
              <input
                id="calc-dist"
                type="number"
                min="1"
                step="0.5"
                className="dispatcher-reports-date-input"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
              />
            </div>
          </div>

          <button
            type="submit"
            className="dispatcher-btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
            disabled={isCalculating}
          >
            <Calculator size={15} />
            <span>{isCalculating ? 'Computing Tariff...' : 'Calculate Delivery Estimate'}</span>
          </button>
        </form>

        {/* Calculation Result Breakdown */}
        <div className="dispatcher-calculator-result-panel">
          {result ? (
            <div className="dispatcher-calculator-breakdown">
              <div className="dispatcher-calculator-route-summary">
                <span className="dispatcher-calculator-route-pill">{pickupZoneName}</span>
                <ArrowRight size={14} color="#64748b" />
                <span className="dispatcher-calculator-route-pill">{destZoneName}</span>
              </div>

              <div className="dispatcher-calculator-rule-info">
                Applied Tariff: <strong>{result.appliedRuleName}</strong> ({result.appliedRuleCode})
                {result.isInterZone && (
                  <span className="dispatcher-calculator-interzone-tag">Inter-Zone Crossing</span>
                )}
              </div>

              <div className="dispatcher-calculator-items-list">
                <div className="dispatcher-calculator-item-row">
                  <span>Base Delivery Fee</span>
                  <strong>{formatLKR(result.baseFee)}</strong>
                </div>
                <div className="dispatcher-calculator-item-row">
                  <span>Weight Surcharge (excess weight)</span>
                  <strong>{formatLKR(result.weightSurcharge)}</strong>
                </div>
                <div className="dispatcher-calculator-item-row">
                  <span>Distance Transit Surcharge ({distanceKm} km)</span>
                  <strong>{formatLKR(result.distanceSurcharge)}</strong>
                </div>
                <div className="dispatcher-calculator-item-row">
                  <span>Zone Crossing Surcharge</span>
                  <strong>{formatLKR(result.zoneSurcharge)}</strong>
                </div>
              </div>

              <div className="dispatcher-calculator-total-row">
                <span>Total Estimated Charge</span>
                <span className="dispatcher-calculator-total-val">
                  {formatLKR(result.totalEstimatedFee)}
                </span>
              </div>

              <div className="dispatcher-calculator-disclaimer">
                <Info size={14} color="#64748b" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <strong>Estimate Disclaimer:</strong> This calculation is an operational simulation based
                  on published tariff rules. Official customer booking fees may adjust dynamically based on
                  peak-hour traffic and merchant volume agreements.
                </span>
              </div>
            </div>
          ) : (
            <div className="dispatcher-calculator-placeholder">
              <Calculator size={36} color="#94a3b8" />
              <p>Adjust parameters and click <strong>Calculate Delivery Estimate</strong> to inspect the pricing breakdown.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

