'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Store,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  MapPin,
  Lock,
} from 'lucide-react';
import { register as registerUser, login as loginUser } from '@/api/services/auth.api';
import { submitMerchantApplication } from '@/api/services/organization.api';
import { useAuthStore } from '@/store/auth.store';
import type { MerchantApplicationCreateRequest } from '@/types/organization.types';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  legalName: z.string().optional(),
  businessRegistrationNumber: z.string().min(3, 'Registration number is required'),
  category: z.enum([
    'GROCERY_FOOD',
    'PHARMACY',
    'RETAIL',
    'OTHER',
  ] as const),
  contactEmail: z.string().email('Valid business email required'),
  contactPhone: z.string().min(9, 'Phone number is required'),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

const step2Schema = z.object({
  contactFullName: z.string().min(2, 'Contact name is required'),
  contactDesignation: z.string().min(2, 'Position/designation is required'),
});

const step3Schema = z.object({
  streetAddress: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  district: z.string().min(2, 'District is required'),
  postalCode: z.string().optional(),
  nearestBranch: z.string().optional(),
});

const step4Schema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(9, 'Phone number is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;
type Step4Values = z.infer<typeof step4Schema>;

const BUSINESS_CATEGORIES = [
  { value: 'RETAIL', label: 'Retail & Consumer Goods' },
  { value: 'GROCERY_FOOD', label: 'Grocery & Food' },
  { value: 'PHARMACY', label: 'Pharmacy & Healthcare' },
  { value: 'OTHER', label: 'Other Business Type' },
];

const STEPS = [
  { id: 1, label: 'Business Info', icon: Building2 },
  { id: 2, label: 'Contact Person', icon: User },
  { id: 3, label: 'Address', icon: MapPin },
  { id: 4, label: 'Account Setup', icon: Lock },
];

export default function MerchantRegisterPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successApp, setSuccessApp] = useState<{ id: string; businessName: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Collected form data across steps
  const [step1Data, setStep1Data] = useState<Partial<Step1Values>>({});
  const [step2Data, setStep2Data] = useState<Partial<Step2Values>>({});
  const [step3Data, setStep3Data] = useState<Partial<Step3Values>>({});

  const form1 = useForm<Step1Values>({ resolver: zodResolver(step1Schema), defaultValues: step1Data as Step1Values });
  const form2 = useForm<Step2Values>({ resolver: zodResolver(step2Schema), defaultValues: step2Data as Step2Values });
  const form3 = useForm<Step3Values>({ resolver: zodResolver(step3Schema), defaultValues: step3Data as Step3Values });
  const form4 = useForm<Step4Values>({ resolver: zodResolver(step4Schema) });

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleStep1 = form1.handleSubmit((data) => {
    setStep1Data(data);
    setStep(2);
  });

  const handleStep2 = form2.handleSubmit((data) => {
    setStep2Data(data);
    setStep(3);
  });

  const handleStep3 = form3.handleSubmit((data) => {
    setStep3Data(data);
    setStep(4);
  });

  const buildAppPayload = (): MerchantApplicationCreateRequest => ({
    businessName: step1Data.businessName!,
    legalName: step1Data.legalName || step1Data.businessName!,
    businessRegistrationNumber: step1Data.businessRegistrationNumber!,
    category: step1Data.category!,
    contactEmail: step1Data.contactEmail!,
    contactPhone: step1Data.contactPhone!,
    contactFullName: step2Data.contactFullName!,
    contactDesignation: step2Data.contactDesignation!,
    streetAddress: step3Data.streetAddress!,
    city: step3Data.city!,
    district: step3Data.district || '',
    postalCode: step3Data.postalCode || undefined,
    nearestBranch: step3Data.nearestBranch || undefined,
  });

  // Direct submit for users who are already logged in
  const handleLoggedInSubmit = async () => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const application = await submitMerchantApplication(buildAppPayload());
      setSuccessApp({ id: application.id, businessName: application.businessName });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please check your details and try again.';
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Full submission for new registrations
  const handleStep4 = form4.handleSubmit(async (data) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      if (!currentUser) {
        try {
          // 1. Attempt to register new user account
          await registerUser({
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            password: data.password,
            confirmPassword: data.confirmPassword,
          });
        } catch (regErr: any) {
          if (regErr?.response?.status === 409) {
            // Account with this email already exists — attempt login with provided password
            try {
              await loginUser({ email: data.email, password: data.password });
            } catch {
              throw new Error(
                `An account with email "${data.email}" is already registered. If this is your account, please enter your existing password to link it, or sign in first.`
              );
            }
          } else {
            throw regErr;
          }
        }
      }

      // 2. Submit merchant application
      const application = await submitMerchantApplication(buildAppPayload());
      setSuccessApp({ id: application.id, businessName: application.businessName });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please check your details and try again.';
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  });

  // ─── Success State ───────────────────────────────────────────────────────
  if (successApp) {
    return (
      <main style={mainStyle}>
        <section style={leftHeroStyle} aria-hidden="true">
          <div style={heroOverlayStyle} />
          <div style={heroTextStyle}>
            <h2 style={heroHeadlineStyle}>YOUR BUSINESS,<br />OUR NETWORK.</h2>
            <p style={heroSubStyle}>Join hundreds of merchants delivering across Sri Lanka with SwiftDrop.</p>
          </div>
        </section>
        <section style={rightSectionStyle}>
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', padding: '1rem 0 0.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', marginBottom: '1rem' }}>
                <CheckCircle2 size={28} color="#fff" />
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
                Application Submitted!
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Your merchant application for <strong style={{ color: '#0f172a' }}>{successApp.businessName}</strong> has been submitted and is pending review by SwiftDrop Head Office.
              </p>
            </div>

            <div style={{ margin: '1.5rem 0', padding: '1rem 1.25rem', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
              <p style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600, margin: '0 0 0.3rem' }}>Application Code</p>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', margin: 0 }}>{successApp.id}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                href="/login"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', height: 44, background: '#2563eb', color: '#fff', fontSize: '0.875rem', fontWeight: 600, borderRadius: 8, textDecoration: 'none', boxSizing: 'border-box' as const }}
              >
                Sign In to Your Account
              </Link>
              <Link
                href="/"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', height: 44, background: '#f8fafc', color: '#475569', fontSize: '0.875rem', fontWeight: 600, borderRadius: 8, textDecoration: 'none', border: '1px solid #e2e8f0', boxSizing: 'border-box' as const }}
              >
                Return to Home
              </Link>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', marginTop: '1.25rem', lineHeight: 1.5 }}>
              You will be notified via email once your application is reviewed. This typically takes 1–3 business days.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // ─── Form Steps ──────────────────────────────────────────────────────────
  return (
    <main style={mainStyle}>
      {/* Left Hero */}
      <section style={leftHeroStyle} aria-hidden="true">
        <div style={heroOverlayStyle} />
        <div style={heroTextStyle}>
          <h2 style={heroHeadlineStyle}>YOUR BUSINESS,<br />OUR NETWORK.</h2>
          <p style={heroSubStyle}>Join hundreds of merchants delivering across Sri Lanka with SwiftDrop.</p>
        </div>
      </section>

      {/* Right Form */}
      <section style={rightSectionStyle}>
        <div style={cardStyle}>
          {/* Back to Home */}
          <div style={{ marginBottom: '1.25rem' }}>
            <Link href="/" style={backLinkStyle}>
              <ArrowLeft size={13} />
              Back to Home
            </Link>
          </div>

          {/* Brand */}
          <div style={brandRowStyle}>
            <div style={logoBgStyle}>
              <Store size={20} color="#fff" />
            </div>
            <div>
              <div style={brandNameStyle}>Swift<span style={{ color: '#2563eb' }}>Drop</span></div>
              <div style={brandSubStyle}>Merchant Partner Registration</div>
            </div>
          </div>

          {/* Step Indicators */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isCompleted = s.id < step;
              const isCurrent = s.id === step;
              return (
                <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isCompleted ? '#10b981' : isCurrent ? '#2563eb' : '#e2e8f0',
                    color: isCompleted || isCurrent ? '#fff' : '#94a3b8',
                    fontSize: '0.7rem', fontWeight: 700,
                    transition: 'all 0.2s',
                  }}>
                    {isCompleted ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: isCurrent ? '#1e3a8a' : '#94a3b8', textAlign: 'center' as const, lineHeight: 1.2 }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Banner */}
          {apiError && (
            <div style={errorBannerStyle}>
              <AlertCircle size={14} color="#b91c1c" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Step 1: Business Info */}
          {step === 1 && (
            <form onSubmit={handleStep1} style={formStyle} noValidate>
              <h2 style={stepTitleStyle}>Business Information</h2>

              <FormField label="Business Name *" error={form1.formState.errors.businessName?.message}>
                <input {...form1.register('businessName')} placeholder="Acme Lanka Pvt Ltd" style={inputStyle(!!form1.formState.errors.businessName)} />
              </FormField>

              <FormField label="Legal Name (if different)" error={undefined}>
                <input {...form1.register('legalName')} placeholder="Same as business name" style={inputStyle(false)} />
              </FormField>

              <FormField label="Business Registration Number *" error={form1.formState.errors.businessRegistrationNumber?.message}>
                <input {...form1.register('businessRegistrationNumber')} placeholder="PV 12345678" style={inputStyle(!!form1.formState.errors.businessRegistrationNumber)} />
              </FormField>

              <FormField label="Business Type *" error={form1.formState.errors.category?.message}>
                <select {...form1.register('category')} style={selectStyle(!!form1.formState.errors.category)}>
                  <option value="">Select business type...</option>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Business Email *" error={form1.formState.errors.contactEmail?.message}>
                <input {...form1.register('contactEmail')} type="email" placeholder="info@acmelanka.com" style={inputStyle(!!form1.formState.errors.contactEmail)} />
              </FormField>

              <FormField label="Business Phone *" error={form1.formState.errors.contactPhone?.message}>
                <input {...form1.register('contactPhone')} type="tel" placeholder="+94 11 234 5678" style={inputStyle(!!form1.formState.errors.contactPhone)} />
              </FormField>

              <FormField label="Website (optional)" error={form1.formState.errors.website?.message}>
                <input {...form1.register('website')} type="url" placeholder="https://www.acmelanka.com" style={inputStyle(!!form1.formState.errors.website)} />
              </FormField>

              <button type="submit" style={primaryBtnStyle(false)}>
                Next: Contact Person <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Step 2: Contact Person */}
          {step === 2 && (
            <form onSubmit={handleStep2} style={formStyle} noValidate>
              <h2 style={stepTitleStyle}>Primary Contact Person</h2>

              <FormField label="Full Name *" error={form2.formState.errors.contactFullName?.message}>
                <input {...form2.register('contactFullName')} placeholder="Kamal Perera" style={inputStyle(!!form2.formState.errors.contactFullName)} />
              </FormField>

              <FormField label="Position / Designation *" error={form2.formState.errors.contactDesignation?.message}>
                <input {...form2.register('contactDesignation')} placeholder="Managing Director" style={inputStyle(!!form2.formState.errors.contactDesignation)} />
              </FormField>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={goBack} style={secondaryBtnStyle}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="submit" style={{ ...primaryBtnStyle(false), flex: 1 }}>
                  Next: Business Address <ArrowRight size={15} />
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Business Address */}
          {step === 3 && (
            <form onSubmit={handleStep3} style={formStyle} noValidate>
              <h2 style={stepTitleStyle}>Business Address</h2>

              <FormField label="Street Address *" error={form3.formState.errors.streetAddress?.message}>
                <input {...form3.register('streetAddress')} placeholder="123 Main Street, Colombo 03" style={inputStyle(!!form3.formState.errors.streetAddress)} />
              </FormField>

              <FormField label="City *" error={form3.formState.errors.city?.message}>
                <input {...form3.register('city')} placeholder="Colombo" style={inputStyle(!!form3.formState.errors.city)} />
              </FormField>

              <FormField label="District *" error={form3.formState.errors.district?.message}>
                <input {...form3.register('district')} placeholder="Colombo" style={inputStyle(!!form3.formState.errors.district)} />
              </FormField>

              <FormField label="Postal Code (optional)" error={undefined}>
                <input {...form3.register('postalCode')} placeholder="00300" style={inputStyle(false)} />
              </FormField>

              <FormField label="Nearest SwiftDrop Branch (optional)" error={undefined}>
                <input {...form3.register('nearestBranch')} placeholder="Colombo Central" style={inputStyle(false)} />
              </FormField>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={goBack} style={secondaryBtnStyle}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="submit" style={{ ...primaryBtnStyle(false), flex: 1 }}>
                  Next: Account Setup <ArrowRight size={15} />
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Account Setup */}
          {step === 4 && currentUser && (
            <div style={formStyle}>
              <h2 style={stepTitleStyle}>Confirm Merchant Application</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '-0.25rem 0 0.5rem', lineHeight: 1.5 }}>
                Your merchant application will be linked directly to your authenticated SwiftDrop account.
              </p>

              <div style={{ padding: '1rem 1.25rem', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>
                  {currentUser.fullName}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#3b82f6' }}>
                  {currentUser.email}
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Once reviewed and approved by SwiftDrop Head Office, your account will be granted full operational Merchant permissions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={goBack} style={secondaryBtnStyle} disabled={isSubmitting}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" onClick={handleLoggedInSubmit} style={primaryBtnStyle(isSubmitting)} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && !currentUser && (
            <form onSubmit={handleStep4} style={formStyle} noValidate>
              <h2 style={stepTitleStyle}>Create Your Account</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '-0.25rem 0 0.5rem', lineHeight: 1.5 }}>
                This creates your SwiftDrop Merchant login credentials. If you already have an account, enter your existing password to link it.
              </p>

              <FormField label="Your Full Name *" error={form4.formState.errors.fullName?.message}>
                <input {...form4.register('fullName')} placeholder="Kamal Perera" style={inputStyle(!!form4.formState.errors.fullName)} />
              </FormField>

              <FormField label="Login Email *" error={form4.formState.errors.email?.message}>
                <input {...form4.register('email')} type="email" placeholder="you@example.com" style={inputStyle(!!form4.formState.errors.email)} />
              </FormField>

              <FormField label="Phone Number *" error={form4.formState.errors.phone?.message}>
                <input {...form4.register('phone')} type="tel" placeholder="+94 77 123 4567" style={inputStyle(!!form4.formState.errors.phone)} />
              </FormField>

              <FormField label="Password *" error={form4.formState.errors.password?.message}>
                <div style={{ position: 'relative' }}>
                  <input
                    {...form4.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    style={{ ...inputStyle(!!form4.formState.errors.password), paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </FormField>

              <FormField label="Confirm Password *" error={form4.formState.errors.confirmPassword?.message}>
                <div style={{ position: 'relative' }}>
                  <input
                    {...form4.register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    style={{ ...inputStyle(!!form4.formState.errors.confirmPassword), paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeBtnStyle}>
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </FormField>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={goBack} style={secondaryBtnStyle} disabled={isSubmitting}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="submit" style={primaryBtnStyle(isSubmitting)} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '1.25rem', textAlign: 'center' as const }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Already registered?{' '}
              <Link href="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Helper Component ────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={errorTextStyle}>{error}</p>}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const mainStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  display: 'flex',
  flexWrap: 'wrap' as const,
  margin: 0,
  padding: 0,
  backgroundColor: '#f0f3f8',
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const leftHeroStyle: React.CSSProperties = {
  flex: '1 1 42%',
  minWidth: '320px',
  minHeight: '100vh',
  position: 'relative' as const,
  backgroundImage: "url('/auth-hero-vertical.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: '#07101f',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'flex-start',
  padding: '3.5rem 3rem',
  boxSizing: 'border-box' as const,
};

const heroOverlayStyle: React.CSSProperties = {
  position: 'absolute' as const,
  inset: 0,
  background: 'linear-gradient(to bottom, rgba(7,16,31,0.5) 0%, rgba(7,16,31,0.15) 55%, rgba(7,16,31,0.6) 100%)',
  pointerEvents: 'none',
};

const heroTextStyle: React.CSSProperties = {
  position: 'relative' as const,
  zIndex: 10,
  maxWidth: 480,
};

const heroHeadlineStyle: React.CSSProperties = {
  fontSize: 'clamp(1.75rem, 3vw, 2.4rem)',
  fontWeight: 800,
  color: '#fff',
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  margin: '0 0 1rem',
  textShadow: '0 2px 12px rgba(0,0,0,0.55)',
};

const heroSubStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#e2e8f0',
  lineHeight: 1.55,
  margin: 0,
  textShadow: '0 1px 8px rgba(0,0,0,0.5)',
};

const rightSectionStyle: React.CSSProperties = {
  flex: '1 1 58%',
  minWidth: '320px',
  minHeight: '100vh',
  backgroundColor: '#f0f3f8',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '2.5rem 1.5rem',
  boxSizing: 'border-box' as const,
  overflowY: 'auto' as const,
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  backgroundColor: '#ffffff',
  borderRadius: 20,
  boxShadow: '0 20px 45px -8px rgba(15,23,42,0.08), 0 4px 14px rgba(15,23,42,0.04)',
  border: '1px solid rgba(226,232,240,0.95)',
  padding: '2.25rem 2.5rem',
  boxSizing: 'border-box' as const,
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#475569',
  textDecoration: 'none',
};

const brandRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1.5rem',
};

const logoBgStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'linear-gradient(135deg, #1d68ed, #2563eb)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
  flexShrink: 0,
};

const brandNameStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 800,
  color: '#0f172a',
  letterSpacing: '-0.02em',
  lineHeight: 1.15,
};

const brandSubStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 500,
  color: '#64748b',
  marginTop: 2,
};

const stepTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 1rem',
  letterSpacing: '-0.01em',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.85rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '0.3rem',
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.6rem 0.85rem',
  fontSize: '0.875rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  border: hasError ? '1px solid #ef4444' : '1px solid #cbd5e1',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box' as const,
});

const selectStyle = (hasError: boolean): React.CSSProperties => ({
  ...inputStyle(hasError),
  cursor: 'pointer',
});

const eyeBtnStyle: React.CSSProperties = {
  position: 'absolute' as const,
  right: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
};

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  width: '100%',
  height: 44,
  backgroundColor: disabled ? '#93c5fd' : '#2563eb',
  color: '#fff',
  fontSize: '0.875rem',
  fontWeight: 600,
  border: 'none',
  borderRadius: 8,
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxSizing: 'border-box' as const,
});

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  height: 44,
  paddingLeft: '1rem',
  paddingRight: '1rem',
  background: '#f8fafc',
  color: '#475569',
  fontSize: '0.875rem',
  fontWeight: 600,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  cursor: 'pointer',
  flexShrink: 0,
};

const errorTextStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#dc2626',
  margin: '0.2rem 0 0',
};

const errorBannerStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 8,
  padding: '0.65rem 0.85rem',
  marginBottom: '1rem',
  fontSize: '0.8rem',
  color: '#b91c1c',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};
