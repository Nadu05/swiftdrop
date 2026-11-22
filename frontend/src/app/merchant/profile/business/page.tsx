'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Package,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { fetchMyMerchantApplications } from '@/api/services/organization.api';
import type { MerchantApplicationResponse } from '@/types/organization.types';

function StatusBadge({ status }: { status: string }) {
  const styles = {
    APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    REJECTED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  }[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';

  const Icon = status === 'APPROVED' ? CheckCircle2 : status === 'PENDING' ? Clock : XCircle;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${styles}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      {Icon && <Icon className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-slate-500 block">{label}</span>
        <span className="text-xs text-slate-200 font-medium break-words">{value}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#0c1829] border border-white/10 p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-4">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function MerchantBusinessProfilePage() {
  const user = useAuthStore((s) => s.user);

  const {
    data: applications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<MerchantApplicationResponse[]>({
    queryKey: ['merchant', 'applications', 'my', user?.userId],
    queryFn: fetchMyMerchantApplications,
    enabled: !!user?.userId,
    retry: false,
  });

  const app = applications[0] || null;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <RefreshCw className="h-6 w-6 text-slate-500 mx-auto animate-spin" />
        <p className="text-xs text-slate-400 mt-3">Loading business profile…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
        <p className="text-sm font-bold text-white">Could not load business profile</p>
        <button onClick={() => refetch()} className="text-xs text-indigo-400 hover:underline cursor-pointer">
          Try again
        </button>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <Package className="h-10 w-10 text-slate-600 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Merchant Application Found</h2>
        <p className="text-sm text-slate-400">You have not submitted a merchant application yet.</p>
        <Link
          href="/merchant-register"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          Register as Merchant
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111e3b] via-[#0d1830] to-[#0a1326] border border-indigo-500/25 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <Building2 className="h-4 w-4" />
            Business Profile
          </div>
          <h1 className="text-2xl font-extrabold text-white">{app.businessName}</h1>
          <p className="text-sm text-slate-400">{app.categoryLabel || app.category}</p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <StatusBadge status={app.status} />
          <span className="text-[11px] text-slate-500 font-mono">Application: {app.id}</span>
        </div>
      </div>

      {/* Rejection Notice */}
      {app.status === 'REJECTED' && app.rejectionReason && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 flex items-start gap-3">
          <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-300">Application Rejected</p>
            <p className="text-xs text-slate-400 mt-0.5">{app.rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Business Information */}
        <SectionCard title="Business Information" icon={Building2}>
          <InfoRow label="Business Name" value={app.businessName} icon={Building2} />
          <InfoRow label="Legal Name" value={app.legalName} icon={FileText} />
          <InfoRow label="Registration Number" value={app.businessRegistrationNumber} icon={FileText} />
          <InfoRow label="Business Type" value={app.categoryLabel || app.category} icon={Package} />
          <InfoRow label="Expected Daily Volume" value={app.expectedDailyVolume} icon={Package} />
        </SectionCard>

        {/* Contact Person */}
        <SectionCard title="Primary Contact" icon={User}>
          <InfoRow label="Name" value={app.contactPerson?.fullName} icon={User} />
          <InfoRow label="Designation" value={app.contactPerson?.designation} icon={FileText} />
          <InfoRow label="Email" value={app.contactPerson?.email} icon={Mail} />
          <InfoRow label="Phone" value={app.contactPerson?.phone} icon={Phone} />
        </SectionCard>

        {/* Business Address */}
        <SectionCard title="Business Address" icon={MapPin}>
          <InfoRow label="Street Address" value={app.businessAddress?.street} icon={MapPin} />
          <InfoRow label="City" value={app.businessAddress?.city} icon={MapPin} />
          <InfoRow label="District" value={app.businessAddress?.district} icon={MapPin} />
          <InfoRow label="Postal Code" value={app.businessAddress?.postalCode} icon={MapPin} />
          <InfoRow label="Nearest Branch" value={app.businessAddress?.nearestBranch} icon={Building2} />
        </SectionCard>

        {/* Application Timeline */}
        <SectionCard title="Application Timeline" icon={Clock}>
          <InfoRow label="Submitted At" value={app.submittedAt ? new Date(app.submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined} icon={Clock} />
          <InfoRow label="Last Updated" value={app.updatedAt ? new Date(app.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined} icon={Clock} />
          {app.reviewedAt && <InfoRow label="Reviewed At" value={new Date(app.reviewedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} icon={Clock} />}
          {app.reviewedBy && <InfoRow label="Reviewed By" value={app.reviewedBy} icon={User} />}
          {app.reviewNotes && <InfoRow label="Review Notes" value={app.reviewNotes} icon={FileText} />}
        </SectionCard>
      </div>

      {/* Account Actions */}
      <div className="rounded-xl bg-[#0c1829] border border-white/10 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Account Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-slate-300 text-xs font-semibold hover:bg-white/5"
          >
            <User className="h-3.5 w-3.5" />
            Manage Account Profile
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-slate-300 text-xs font-semibold hover:bg-white/5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Account Settings
          </Link>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          Business profile details are read-only. To update business information, please contact SwiftDrop Head Office support.
        </p>
      </div>
    </div>
  );
}
