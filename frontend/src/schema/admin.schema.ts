import { z } from 'zod';

export const adminCreateUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name must not exceed 150 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one digit')
    .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Phone must be 7–20 digits and can include +, spaces, or dashes')
    .optional()
    .or(z.literal('')),
  roles: z.array(z.string()).min(1, 'Select at least one role'),
  accountStatus: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING_VERIFICATION']),
  emailVerified: z.boolean(),
  branchId: z.number().nullable().optional(),
  organizationId: z.string().nullable().optional(),
});

export type AdminCreateUserFormValues = z.infer<typeof adminCreateUserSchema>;

export const adminUpdateUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name must not exceed 150 characters')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Phone must be 7–20 digits and can include +, spaces, or dashes')
    .optional()
    .or(z.literal('')),
  roles: z.array(z.string()).min(1, 'Select at least one role').optional(),
  accountStatus: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING_VERIFICATION']).optional(),
  emailVerified: z.boolean().optional(),
  branchId: z.number().nullable().optional(),
  organizationId: z.string().nullable().optional(),
});

export type AdminUpdateUserFormValues = z.infer<typeof adminUpdateUserSchema>;

export const assignRoleSchema = z.object({
  roleName: z.enum([
    'CUSTOMER',
    'MERCHANT',
    'COURIER',
    'DISPATCHER',
    'BRANCH_STAFF',
    'BRANCH_MANAGER',
    'HEAD_OFFICE_ADMIN',
    'ADMIN',
  ]),
});

export type AssignRoleFormValues = z.infer<typeof assignRoleSchema>;
