import { z } from 'zod';

/**
 * Zod validation schema for the Customer Booking Form
 * Member 06 - Customer UI & Booking Experience
 *
 * This validates all user inputs before they can proceed between steps
 * or submit to the backend.
 */
export const bookingFormSchema = z.object({
  // STEP 1: Pickup Information
  pickupAddress: z
    .string()
    .trim()
    .min(5, 'Pickup address is required (at least 5 characters)'),
  pickupContactName: z
    .string()
    .trim()
    .min(2, 'Pickup contact name is required (at least 2 characters)'),
  pickupContactPhone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9\s\-()]{7,15}$/,
      'Enter a valid phone number (e.g. +94771234567 or 0771234567)'
    ),

  // STEP 2: Delivery / Drop-off Information
  dropoffAddress: z
    .string()
    .trim()
    .min(5, 'Delivery address is required (at least 5 characters)'),
  dropoffContactName: z
    .string()
    .trim()
    .min(2, 'Delivery contact name is required (at least 2 characters)'),
  dropoffContactPhone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9\s\-()]{7,15}$/,
      'Enter a valid phone number (e.g. +94719876543 or 0719876543)'
    ),

  // STEP 3: Parcel Information
  parcelDescription: z
    .string()
    .trim()
    .min(3, 'Parcel description is required (e.g. Documents, Electronics, Clothing)'),
  parcelSize: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'], {
    message: 'Please select a parcel size category',
  }),
  weightKg: z
    .number({ message: 'Weight must be a valid number' })
    .positive('Weight must be greater than 0 kg')
    .max(100, 'Weight cannot exceed 100 kg for standard courier delivery'),
  deliveryInstructions: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

/**
 * Field lists used for step-by-step validation.
 * When the user is on Step 1, we only validate Step 1 fields before moving to Step 2.
 */
export const STEP_1_FIELDS: (keyof BookingFormValues)[] = [
  'pickupAddress',
  'pickupContactName',
  'pickupContactPhone',
];

export const STEP_2_FIELDS: (keyof BookingFormValues)[] = [
  'dropoffAddress',
  'dropoffContactName',
  'dropoffContactPhone',
];

export const STEP_3_FIELDS: (keyof BookingFormValues)[] = [
  'parcelDescription',
  'parcelSize',
  'weightKg',
  'deliveryInstructions',
];
