'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Store, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { lookupMerchantApplicationStatus } from '@/api/services/organization.api';

export default function PublicMerchantStatusLookupPage() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupMerchantApplicationStatus>> | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!reference.trim() || !email.trim()) {
      setError('Please enter both your Application Reference Number and Business Email.');
      return;
    }
    setLoading(true);
    try {
      const data = await lookupMerchantApplicationStatus(reference, email);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Could not locate a matching merchant application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070d18] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl bg-[#0c1829] border border-white/10 p-7 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400">
            <Store className="h-4 w-4" />
            Merchant Status
          </span>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-white">Check Merchant Application Status</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your application reference number (e.g. APP-2026-XXXX) and registered business email.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLookup} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Application Reference *</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="APP-2026-0812"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Business Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="business@company.lk"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            {loading ? 'Checking…' : 'Check Application Status'}
          </button>
        </form>

        {result && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white">{result.businessName}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-bold text-[11px]">
                {result.status === 'APPROVED' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                ) : result.status === 'REJECTED' || result.status === 'SUSPENDED' ? (
                  <XCircle className="h-3 w-3 text-rose-400" />
                ) : (
                  <Clock className="h-3 w-3 text-amber-400" />
                )}
                {result.statusLabel || result.status}
              </span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              Ref: {result.applicationReference}
            </div>
            {result.infoRequestMessage && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200">
                <strong>Additional Information Requested:</strong> {result.infoRequestMessage}
              </div>
            )}
            {result.rejectionReason && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-200">
                <strong>Rejection Reason:</strong> {result.rejectionReason}
              </div>
            )}
            <div className="pt-1">
              <Link href="/login" className="text-indigo-400 hover:underline font-semibold">
                Sign in to manage your application &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
