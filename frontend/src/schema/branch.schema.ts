import { z } from 'zod';
import { inferSriLankanDistrict } from '@/lib/geocoding';
import type {
  BranchCreateRequest,
  BranchResponse,
  BranchUpdateRequest,
} from '@/types/organization.types';

/**
 * Zod Validation Schema for Create Branch & Edit Branch Forms
 * Member 04 — Organization Admin UI (Phase 2)
 *
 * Strictly aligned with backend Jakarta Bean Validation constraints in:
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchCreateRequest.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchUpdateRequest.java
 * - services/organization-service/src/main/resources/db/migration/V2__create_branches.sql
 */

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;
const BRANCH_CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export const branchFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Branch code is required')
    .min(2, 'Branch code must be at least 2 characters')
    .max(50, 'Branch code must be at most 50 characters')
    .regex(
      BRANCH_CODE_REGEX,
      'Branch code may only contain letters, numbers, hyphens (-), and underscores (_) (e.g. CMB-CENTRAL)'
    ),

  name: z
    .string()
    .trim()
    .min(1, 'Branch name is required')
    .min(2, 'Branch name must be at least 2 characters')
    .max(255, 'Branch name must be at most 255 characters'),

  addressLine1: z
    .string()
    .trim()
    .min(1, 'Address line 1 is required')
    .min(5, 'Address line 1 must be at least 5 characters')
    .max(500, 'Address line 1 must be at most 500 characters'),

  addressLine2: z
    .string()
    .trim()
    .max(500, 'Address line 2 must be at most 500 characters')
    .optional()
    .or(z.literal('')),

  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .min(2, 'City must be at least 2 characters')
    .max(255, 'City must be at most 255 characters'),

  district: z
    .string()
    .trim()
    .min(1, 'District is required')
    .min(2, 'District must be at least 2 characters')
    .max(100, 'District must be at most 100 characters'),

  phone: z
    .string()
    .trim()
    .min(1, 'Contact phone is required')
    .max(50, 'Phone must be at most 50 characters')
    .regex(
      PHONE_REGEX,
      'Enter a valid phone number (e.g. +94 11 234 5601 or 0112345601)'
    ),

  email: z
    .string()
    .trim()
    .max(255, 'Email must be at most 255 characters')
    .email('Enter a valid email address (e.g. colombo.central@swiftdrop.lk)')
    .optional()
    .or(z.literal('')),

  latitude: z
    .number({
      message: 'Latitude is required and must be a valid number',
    })
    .refine((val) => !Number.isNaN(val) && Number.isFinite(val), {
      message: 'Latitude is required and must be a valid number',
    })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),

  longitude: z
    .number({
      message: 'Longitude is required and must be a valid number',
    })
    .refine((val) => !Number.isNaN(val) && Number.isFinite(val), {
      message: 'Longitude is required and must be a valid number',
    })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;

/**
 * Default empty values for the Create Branch form.
 */
export const DEFAULT_BRANCH_FORM_VALUES: BranchFormValues = {
  code: '',
  name: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: 'Colombo',
  phone: '',
  email: '',
  latitude: 6.9271,
  longitude: 79.8612,
};

/**
 * Maps an existing `BranchResponse` DTO into `BranchFormValues` for the Edit Branch form.
 */
export function branchResponseToFormValues(branch: BranchResponse): BranchFormValues {
  return {
    code: branch.code,
    name: branch.name,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2 ?? '',
    city: branch.city,
    district: inferSriLankanDistrict(
      branch.city,
      branch.district,
      branch.addressLine2
    ),
    phone: branch.phone,
    email: branch.email ?? '',
    latitude: branch.latitude,
    longitude: branch.longitude,
  };
}

/**
 * Converts validated `BranchFormValues` into a `BranchCreateRequest` DTO payload
 * for `POST /api/v1/organization/branches`.
 */
export function toBranchCreatePayload(values: BranchFormValues): BranchCreateRequest {
  const trimmedAddressLine2 = values.addressLine2?.trim() || '';
  const trimmedEmail = values.email?.trim() || '';

  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: trimmedAddressLine2.length > 0 ? trimmedAddressLine2 : null,
    city: values.city.trim(),
    district: values.district.trim(),
    phone: values.phone.trim(),
    email: trimmedEmail.length > 0 ? trimmedEmail : null,
    latitude: values.latitude,
    longitude: values.longitude,
  };
}

/**
 * Converts validated `BranchFormValues` into a `BranchUpdateRequest` DTO payload
 * for `PATCH /api/v1/organization/branches/{id}`.
 *
 * Note: `BranchService.update()` updates `addressLine2` and `email` whenever non-null
 * strings are passed (including empty string `""` to clear an optional field).
 */
export function toBranchUpdatePayload(values: BranchFormValues): BranchUpdateRequest {
  const trimmedAddressLine2 = values.addressLine2?.trim() ?? '';
  const trimmedEmail = values.email?.trim() ?? '';

  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: trimmedAddressLine2,
    city: values.city.trim(),
    district: values.district.trim(),
    phone: values.phone.trim(),
    email: trimmedEmail.length > 0 ? trimmedEmail : null,
    latitude: values.latitude,
    longitude: values.longitude,
  };
}

