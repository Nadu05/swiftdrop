'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import type { PricingRule, ParcelSizeBracket, DeliveryZone } from './types';

interface PricingRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ruleData: Omit<PricingRule, 'id' | 'ruleCode' | 'version' | 'status' | 'publishedAt'>) => Promise<void>;
  initialRule?: PricingRule | null;
  zones: DeliveryZone[];
}

export default function PricingRuleFormModal({
  isOpen,
  onClose,
  onSave,
  initialRule,
  zones,
}: PricingRuleFormModalProps) {
  const [name, setName] = useState('');
  const [zoneId, setZoneId] = useState('ALL');
  const [baseFee, setBaseFee] = useState<number>(350);
  const [includedWeightKg, setIncludedWeightKg] = useState<number>(1.0);
  const [extraWeightSurchargePerKg, setExtraWeightSurchargePerKg] = useState<number>(75);
  const [distanceSurchargePerKm, setDistanceSurchargePerKm] = useState<number>(25);
  const [zoneSurcharge, setZoneSurcharge] = useState<number>(100);
  const [parcelSize, setParcelSize] = useState<ParcelSizeBracket>('ALL');
  const [maxWeightKg, setMaxWeightKg] = useState<number>(20.0);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name);
      setZoneId(initialRule.zoneId || 'ALL');
      setBaseFee(initialRule.baseFee);
      setIncludedWeightKg(initialRule.includedWeightKg);
      setExtraWeightSurchargePerKg(initialRule.extraWeightSurchargePerKg);
      setDistanceSurchargePerKm(initialRule.distanceSurchargePerKm);
      setZoneSurcharge(initialRule.zoneSurcharge);
      setParcelSize(initialRule.parcelSize);
      setMaxWeightKg(initialRule.maxWeightKg);
      setEffectiveDate(initialRule.effectiveDate);
    } else {
      setName('');
      setZoneId('ALL');
      setBaseFee(350);
      setIncludedWeightKg(1.0);
      setExtraWeightSurchargePerKg(75);
      setDistanceSurchargePerKm(25);
      setZoneSurcharge(100);
      setParcelSize('ALL');
      setMaxWeightKg(20.0);
      setEffectiveDate(new Date().toISOString().split('T')[0]);
    }
    setErrors({});
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Pricing rule name is required.';
    if (baseFee < 0) errs.baseFee = 'Base fee cannot be negative.';
    if (includedWeightKg <= 0) errs.includedWeightKg = 'Included weight must be greater than 0 kg.';
    if (extraWeightSurchargePerKg < 0) errs.extraWeightSurchargePerKg = 'Rate cannot be negative.';
    if (distanceSurchargePerKm < 0) errs.distanceSurchargePerKm = 'Rate cannot be negative.';
    if (zoneSurcharge < 0) errs.zoneSurcharge = 'Zone surcharge cannot be negative.';
    if (maxWeightKg <= includedWeightKg) {
      errs.maxWeightKg = 'Maximum weight must exceed included weight allowance.';
    }
    if (!effectiveDate) errs.effectiveDate = 'Effective date is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const targetZone = zones.find((z) => z.id === zoneId);

      await onSave({
        name: name.trim(),
        zoneId,
        zoneName: zoneId === 'ALL' ? 'All Delivery Zones' : targetZone?.name || 'Selected Zone',
        baseFee: Number(baseFee),
        includedWeightKg: Number(includedWeightKg),
        extraWeightSurchargePerKg: Number(extraWeightSurchargePerKg),
        distanceSurchargePerKm: Number(distanceSurchargePerKm),
        zoneSurcharge: Number(zoneSurcharge),
        parcelSize,
        maxWeightKg: Number(maxWeightKg),
        effectiveDate,
        updatedBy: 'Naduka Abeykoon (Head Office Admin)',
      });

      onClose();
    } catch (err: any) {
      setErrors({ form: err?.message || 'Failed to save pricing rule.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dispatcher-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pricing-rule-modal-title">
      <div className="dispatcher-modal-content" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div className="dispatcher-modal-header__info">
            <h3 id="pricing-rule-modal-title" className="dispatcher-modal-title">
              {initialRule ? 'Edit Pricing Rule' : 'Create New Pricing Rule'}
            </h3>
            <p className="dispatcher-modal-subtitle">
              Configure tariffs, weight allowances, and distance surcharges (all in LKR)
            </p>
          </div>
          <button
            type="button"
            className="dispatcher-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="dispatcher-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {errors.form && (
              <div className="dispatcher-reports-alert dispatcher-reports-alert--error">
                <AlertCircle size={16} />
                <span>{errors.form}</span>
              </div>
            )}

            {/* Rule Name & Target Zone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-name" className="dispatcher-reports-filter-label">
                  Rule Name *
                </label>
                <input
                  id="rule-name"
                  type="text"
                  className="dispatcher-reports-date-input"
                  placeholder="e.g. Standard Metro Delivery"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.name}</span>}
              </div>

              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-zone" className="dispatcher-reports-filter-label">
                  Applicable Zone Scope
                </label>
                <div className="dispatcher-select-wrapper">
                  <select
                    id="rule-zone"
                    className="dispatcher-select dispatcher-reports-select"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                  >
                    <option value="ALL">All Delivery Zones</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Base Fee & Parcel Size */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-base-fee" className="dispatcher-reports-filter-label">
                  Base Fee (LKR) *
                </label>
                <input
                  id="rule-base-fee"
                  type="number"
                  min="0"
                  step="10"
                  className="dispatcher-reports-date-input"
                  value={baseFee}
                  onChange={(e) => setBaseFee(Number(e.target.value))}
                />
                {errors.baseFee && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.baseFee}</span>}
              </div>

              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-parcel-size" className="dispatcher-reports-filter-label">
                  Parcel Size Category
                </label>
                <div className="dispatcher-select-wrapper">
                  <select
                    id="rule-parcel-size"
                    className="dispatcher-select dispatcher-reports-select"
                    value={parcelSize}
                    onChange={(e) => setParcelSize(e.target.value as ParcelSizeBracket)}
                  >
                    <option value="ALL">All Sizes</option>
                    <option value="SMALL">Small (Documents, letters)</option>
                    <option value="MEDIUM">Medium (Shoebox size)</option>
                    <option value="LARGE">Large (Heavy cartons)</option>
                    <option value="EXTRA_LARGE">Extra Large (Pallet / Freight)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Weight Allowances */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-inc-weight" className="dispatcher-reports-filter-label">
                  Included Wt. (kg) *
                </label>
                <input
                  id="rule-inc-weight"
                  type="number"
                  min="0.1"
                  step="0.5"
                  className="dispatcher-reports-date-input"
                  value={includedWeightKg}
                  onChange={(e) => setIncludedWeightKg(Number(e.target.value))}
                />
                {errors.includedWeightKg && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.includedWeightKg}</span>}
              </div>

              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-extra-wt" className="dispatcher-reports-filter-label">
                  Extra Wt. (LKR/kg) *
                </label>
                <input
                  id="rule-extra-wt"
                  type="number"
                  min="0"
                  step="5"
                  className="dispatcher-reports-date-input"
                  value={extraWeightSurchargePerKg}
                  onChange={(e) => setExtraWeightSurchargePerKg(Number(e.target.value))}
                />
              </div>

              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-max-wt" className="dispatcher-reports-filter-label">
                  Max Wt. Limit (kg) *
                </label>
                <input
                  id="rule-max-wt"
                  type="number"
                  min="1"
                  step="1"
                  className="dispatcher-reports-date-input"
                  value={maxWeightKg}
                  onChange={(e) => setMaxWeightKg(Number(e.target.value))}
                />
                {errors.maxWeightKg && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.maxWeightKg}</span>}
              </div>
            </div>

            {/* Surcharges & Effective Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-distance-rate" className="dispatcher-reports-filter-label">
                  Distance (LKR/km) *
                </label>
                <input
                  id="rule-distance-rate"
                  type="number"
                  min="0"
                  step="5"
                  className="dispatcher-reports-date-input"
                  value={distanceSurchargePerKm}
                  onChange={(e) => setDistanceSurchargePerKm(Number(e.target.value))}
                />
              </div>

              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-zone-surcharge" className="dispatcher-reports-filter-label">
                  Cross-Zone (LKR) *
                </label>
                <input
                  id="rule-zone-surcharge"
                  type="number"
                  min="0"
                  step="10"
                  className="dispatcher-reports-date-input"
                  value={zoneSurcharge}
                  onChange={(e) => setZoneSurcharge(Number(e.target.value))}
                />
              </div>

              <div className="dispatcher-reports-filter-group">
                <label htmlFor="rule-effective-date" className="dispatcher-reports-filter-label">
                  Effective Date *
                </label>
                <input
                  id="rule-effective-date"
                  type="date"
                  className="dispatcher-reports-date-input"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
                {errors.effectiveDate && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.effectiveDate}</span>}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="dispatcher-modal-footer">
            <button
              type="button"
              className="dispatcher-overview__refresh-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dispatcher-btn-primary"
              disabled={isSubmitting}
            >
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? 'Saving...' : initialRule ? 'Save as Draft Revision' : 'Create Draft Rule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

