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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
            ? 'Failed to create branch. Please check inputs and try again.'
            : 'Failed to update branch. Please check inputs and try again.'
        );
      }
    }
  };

  const handleReset = () => {
    reset(initialValues);
    setSubmitError(null);
    setIsConflictError(false);
  };

  const isDisabled = isSubmitting || Boolean(savedBranch);

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="org-form"
      noValidate
      aria-label={mode === 'create' ? 'Create new branch form' : 'Edit branch form'}
    >
      {/* SUCCESS BANNER: Confirmed HTTP 201/200 from backend */}
      {savedBranch && (
        <div
          className="org-form-alert org-form-alert--success"
          role="status"
          aria-live="polite"
        >
          <div className="org-form-alert__content">
            <CheckCircle2 size={20} className="org-form-alert__icon" aria-hidden="true" />
            <div className="org-form-alert__text">
              <strong className="org-form-alert__title">
                {mode === 'create'
                  ? `Branch "${savedBranch.name}" created successfully!`
                  : `Branch "${savedBranch.name}" updated successfully!`}
              </strong>
              <p className="org-form-alert__desc">
                {mode === 'create'
                  ? `Branch code ${savedBranch.code} is now registered in ${savedBranch.city}. Redirecting to directory...`
                  : `All branch details have been persisted. Redirecting to directory...`}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSuccessNavigate(savedBranch)}
            className="self-start sm:self-center bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50"
          >
            <span>Go to Directory Now</span>
            <ArrowLeft size={13} className="rotate-180 ml-1.5" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* TOP ERROR BANNER: Form validation or API error */}
      {submitError && (
        <div
          className={`org-form-alert ${
            isConflictError ? 'org-form-alert--conflict' : 'org-form-alert--error'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="org-form-alert__content">
            <AlertCircle size={20} className="org-form-alert__icon" aria-hidden="true" />
            <div className="org-form-alert__text">
              <strong className="org-form-alert__title">
                {isConflictError
                  ? 'Duplicate Branch Code Conflict'
                  : mode === 'create'
                  ? 'Unable to Create Branch'
                  : 'Unable to Update Branch'}
              </strong>
              <p className="org-form-alert__desc">{submitError}</p>
              {isConflictError && (
                <p className="org-form-alert__hint">
                  Please modify the <strong>Branch Code</strong> below to a unique code that is
                  not already used by another branch in the network.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
            <Input
              id="branch-name"
              type="text"
              placeholder="e.g. Colombo Central"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'branch-name-error' : 'branch-name-hint'}
              className={cn(
                'h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.name && 'border-red-500 focus-visible:ring-red-500'
              )}
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
            <Input
              id="branch-code"
              type="text"
              placeholder="e.g. CMB-CENTRAL"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.code)}
              aria-describedby={errors.code ? 'branch-code-error' : 'branch-code-hint'}
              className={cn(
                'h-10 font-mono uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.code && 'border-red-500 focus-visible:ring-red-500'
              )}
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
            <Input
              id="branch-address-line1"
              type="text"
              placeholder="e.g. No. 142, Union Place"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.addressLine1)}
              aria-describedby={
                errors.addressLine1 ? 'branch-address-line1-error' : undefined
              }
              className={cn(
                'h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.addressLine1 && 'border-red-500 focus-visible:ring-red-500'
              )}
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
            <Input
              id="branch-address-line2"
              type="text"
              placeholder="e.g. Colombo 02 / Commercial Wing"
              disabled={isDisabled}
              aria-invalid={Boolean(errors.addressLine2)}
              aria-describedby={
                errors.addressLine2 ? 'branch-address-line2-error' : undefined
              }
              className={cn(
                'h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.addressLine2 && 'border-red-500 focus-visible:ring-red-500'
              )}
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
            <Input
              id="branch-city"
              type="text"
              placeholder="e.g. Colombo"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? 'branch-city-error' : 'branch-city-hint'}
              className={cn(
                'h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.city && 'border-red-500 focus-visible:ring-red-500'
              )}
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
            <Input
              id="branch-latitude"
              type="number"
              step="any"
              placeholder="e.g. 6.9218"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.latitude)}
              aria-describedby={
                errors.latitude ? 'branch-latitude-error' : 'branch-latitude-hint'
              }
              className={cn(
                'h-10 font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.latitude && 'border-red-500 focus-visible:ring-red-500'
              )}
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
            <Input
              id="branch-longitude"
              type="number"
              step="any"
              placeholder="e.g. 79.8562"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.longitude)}
              aria-describedby={
                errors.longitude ? 'branch-longitude-error' : 'branch-longitude-hint'
              }
              className={cn(
                'h-10 font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.longitude && 'border-red-500 focus-visible:ring-red-500'
              )}
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
            <Input
              id="branch-phone"
              type="tel"
              placeholder="e.g. +94 11 234 5601"
              disabled={isDisabled}
              aria-required="true"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'branch-phone-error' : 'branch-phone-hint'}
              className={cn(
                'h-10 font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.phone && 'border-red-500 focus-visible:ring-red-500'
              )}
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
            <Input
              id="branch-email"
              type="email"
              placeholder="e.g. colombo.central@swiftdrop.lk"
              disabled={isDisabled}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'branch-email-error' : 'branch-email-hint'}
              className={cn(
                'h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                errors.email && 'border-red-500 focus-visible:ring-red-500'
              )}
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
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div>
          {isDirty && !isDisabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset Changes</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-slate-700 dark:text-slate-300"
          >
            <span>Cancel</span>
          </Button>

          <Button
            type="submit"
            disabled={isDisabled}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-32 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                <span>{mode === 'create' ? 'Creating...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save size={15} aria-hidden="true" />
                <span>{mode === 'create' ? 'Create Branch' : 'Save Changes'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
