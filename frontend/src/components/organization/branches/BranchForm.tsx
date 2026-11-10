'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Save,
} from 'lucide-react';
import BranchFormSection from './BranchFormSection';
import {
  branchFormSchema,
  DEFAULT_BRANCH_FORM_VALUES,
  type BranchFormValues,
} from '@/schema/branch.schema';
import { OrganizationApiError } from '@/api/services/organization.api';
import type { BranchResponse } from '@/types/organization.types';

export interface BranchFormProps {
  mode: 'create' | 'edit';
  initialValues?: BranchFormValues;
  branchStatus?: BranchResponse['status'];
  onSubmit: (values: BranchFormValues) => Promise<BranchResponse>;
  onCancel: () => void;
  onSuccessNavigate: (savedBranch: BranchResponse) => void;
}

const VALID_FORM_FIELDS: readonly (keyof BranchFormValues)[] = [
  'code',
  'name',
  'addressLine1',
  'addressLine2',
  'city',
  'phone',
  'email',
  'latitude',
  'longitude',
];

export default function BranchForm({
  mode,
  initialValues = DEFAULT_BRANCH_FORM_VALUES,
  branchStatus,
  onSubmit,
  onCancel,
  onSuccessNavigate,
}: BranchFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConflictError, setIsConflictError] = useState<boolean>(false);
  const [savedBranch, setSavedBranch] = useState<BranchResponse | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    mode: 'onTouched',
    defaultValues: initialValues,
  });

  // Sync form values when initialValues load asynchronously on Edit page
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const handleFormSubmit = async (values: BranchFormValues) => {
    setSubmitError(null);
    setIsConflictError(false);
    setSavedBranch(null);

    try {
      const response = await onSubmit(values);
      setSavedBranch(response);
      // Brief pause so user sees the confirmed API success banner before navigating,
      // while also providing an immediate "Return to Branch Directory" button.
      setTimeout(() => {
        onSuccessNavigate(response);
      }, 900);
    } catch (err: unknown) {
      if (err instanceof OrganizationApiError) {
        setSubmitError(err.message);
        setIsConflictError(err.isConflict);

        if (err.fieldErrors) {
          for (const [fieldKey, message] of Object.entries(err.fieldErrors)) {
            if (VALID_FORM_FIELDS.includes(fieldKey as keyof BranchFormValues)) {
              setError(fieldKey as keyof BranchFormValues, {
                type: 'server',
                message,
              });
            }
          }
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError(
          mode === 'create'
            ? 'An unexpected error occurred while creating the branch.'
            : 'An unexpected error occurred while updating the branch.'
        );
      }
    }
  };

  const handleReset = () => {
    setSubmitError(null);
    setIsConflictError(false);
    reset(initialValues);
  };

  const isDisabled = isSubmitting || Boolean(savedBranch);

  return (
    <form
      className="org-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      aria-label={mode === 'create' ? 'Create New Branch Form' : 'Edit Branch Form'}
    >
      {/* API Success Confirmation Banner (shown only after API confirms 200/201) */}
      {savedBranch && (
        <div className="org-form-alert org-form-alert--success" role="status" aria-live="polite">
          <div className="org-form-alert__content">
            <CheckCircle2 size={20} className="org-form-alert__icon" aria-hidden="true" />
            <div className="org-form-alert__text">
              <strong className="org-form-alert__title">
                {mode === 'create'
                  ? 'Branch created successfully!'
                  : 'Branch changes saved successfully!'}
              </strong>
              <p className="org-form-alert__desc">
                Branch <strong>{savedBranch.name}</strong> (
                <code className="org-inline-code">{savedBranch.code}</code>) has been saved in
                the Organization Service. Redirecting to the Branch Directory...
              </p>
            </div>
          </div>

          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => onSuccessNavigate(savedBranch)}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Return Now</span>
          </button>
        </div>
      )}

      {/* API Error Banner (including 409 Conflict Duplicate Branch Code) */}
      {submitError && (
        <div className="org-form-alert org-form-alert--error" role="alert">
          <div className="org-form-alert__content">
            <AlertCircle size={20} className="org-form-alert__icon" aria-hidden="true" />
            <div className="org-form-alert__text">
              <strong className="org-form-alert__title">
                {isConflictError
                  ? 'Duplicate Branch Code Conflict (HTTP 409)'
                  : mode === 'create'
                  ? 'Unable to Create Branch'
                  : 'Unable to Save Branch Changes'}
              </strong>
              <p className="org-form-alert__desc">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Required Fields Legend */}
      <div className="org-form__legend">
        <span>
          Fields marked with <abbr title="required" className="org-form-required">*</abbr> are
          required by the Organization Service contract.
        </span>
        {mode === 'edit' && branchStatus && (
          <span className="org-form__status-note">
            <span>Current Status:</span>
            <span
              className={`org-status-badge ${
                branchStatus === 'ACTIVE'
                  ? 'org-status-badge--active'
                  : 'org-status-badge--inactive'
              }`}
            >
              <span className="org-status-badge__dot" aria-hidden="true" />
              <span>{branchStatus === 'ACTIVE' ? 'Active' : 'Inactive'}</span>
            </span>
          </span>
        )}
      </div>

      {/* SECTION 1: Branch Identity */}
      <BranchFormSection
        id="org-section-identity"
        title="Branch Identity"
        description="Official branch name and unique identifier code used across the SwiftDrop network."
        icon={Building2}
      >
        <div className="org-form-grid org-form-grid--2">
          {/* Branch Name */}
          <div className="org-form-field">
            <label htmlFor="branch-name" className="org-form-label">
              <span>Branch Name</span>
              <span className="org-form-required" aria-hidden="true">*</span>
            </label>
            <input
              id="branch-name"
              type="text"
              className={`org-form-input${errors.name ? ' org-form-input--error' : ''}`}
              placeholder="e.g. Colombo Central"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'branch-name-error' : 'branch-name-hint'}
              {...register('name')}
            />
            <span id="branch-name-hint" className="org-form-hint">
              Human-readable regional hub name displayed to dispatchers and staff (max 255 characters).
            </span>
            {errors.name && (
              <p id="branch-name-error" className="org-form-error" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Branch Code */}
          <div className="org-form-field">
            <label htmlFor="branch-code" className="org-form-label">
              <span>Branch Code</span>
              <span className="org-form-required" aria-hidden="true">*</span>
            </label>
            <input
              id="branch-code"
              type="text"
              className={`org-form-input org-form-input--mono${
                errors.code ? ' org-form-input--error' : ''
              }`}
              placeholder="e.g. CMB-CENTRAL"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.code)}
              aria-describedby={errors.code ? 'branch-code-error' : 'branch-code-hint'}
              {...register('code')}
            />
            <span id="branch-code-hint" className="org-form-hint">
              Unique alphanumeric code (letters, numbers, hyphens, underscores; max 50 characters).
            </span>
            {errors.code && (
              <p id="branch-code-error" className="org-form-error" role="alert">
                {errors.code.message}
              </p>
            )}
          </div>
        </div>
      </BranchFormSection>

      {/* SECTION 2: Address & Geographic Coordinates */}
      <BranchFormSection
        id="org-section-location"
        title="Address &amp; Geographic Coordinates"
        description="Physical street address, municipality, and GPS coordinates for branch routing and service area resolution."
        icon={MapPin}
      >
        <div className="org-form-grid org-form-grid--2">
          {/* Address Line 1 */}
          <div className="org-form-field">
            <label htmlFor="branch-address-line1" className="org-form-label">
              <span>Address Line 1</span>
              <span className="org-form-required" aria-hidden="true">*</span>
            </label>
            <input
              id="branch-address-line1"
              type="text"
              className={`org-form-input${
                errors.addressLine1 ? ' org-form-input--error' : ''
              }`}
              placeholder="e.g. No. 142, Union Place"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.addressLine1)}
              aria-describedby={
                errors.addressLine1 ? 'branch-address-line1-error' : undefined
              }
              {...register('addressLine1')}
            />
            {errors.addressLine1 && (
              <p id="branch-address-line1-error" className="org-form-error" role="alert">
                {errors.addressLine1.message}
              </p>
            )}
          </div>

          {/* Address Line 2 (Optional) */}
          <div className="org-form-field">
            <label htmlFor="branch-address-line2" className="org-form-label">
              <span>Address Line 2</span>
              <span className="org-form-optional">(Optional)</span>
            </label>
            <input
              id="branch-address-line2"
              type="text"
              className={`org-form-input${
                errors.addressLine2 ? ' org-form-input--error' : ''
              }`}
              placeholder="e.g. Colombo 02 / Commercial Wing"
              disabled={isDisabled}
              aria-invalid={Boolean(errors.addressLine2)}
              aria-describedby={
                errors.addressLine2 ? 'branch-address-line2-error' : undefined
              }
              {...register('addressLine2')}
            />
            {errors.addressLine2 && (
              <p id="branch-address-line2-error" className="org-form-error" role="alert">
                {errors.addressLine2.message}
              </p>
            )}
          </div>
        </div>

        <div className="org-form-grid org-form-grid--3">
          {/* City */}
          <div className="org-form-field">
            <label htmlFor="branch-city" className="org-form-label">
              <span>City</span>
              <span className="org-form-required" aria-hidden="true">*</span>
            </label>
            <input
              id="branch-city"
              type="text"
              className={`org-form-input${errors.city ? ' org-form-input--error' : ''}`}
              placeholder="e.g. Colombo"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? 'branch-city-error' : 'branch-city-hint'}
              {...register('city')}
            />
            <span id="branch-city-hint" className="org-form-hint">
              Primary city or municipality served by this branch.
            </span>
            {errors.city && (
              <p id="branch-city-error" className="org-form-error" role="alert">
                {errors.city.message}
              </p>
            )}
          </div>

          {/* Latitude */}
          <div className="org-form-field">
            <label htmlFor="branch-latitude" className="org-form-label">
              <span>Latitude</span>
              <span className="org-form-required" aria-hidden="true">*</span>
            </label>
            <input
              id="branch-latitude"
              type="number"
              step="any"
              className={`org-form-input org-form-input--mono${
                errors.latitude ? ' org-form-input--error' : ''
              }`}
              placeholder="e.g. 6.9218"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.latitude)}
              aria-describedby={
                errors.latitude ? 'branch-latitude-error' : 'branch-latitude-hint'
              }
              {...register('latitude', { valueAsNumber: true })}
            />
            <span id="branch-latitude-hint" className="org-form-hint">
              Decimal degrees between -90.0 and 90.0.
            </span>
            {errors.latitude && (
              <p id="branch-latitude-error" className="org-form-error" role="alert">
                {errors.latitude.message}
              </p>
            )}
          </div>

          {/* Longitude */}
          <div className="org-form-field">
            <label htmlFor="branch-longitude" className="org-form-label">
              <span>Longitude</span>
              <span className="org-form-required" aria-hidden="true">*</span>
            </label>
            <input
              id="branch-longitude"
              type="number"
              step="any"
              className={`org-form-input org-form-input--mono${
                errors.longitude ? ' org-form-input--error' : ''
              }`}
              placeholder="e.g. 79.8562"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.longitude)}
              aria-describedby={
                errors.longitude ? 'branch-longitude-error' : 'branch-longitude-hint'
              }
              {...register('longitude', { valueAsNumber: true })}
            />
            <span id="branch-longitude-hint" className="org-form-hint">
              Decimal degrees between -180.0 and 180.0.
            </span>
            {errors.longitude && (
              <p id="branch-longitude-error" className="org-form-error" role="alert">
                {errors.longitude.message}
              </p>
            )}
          </div>
        </div>
      </BranchFormSection>

      {/* SECTION 3: Contact Information */}
      <BranchFormSection
        id="org-section-contact"
        title="Contact Information"
        description="Primary telephone and email contact channels for branch coordination."
        icon={Phone}
      >
        <div className="org-form-grid org-form-grid--2">
          {/* Contact Phone */}
          <div className="org-form-field">
            <label htmlFor="branch-phone" className="org-form-label">
              <span>Contact Phone</span>
              <span className="org-form-required" aria-hidden="true">*</span>
            </label>
            <input
              id="branch-phone"
              type="tel"
              className={`org-form-input org-form-input--mono${
                errors.phone ? ' org-form-input--error' : ''
              }`}
              placeholder="e.g. +94 11 234 5601"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'branch-phone-error' : 'branch-phone-hint'}
              {...register('phone')}
            />
            <span id="branch-phone-hint" className="org-form-hint">
              Include country or area code (7 to 20 digits, e.g. +94 11 234 5601).
            </span>
            {errors.phone && (
              <p id="branch-phone-error" className="org-form-error" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Contact Email (Optional) */}
          <div className="org-form-field">
            <label htmlFor="branch-email" className="org-form-label">
              <span>Contact Email</span>
              <span className="org-form-optional">(Optional)</span>
            </label>
            <input
              id="branch-email"
              type="email"
              className={`org-form-input${errors.email ? ' org-form-input--error' : ''}`}
              placeholder="e.g. colombo.central@swiftdrop.lk"
              disabled={isDisabled}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'branch-email-error' : 'branch-email-hint'}
              {...register('email')}
            />
            <span id="branch-email-hint" className="org-form-hint">
              Official branch dispatch or administration email address.
            </span>
            {errors.email && (
              <p id="branch-email-error" className="org-form-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>
      </BranchFormSection>

      {/* Form Footer Actions */}
      <div className="org-form-actions">
        <div className="org-form-actions__left">
          {isDirty && !isDisabled && (
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={handleReset}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset Changes</span>
            </button>
          )}
        </div>

        <div className="org-form-actions__right">
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <span>Cancel</span>
          </button>

          <button
            type="submit"
            className="org-btn org-btn--primary org-btn--submit"
            disabled={isDisabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="org-icon--spinning" aria-hidden="true" />
                <span>{mode === 'create' ? 'Creating Branch...' : 'Saving Changes...'}</span>
              </>
            ) : (
              <>
                <Save size={15} aria-hidden="true" />
                <span>{mode === 'create' ? 'Create Branch' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

