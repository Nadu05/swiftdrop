import { z } from 'zod';

/**
 * Zod schema for the registration form.
 * Password complexity mirrors the backend validation rules.
 */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name must not exceed 150 characters'),

    email: z.string().email('Please enter a valid email address'),

    phone: z
      .string()
      .regex(
        /^\+?[0-9\s\-().]{7,20}$/,
        'Phone must be 7–20 digits and may include +, spaces, dashes'
      ),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one digit')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Zod schema for the login form.
 */
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

