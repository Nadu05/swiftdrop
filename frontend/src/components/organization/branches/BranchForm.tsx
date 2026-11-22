'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  MapPinned,
  Phone,
  RotateCcw,
  Save,
} from 'lucide-react';
import BranchFormSection from './BranchFormSection';
import PostalAreaPicker from './PostalAreaPicker';
import SearchableSelect from './SearchableSelect';
import { validateBranchPostalAreasForMode } from './branch-postal-coverage';
import {
  branchCreateFormSchema,
  branchEditFormSchema,
  DEFAULT_BRANCH_FORM_VALUES,
  type BranchFormValues,
} from '@/schema/branch.schema';
import {
  getDistricts,
  getDsDivisions,
  getProvinces,
  OrganizationApiError,
} from '@/api/services/organization.api';
import type {
  BranchResponse,
  DistrictDto,
  DsDivisionDto,
  PostalAreaDto,
  ProvinceDto,
} from '@/types/organization.types';

export interface BranchFormProps {
  mode: 'create' | 'edit';
  initialValues?: BranchFormValues;
  initialPostalAreas?: PostalAreaDto[];
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
  'postalCode',
];

const EMPTY_POSTAL_AREAS: PostalAreaDto[] = [];

export default function BranchForm({
  mode,
  initialValues = DEFAULT_BRANCH_FORM_VALUES,
  initialPostalAreas = EMPTY_POSTAL_AREAS,
  branchStatus,
  onSubmit,
  onCancel,
  onSuccessNavigate,
}: BranchFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConflictError, setIsConflictError] = useState<boolean>(false);
  const [savedBranch, setSavedBranch] = useState<BranchResponse | null>(null);

  const [provinces, setProvinces] = useState<ProvinceDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [dsDivisions, setDsDivisions] = useState<DsDivisionDto[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedDsDivisionId, setSelectedDsDivisionId] = useState<number | null>(null);
  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);
  const [loadingDsDivisions, setLoadingDsDivisions] = useState<boolean>(false);
  const [locationLoadError, setLocationLoadError] = useState<string | null>(null);
  const [selectedPostalAreas, setSelectedPostalAreas] = useState<PostalAreaDto[]>([]);
  const [postalAreaError, setPostalAreaError] = useState<string | null>(null);

  const schema = useMemo(
    () => (mode === 'create' ? branchCreateFormSchema : branchEditFormSchema),
    [mode]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: initialValues,
  });

  const physicalPostalCode = useWatch({ control, name: 'postalCode' });

  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    setLocationLoadError(null);
    getProvinces()
      .then((data) => {
        if (!cancelled) {
          setProvinces(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLocationLoadError(
            err instanceof Error ? err.message : 'Unable to load Sri Lankan provinces.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProvinces(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedProvinceId === null) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    setLocationLoadError(null);
    getDistricts(selectedProvinceId)
      .then((data) => {
        if (!cancelled) {
          setDistricts(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLocationLoadError(
            err instanceof Error ? err.message : 'Unable to load districts for selected province.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDistricts(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProvinceId]);

  useEffect(() => {
    if (selectedDistrictId === null) {
      setDsDivisions([]);
      return;
    }
    let cancelled = false;
    setLoadingDsDivisions(true);
    setLocationLoadError(null);
    getDsDivisions(selectedDistrictId)
      .then((data) => {
        if (!cancelled) {
          setDsDivisions(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLocationLoadError(
            err instanceof Error
              ? err.message
              : 'Unable to load DS divisions for selected district.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDsDivisions(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDistrictId]);

  const handleProvinceChange = (provinceId: number | null) => {
    setSelectedProvinceId(provinceId);
    setSelectedDistrictId(null);
    setSelectedDsDivisionId(null);
    setValue('provinceId', provinceId, { shouldDirty: true });
    setValue('districtId', null, { shouldDirty: true });
    setValue('dsDivisionId', null, { shouldDirty: true });
  };

  const handleDistrictChange = (districtId: number | null) => {
    setSelectedDistrictId(districtId);
    setSelectedDsDivisionId(null);
    setValue('districtId', districtId, { shouldDirty: true });
    setValue('dsDivisionId', null, { shouldDirty: true });
  };

  const handleDsDivisionChange = (dsDivisionId: number | null) => {
    setSelectedDsDivisionId(dsDivisionId);
    setValue('dsDivisionId', dsDivisionId, { shouldDirty: true });
  };

  const handlePostalAreasChange = (areas: PostalAreaDto[]) => {
    setSelectedPostalAreas(areas);
    setValue(
      'postalAreaIds',
      areas.map((a) => a.id),
      { shouldDirty: true }
    );
    if (areas.length > 0) {
      setPostalAreaError(null);
    }
  };

  // Sync form values when initialValues load asynchronously on Edit page
  useEffect(() => {
    reset({
      ...initialValues,
      postalAreaIds: initialPostalAreas.map((a) => a.id),
    });
    setSelectedPostalAreas(initialPostalAreas);
    setPostalAreaError(null);
  }, [initialValues, initialPostalAreas, reset]);

  const handleFormSubmit = async (values: BranchFormValues) => {
    setSubmitError(null);
    setIsConflictError(false);
    setSavedBranch(null);
    setPostalAreaError(null);

    const postalValidationError = validateBranchPostalAreasForMode(
      mode,
      branchStatus,
      selectedPostalAreas.map((a) => a.id)
    );
    if (postalValidationError) {
      setPostalAreaError(postalValidationError);
      return;
    }

    try {
      const response = await onSubmit({
        ...values,
        provinceId: selectedProvinceId,
        districtId: selectedDistrictId,
        dsDivisionId: selectedDsDivisionId,
        postalAreaIds: selectedPostalAreas.map((a) => a.id),
      });
      setSavedBranch(response);
      if (mode === 'create') {
        onSuccessNavigate(response);
      } else {
        setTimeout(() => {
          onSuccessNavigate(response);
        }, 900);
      }
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
    setSelectedProvinceId(null);
    setSelectedDistrictId(null);
    setSelectedDsDivisionId(null);
    setSelectedPostalAreas(initialPostalAreas);
    setPostalAreaError(null);
    reset({
      ...initialValues,
      postalAreaIds: initialPostalAreas.map((a) => a.id),
    });
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
                the Organization Service.
              </p>

              {mode === 'create' && (
                <p style={{ fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: 0 }}>
                  A <strong>Branch Manager</strong> account has been provisioned. Redirecting to Branch Details to view credentials and email delivery status...
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={() => onSuccessNavigate(savedBranch)}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>{mode === 'create' ? 'View Branch Details' : 'Return to Directory'}</span>
            </button>
          </div>
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
                  ? submitError.toLowerCase().includes('postal area')
                    ? 'Postal Area Coverage Conflict (HTTP 409)'
                    : submitError.toLowerCase().includes('email')
                    ? 'Branch Email Conflict (HTTP 409)'
                    : 'Duplicate Branch Code Conflict (HTTP 409)'
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

      {/* SECTION 2: Address & Location */}
      <BranchFormSection
        id="org-section-location"
        title="Address &amp; Location"
        description="Physical street address, administrative region, and municipality for this branch."
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

        <div className="org-form-grid org-form-grid--3" style={{ marginTop: '1rem' }}>
          <SearchableSelect
            id="branch-province"
            label="Province"
            placeholder="Search province..."
            options={provinces.map((p) => ({ value: p.id, label: p.name, sublabel: p.code }))}
            value={selectedProvinceId}
            onChange={handleProvinceChange}
            disabled={isDisabled}
            loading={loadingProvinces}
            hint="Select a Sri Lankan province to filter districts."
          />

          <SearchableSelect
            id="branch-district"
            label="District"
            placeholder={
              selectedProvinceId === null ? 'Select province first...' : 'Search district...'
            }
            options={districts.map((d) => ({ value: d.id, label: d.name, sublabel: d.code }))}
            value={selectedDistrictId}
            onChange={handleDistrictChange}
            disabled={isDisabled || selectedProvinceId === null}
            loading={loadingDistricts}
            hint="Select a district within the chosen province."
          />

          <SearchableSelect
            id="branch-ds-division"
            label="DS Division"
            placeholder={
              selectedDistrictId === null
                ? 'Select district first...'
                : 'Search DS division...'
            }
            options={dsDivisions.map((ds) => ({
              value: ds.id,
              label: ds.name,
              sublabel: ds.code,
            }))}
            value={selectedDsDivisionId}
            onChange={handleDsDivisionChange}
            disabled={isDisabled || selectedDistrictId === null}
            loading={loadingDsDivisions}
            hint="Optional divisional secretariat division for this branch."
          />
        </div>

        {locationLoadError && (
          <p className="org-form-error" role="alert" style={{ marginTop: '0.5rem' }}>
            {locationLoadError}
          </p>
        )}

        <div className="org-form-grid org-form-grid--2" style={{ marginTop: '1rem' }}>
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

          {/* Physical Postal Code */}
          <div className="org-form-field">
            <label htmlFor="branch-postal-code" className="org-form-label">
              <span>Physical Postal Code</span>
              <span className="org-form-optional">(Optional)</span>
            </label>
            <input
              id="branch-postal-code"
              type="text"
              maxLength={5}
              className={`org-form-input org-form-input--mono${
                errors.postalCode ? ' org-form-input--error' : ''
              }`}
              placeholder="e.g. 00100"
              disabled={isDisabled}
              aria-invalid={Boolean(errors.postalCode)}
              aria-describedby={
                errors.postalCode ? 'branch-postal-code-error' : 'branch-postal-code-hint'
              }
              {...register('postalCode')}
            />
            <span id="branch-postal-code-hint" className="org-form-hint">
              5-digit Sri Lankan postal code; auto-suggests matching coverage below.
            </span>
            {errors.postalCode && (
              <p id="branch-postal-code-error" className="org-form-error" role="alert">
                {errors.postalCode.message}
              </p>
            )}
          </div>
        </div>
      </BranchFormSection>

      {/* SECTION 2B: Assigned Postal Areas (Create & Edit Modes) */}
      <BranchFormSection
        id="org-section-postal-areas"
        title="Assigned Postal Areas"
        description={
          mode === 'edit' && branchStatus === 'INACTIVE'
            ? 'Exclusive Branch Coverage: add or remove Sri Lankan Postal Areas served by this branch. Inactive branches may have zero areas, but at least one is required before activating.'
            : 'Exclusive Branch Coverage: select all Sri Lankan Postal Areas served by this branch. Active branches require at least one Postal Area.'
        }
        icon={MapPinned}
      >
        <PostalAreaPicker
          provinces={provinces}
          physicalPostalCode={physicalPostalCode}
          selectedAreas={selectedPostalAreas}
          onChange={handlePostalAreasChange}
          disabled={isDisabled}
          error={postalAreaError}
          autoSuggestPhysicalCode={mode === 'create'}
        />
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

          {/* Branch Email (Required in Create Mode, Contact-Only in Edit Mode) */}
          <div className="org-form-field">
            <label htmlFor="branch-email" className="org-form-label">
              <span>{mode === 'create' ? 'Branch Email' : 'Contact Email'}</span>
              {mode === 'create' ? (
                <span className="org-form-required" aria-hidden="true">*</span>
              ) : (
                <span className="org-form-optional">(Optional)</span>
              )}
            </label>
            <input
              id="branch-email"
              type="email"
              className={`org-form-input${errors.email ? ' org-form-input--error' : ''}`}
              placeholder="e.g. colombo.central@swiftdrop.lk"
              disabled={isDisabled}
              aria-required={mode === 'create'}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'branch-email-error' : 'branch-email-hint'}
              {...register('email')}
            />
            <span id="branch-email-hint" className="org-form-hint">
              {mode === 'create'
                ? "Used as the Branch Manager's login email and destination for initial credentials."
                : "Branch contact email only. Editing this does not change the Branch Manager's login email."}
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

