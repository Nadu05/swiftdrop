'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Info, ArrowLeft, KeyRound } from 'lucide-react';

export default function MerchantApiCredentialsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/merchant/dashboard"
          className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-white">API Credentials</h1>
          <p className="text-sm text-slate-400">
            Developer API keys and access tokens for external e-commerce integrations
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/25 p-6 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">External API Integration — Coming Soon</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            SwiftDrop Developer API keys allow merchants to integrate their WooCommerce, Shopify, Magento,
            or custom ERP platforms directly into the SwiftDrop dispatch network for automatic parcel creation.
            This service integration is currently scheduled for an upcoming release.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-[#0c1829] border border-white/10 p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Planned Integration Capabilities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
          {[
            'Generate test and live API keys',
            'IP address allowlisting for webhook endpoints',
            'Automated order synchronization from online stores',
            'Real-time tracking updates via webhook callbacks',
            'Rate calculation and quote API endpoints',
            'Electronic airway bill (AWB) generation API',
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
