'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  RefreshCw,
  Building2,
  Clock,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { fetchMyMerchantApplications } from '@/api/services/organization.api';
import type { MerchantApplicationResponse } from '@/types/organization.types';

export default function MerchantPickupLocationsPage() {
  const user = useAuthStore((s) => s.user);

  const { data: applications = [], isLoading } = useQuery<MerchantApplicationResponse[]>({
    queryKey: ['merchant', 'applications', 'my', user?.userId],
    queryFn: fetchMyMerchantApplications,
    enabled: !!user?.userId,
    retry: false,
  });

  const app = applications.find((a) => a.status === 'APPROVED') || applications[0] || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Pickup Locations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your registered pickup addresses for merchant deliveries
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/40 text-indigo-400 text-xs font-semibold cursor-not-allowed opacity-60"
          title="Pickup location management coming soon"
        >
          <Plus className="h-4 w-4" />
          Add Location
        </button>
      </div>

      {/* Coming Soon Banner */}
      <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/25 p-5 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-indigo-300">Pickup Location Management — Coming Soon</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            The ability to save and manage multiple pickup locations is currently being developed.
            Once available, you will be able to add business addresses, warehouses, and fulfillment centers
            as named pickup locations to streamline your delivery orders.
          </p>
        </div>
      </div>

      {/* Default Location from Application */}
      {isLoading ? (
        <div className="rounded-xl bg-[#0c1829] border border-white/10 p-8 text-center">
          <RefreshCw className="h-5 w-5 text-slate-500 mx-auto animate-spin" />
          <p className="text-xs text-slate-400 mt-2">Loading location data…</p>
        </div>
      ) : app?.businessAddress ? (
        <div className="rounded-xl bg-[#0c1829] border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Business Address</h2>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Default
            </span>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/15 shrink-0">
                <Building2 className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-bold text-white">{app.businessName}</p>
                <div className="flex items-start gap-1.5 text-xs text-slate-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-500" />
                  <span>{app.businessAddress.street}, {app.businessAddress.city}</span>
                </div>
                {app.businessAddress.district && (
                  <p className="text-xs text-slate-500 pl-5">{app.businessAddress.district} District</p>
                )}
                {app.businessAddress.postalCode && (
                  <p className="text-xs text-slate-500 pl-5">Postal Code: {app.businessAddress.postalCode}</p>
                )}
                {app.businessAddress.nearestBranch && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-5">
                    <Building2 className="h-3 w-3" />
                    <span>Nearest Branch: {app.businessAddress.nearestBranch}</span>
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                From application
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0c1829] border border-white/10 p-10 text-center space-y-3">
          <MapPin className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-white">No Pickup Locations</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your business address will appear here once your merchant application is submitted.
          </p>
        </div>
      )}

      {/* Planned Features */}
      <div className="rounded-xl bg-[#0c1829] border border-white/10 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Planned Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Save multiple named pickup locations',
            'Set a default pickup address for quick ordering',
            'Add warehouse or fulfillment center addresses',
            'Assign contact person per pickup location',
            'Manage operating hours per location',
            'QuickBook: pre-fill order forms from saved locations',
          ].map((feature, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 mt-1 shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
