'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Compass,
  ArrowRight,
  Store,
  Building2,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { fetchMyMerchantApplications } from '@/api/services/organization.api';
import type { MerchantApplicationResponse } from '@/types/organization.types';

export default function MerchantApplicationStatusPage() {
  const user = useAuthStore((s) => s.user);

  const {
    data: applications = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<MerchantApplicationResponse[]>({
    queryKey: ['merchant', 'applications', 'my', user?.userId],
    queryFn: fetchMyMerchantApplications,
    enabled: !!user?.userId,
    retry: false,
  });

  const latestApp = applications[0] || null;
  const isApproved = applications.some((a) => a.status === 'APPROVED');
  const isPending = latestApp?.status === 'PENDING' && !isApproved;
  const isRejected = latestApp?.status === 'REJECTED' && !isApproved;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <RefreshCw className="h-6 w-6 text-slate-500 mx-auto animate-spin" />
        <p className="text-xs text-slate-400 mt-3">Checking merchant application status…</p>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="rounded-2xl bg-[#0c1829] border border-emerald-500/30 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Merchant Application Approved!</h1>
          <p className="text-sm text-slate-300">
            Congratulations! Your business <strong className="text-white">{latestApp?.businessName}</strong> has been approved as an official SwiftDrop Merchant Partner.
          </p>
          <div className="pt-2">
            <Link
              href="/merchant/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold shadow-lg shadow-indigo-600/30"
            >
              Go to Merchant Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!latestApp) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-8 text-center space-y-4">
          <Store className="h-10 w-10 text-slate-500 mx-auto" />
          <h1 className="text-xl font-extrabold text-white">No Application on Record</h1>
          <p className="text-sm text-slate-400">
            You have not submitted a merchant registration application yet.
          </p>
          <Link
            href="/merchant-register"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Register Your Business
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div
        className={`rounded-2xl border p-8 shadow-xl ${
          isPending
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl ${
              isPending
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isPending ? (
              <Clock className="h-7 w-7" />
            ) : (
              <ShieldAlert className="h-7 w-7" />
            )}
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Merchant Onboarding Status
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isPending
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {latestApp.status}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              {isPending
                ? 'Your Merchant Application is Under Review'
                : 'Merchant Application Requires Attention'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isPending
                ? 'Head Office Administration is currently verifying your business registration and operating branch details. Full merchant shipment dispatch will unlock automatically once approved.'
                : `Your merchant application (${latestApp.id}) was not approved. Reason: ${
                    latestApp.rejectionReason || 'Please contact Head Office support.'
                  }`}
            </p>

            <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Application Code</span>
                <span className="font-mono font-bold text-white">{latestApp.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Business Name</span>
                <span className="font-bold text-white">{latestApp.businessName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Category</span>
                <span className="text-slate-200">{latestApp.categoryLabel || latestApp.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Submitted Date</span>
                <span className="text-slate-200">{latestApp.submittedAt}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
              <Link
                href="/merchant/tracking"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 text-xs font-semibold"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Track Existing Parcels</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
