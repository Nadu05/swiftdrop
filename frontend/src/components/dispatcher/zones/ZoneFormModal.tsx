'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DeliveryZone, ZoneStatus } from './types';

interface ZoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (zoneData: Omit<DeliveryZone, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialZone?: DeliveryZone | null;
  branches: { id: string; name: string; code: string }[];
}

export default function ZoneFormModal({
  isOpen,
  onClose,
  onSave,
  initialZone,
  branches,
}: ZoneFormModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [coverageAreasInput, setCoverageAreasInput] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ZoneStatus>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialZone) {
      setName(initialZone.name);
      setCode(initialZone.code);
      setBranchId(initialZone.branchId);
      setCoverageAreasInput(initialZone.coverageAreas.join(', '));
      setDescription(initialZone.description || '');
      setStatus(initialZone.status);
    } else {
      setName('');
      setCode('ZONE-');
      setBranchId(branches[0]?.id || '1');
      setCoverageAreasInput('');
      setDescription('');
      setStatus('ACTIVE');
    }
    setErrors({});
  }, [initialZone, branches, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Zone name is mandatory.';
    if (!code.trim() || code.trim() === 'ZONE-') errs.code = 'Zone code is required (e.g., ZONE-CMB-01).';
    if (!branchId) errs.branchId = 'Associated branch selection is required.';
    if (!coverageAreasInput.trim()) errs.coverageAreas = 'Specify at least one coverage area or suburb.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const selectedBranch = branches.find((b) => b.id === branchId);
      const areas = coverageAreasInput
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        branchId,
        branchName: selectedBranch?.name || 'Central Hub',
        coverageAreas: areas,
        description: description.trim(),
        status,
      });

      onClose();
    } catch (err: any) {
      setErrors({ form: err?.message || 'Failed to save delivery zone.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dispatcher-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="zone-form-modal-title">
      <div className="dispatcher-modal-content" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div className="dispatcher-modal-header__info">
            <h3 id="zone-form-modal-title" className="dispatcher-modal-title">
              {initialZone ? 'Edit Delivery Zone' : 'Add New Delivery Zone'}
            </h3>
            <p className="dispatcher-modal-subtitle">
              Define operational coverage boundaries and associated dispatch hubs
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Zone Name */}
              <div className="dispatcher-reports-filter-group">
                <label htmlFor="form-zone-name" className="dispatcher-reports-filter-label">
                  Zone Name *
                </label>
                <input
                  id="form-zone-name"
                  type="text"
                  className="dispatcher-reports-date-input"
                  placeholder="e.g. Colombo Central Metro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.name}</span>}
              </div>

              {/* Zone Code */}
              <div className="dispatcher-reports-filter-group">
                <label htmlFor="form-zone-code" className="dispatcher-reports-filter-label">
                  Zone Code *
                </label>
                <input
                  id="form-zone-code"
                  type="text"
                  className="dispatcher-reports-date-input"
                  placeholder="e.g. ZONE-CMB-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                {errors.code && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.code}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Associated Branch */}
              <div className="dispatcher-reports-filter-group">
                <label htmlFor="form-zone-branch" className="dispatcher-reports-filter-label">
                  Associated Branch *
                </label>
                <div className="dispatcher-select-wrapper">
                  <select
                    id="form-zone-branch"
                    className="dispatcher-select dispatcher-reports-select"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.branchId && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.branchId}</span>}
              </div>

              {/* Status */}
              <div className="dispatcher-reports-filter-group">
                <label htmlFor="form-zone-status" className="dispatcher-reports-filter-label">
                  Operating Status *
                </label>
                <div className="dispatcher-select-wrapper">
                  <select
                    id="form-zone-status"
                    className="dispatcher-select dispatcher-reports-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ZoneStatus)}
                  >
                    <option value="ACTIVE">Active (Available for dispatch)</option>
                    <option value="INACTIVE">Inactive (Suspended)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Coverage Areas */}
            <div className="dispatcher-reports-filter-group">
              <label htmlFor="form-zone-areas" className="dispatcher-reports-filter-label">
                Coverage Areas (Comma-separated suburbs/districts) *
              </label>
              <input
                id="form-zone-areas"
                type="text"
                className="dispatcher-reports-date-input"
                placeholder="e.g. Fort, Pettah, Kollupitiya, Bambalapitiya"
                value={coverageAreasInput}
                onChange={(e) => setCoverageAreasInput(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Enter suburbs or delivery locations separated by commas.
              </span>
              {errors.coverageAreas && <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errors.coverageAreas}</span>}
            </div>

            {/* Description */}
            <div className="dispatcher-reports-filter-group">
              <label htmlFor="form-zone-desc" className="dispatcher-reports-filter-label">
                Operational Description (Optional)
              </label>
              <textarea
                id="form-zone-desc"
                className="dispatcher-reports-date-input"
                rows={3}
                placeholder="Specific delivery logistics notes or terrain considerations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
              <span>{isSubmitting ? 'Saving...' : initialZone ? 'Update Zone' : 'Create Zone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

