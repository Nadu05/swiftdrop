'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/schema/user.schema';
import { useCurrentUser, useLogout, getApiErrorMessage } from '@/hooks/api/use-auth';
import { useChangePassword } from '@/hooks/api/use-password';
import { useAuthStore } from '@/store/auth.store';
import { resolvePostAuthRedirect } from '@/lib/auth/role-resolver';
import {
  Box,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  X,
  Loader2,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const cardClassName =
  'w-full max-w-[460px] rounded-[20px] border border-slate-200/95 bg-white p-8 sm:p-9 shadow-[0_20px_45px_-8px_rgba(15,23,42,0.08),0_4px_14px_rgba(15,23,42,0.04)]';

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: string;
  placeholder: string;
  show: boolean;
  onToggleShow: () => void;
  toggleLabel: string;
  errorMessage?: string;
  registration: UseFormRegisterReturn;
}

function PasswordField({
  id,
  label,
  autoComplete,
  placeholder,
  show,
  onToggleShow,
  toggleLabel,
  errorMessage,
  registration,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-slate-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...registration}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 ${
            errorMessage ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={toggleLabel}
          className="absolute right-2.5 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded p-1 text-slate-400 hover:text-slate-700"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errorMessage && (
        <p className="mt-1.5 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}

function ChangePasswordCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const storedUser = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const activeUser = currentUser || storedUser;

  const changeMutation = useChangePassword();
  const logoutMutation = useLogout();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isInitialized && (isError || !activeUser)) {
      const target = callbackUrl
        ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : '/login';
      router.replace(target);
      return;
    }

    if (!isLoading && activeUser && !activeUser.mustChangePassword) {
      const target = resolvePostAuthRedirect(activeUser, callbackUrl, activeRole);
      router.replace(target);
    }
  }, [isLoading, isInitialized, isError, activeUser, activeRole, callbackUrl, router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword', '');

  const rules = [
    { label: 'At least 8 characters', valid: newPasswordValue.length >= 8 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(newPasswordValue) },
    { label: 'At least one digit', valid: /[0-9]/.test(newPasswordValue) },
    { label: 'At least one special character', valid: /[^a-zA-Z0-9]/.test(newPasswordValue) },
  ];

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setApiError(null);
    try {
      await changeMutation.mutateAsync(values);
      if (activeUser) {
        const updatedUser = { ...activeUser, mustChangePassword: false };
        const target = resolvePostAuthRedirect(updatedUser, callbackUrl, activeRole);
        router.replace(target);
      } else {
        router.replace('/login');
      }
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    }
  };

  const isPending = isSubmitting || changeMutation.isPending;

  if (isLoading && !activeUser) {
    return (
      <div className={cardClassName}>
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClassName}>
      {/* Brand */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
            <Box size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Swift<span className="text-blue-600">Drop</span>
            </h1>
            <p className="text-[0.72rem] font-medium text-slate-500">
              National Logistics &amp; Delivery Platform
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>

      {/* Header */}
      <div className="mb-1.5 flex items-center gap-2">
        <KeyRound size={20} className="text-blue-600" />
        <h2 className="text-[1.35rem] font-bold tracking-tight text-slate-900">
          Set Your Personal Password
        </h2>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-slate-600">
        You signed in with a temporary password. For your account security, please choose a new personal password before accessing your portal.
      </p>

      {/* Notice Banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <ShieldCheck size={16} className="shrink-0 text-blue-600" />
        <span>
          Signed in as <strong className="font-semibold text-slate-900">{activeUser?.email}</strong>
        </span>
      </div>

      {/* API Error */}
      {apiError && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <PasswordField
          id="currentPassword"
          label="Temporary / Current Password"
          autoComplete="current-password"
          placeholder="Enter your temporary password"
          show={showCurrent}
          onToggleShow={() => setShowCurrent((prev) => !prev)}
          toggleLabel={showCurrent ? 'Hide current password' : 'Show current password'}
          errorMessage={errors.currentPassword?.message}
          registration={register('currentPassword')}
        />

        <div>
          <PasswordField
            id="newPassword"
            label="New Personal Password"
            autoComplete="new-password"
            placeholder="Enter new personal password"
            show={showNew}
            onToggleShow={() => setShowNew((prev) => !prev)}
            toggleLabel={showNew ? 'Hide new password' : 'Show new password'}
            errorMessage={errors.newPassword?.message}
            registration={register('newPassword')}
          />

          {/* Policy Checklist */}
          <div className="mt-2.5 flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            {rules.map((rule) => (
              <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                {rule.valid ? (
                  <Check size={13} className="text-emerald-600" />
                ) : (
                  <X size={13} className="text-slate-400" />
                )}
                <span className={rule.valid ? 'font-medium text-emerald-700' : 'text-slate-500'}>
                  {rule.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <PasswordField
          id="confirmPassword"
          label="Confirm New Password"
          autoComplete="new-password"
          placeholder="Confirm new personal password"
          show={showConfirm}
          onToggleShow={() => setShowConfirm((prev) => !prev)}
          toggleLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
          errorMessage={errors.confirmPassword?.message}
          registration={register('confirmPassword')}
        />

        <button
          type="submit"
          disabled={isPending}
          className={`mt-1 flex w-full items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-[0.925rem] font-bold text-white transition-colors ${
            isPending
              ? 'cursor-not-allowed bg-blue-400'
              : 'cursor-pointer bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.28)]'
          }`}
        >
          {isPending ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <span>Save Password &amp; Continue</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-screen w-full flex-wrap bg-[#f0f3f8] font-sans">
      {/* Left Visual Hero Section */}
      <section
        aria-label="Nationwide Delivery Network"
        className="relative hidden min-h-screen flex-[1_1_52%] flex-col justify-start bg-[#07101f] bg-cover bg-center p-12 lg:flex"
        style={{ backgroundImage: "url('/auth-hero-vertical.jpg')" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(7, 16, 31, 0.45) 0%, rgba(7, 16, 31, 0.12) 55%, rgba(7, 16, 31, 0.5) 100%)',
          }}
        />
        <div className="relative z-10 max-w-[480px]">
          <h2 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md">
            WHEREVER YOUR<br />CUSTOMER IS, WE&apos;RE<br />ALREADY THERE.
          </h2>
          <p className="text-base leading-relaxed text-slate-200 drop-shadow">
            Nationwide branch network covering every corner of Sri Lanka. North, South, East, West — no address is too far.
          </p>
        </div>
      </section>

      {/* Right Auth Card Section */}
      <section className="flex min-h-screen flex-[1_1_48%] items-center justify-center bg-[#f0f3f8] px-6 py-10">
        <Suspense
          fallback={
            <div className={cardClassName}>
              <div className="flex justify-center py-8">
                <Loader2 size={28} className="animate-spin text-blue-600" />
              </div>
            </div>
          }
        >
          <ChangePasswordCard />
        </Suspense>
      </section>
    </main>
  );
}
