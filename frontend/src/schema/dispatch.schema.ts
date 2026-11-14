import { z } from 'zod';

/**
 * Zod validation schemas for Dispatcher and Courier operational forms.
 * Uses React Hook Form + zodResolver across dialogs and field submission flows.
 */

export const assignCourierSchema = z.object({
  courierId: z.string().trim().min(1, 'Please select an available courier.'),
  priority: z.enum(['NORMAL', 'URGENT']).optional(),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer.').optional(),
});

export type AssignCourierFormValues = z.infer<typeof assignCourierSchema>;

export const reassignCourierSchema = z.object({
  newCourierId: z.string().trim().min(1, 'Please select the new courier.'),
  reason: z
    .string()
    .trim()
    .min(5, 'Reassignment reason must be at least 5 characters.')
    .max(500, 'Reassignment reason must be 500 characters or fewer.'),
});

export type ReassignCourierFormValues = z.infer<typeof reassignCourierSchema>;

export const branchDropoffSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .min(3, 'Enter a valid tracking number (e.g. SD-...).'),
  parcelReference: z
    .string()
    .trim()
    .max(120, 'Parcel reference must be 120 characters or fewer.')
    .optional(),
  branchId: z.string().trim().optional(),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer.').optional(),
});

export type BranchDropoffFormValues = z.infer<typeof branchDropoffSchema>;

export const podSubmissionSchema = z
  .object({
    type: z.enum(['OTP', 'SIGNATURE', 'PHOTO']),
    receivedBy: z
      .string()
      .trim()
      .min(2, 'Enter the recipient or receiver full name.')
      .max(120, 'Receiver name is too long.'),
    reference: z
      .string()
      .trim()
      .min(2, 'Provide verification proof (OTP code, signature text/data, or photo upload).')
      .max(5_000_000, 'Proof payload exceeds size limit.'),
    notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer.').optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'OTP' && val.reference.trim().length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reference'],
        message: 'OTP code must be at least 4 characters.',
      });
    }
    if (val.type === 'PHOTO' && !val.reference.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reference'],
        message: 'Upload a delivery photo or enter an image reference.',
      });
    }
  });

export type PodSubmissionFormValues = z.infer<typeof podSubmissionSchema>;

export const deliveryFailureSchema = z.object({
  reason: z.string().trim().min(1, 'Select a failure reason.'),
  notes: z
    .string()
    .trim()
    .min(5, 'Add field notes (at least 5 characters) explaining what happened.')
    .max(500, 'Notes must be 500 characters or fewer.'),
});

export type DeliveryFailureFormValues = z.infer<typeof deliveryFailureSchema>;

export const exceptionDecisionSchema = z.object({
  decisionAction: z.enum([
    'RETURN_TO_SENDER',
    'RESCHEDULE_DELIVERY',
    'HOLD_AT_BRANCH',
  ]),
  decisionReason: z
    .string()
    .trim()
    .min(5, 'Enter an operational justification (at least 5 characters).')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type ExceptionDecisionFormValues = z.infer<typeof exceptionDecisionSchema>;

