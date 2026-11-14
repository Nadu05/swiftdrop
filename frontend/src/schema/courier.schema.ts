import { z } from 'zod';
import { FAILED_DELIVERY_REASONS } from '@/types/courier.types';

/**
 * Zod schemas for the courier delivery forms (Member 08 - Courier UI).
 * Frontend validation is for UX only; dispatch-service must re-validate.
 */

export const proofOfDeliverySchema = z
  .object({
    type: z.enum(['OTP', 'SIGNATURE', 'PHOTO']),
    reference: z.string().trim().min(1, 'Enter the proof reference'),
    receivedBy: z
      .string()
      .trim()
      .min(2, 'Enter who received the parcel')
      .max(120, 'Name is too long'),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'OTP' && !/^\d{4,6}$/.test(values.reference)) {
      ctx.addIssue({
        code: 'custom',
        path: ['reference'],
        message: 'OTP must be 4 to 6 digits',
      });
    }
  });

export type ProofOfDeliveryFormValues = z.infer<typeof proofOfDeliverySchema>;

export const failedDeliverySchema = z.object({
  reason: z.enum(FAILED_DELIVERY_REASONS, { message: 'Choose a reason' }),
  notes: z
    .string()
    .trim()
    .min(5, 'Add a short note for your branch (at least 5 characters)')
    .max(500, 'Notes must be 500 characters or fewer'),
});

export type FailedDeliveryFormValues = z.infer<typeof failedDeliverySchema>;
