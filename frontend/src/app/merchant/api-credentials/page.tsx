'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  Terminal,
  Clock,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  listMyOAuthClients,
  listMyOAuthHistory,
  rotateMyOAuthClient,
  revokeMyOAuthClient,
  ALL_MERCHANT_OAUTH_SCOPES,
  type OAuthClientDto,
  type OAuthClientProvisionedDto,
  type OAuthCredentialHistoryDto,
} from '@/api/services/oauth.api';

function formatDateTime(val?: string | null): string {
  if (!val) return 'Never';
  try {
    return new Date(val).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return val;
  }
}

export default function MerchantApiCredentialsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [revealedCredential, setRevealedCredential] = useState<OAuthClientProvisionedDto | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<OAuthClientDto | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const {
    data: clients = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<OAuthClientDto[]>({
    queryKey: ['merchant', 'oauth-clients', user?.userId],
    queryFn: () => listMyOAuthClients(),
    enabled: !!user?.userId,
    retry: false,
  });

  const { data: history = [] } = useQuery<OAuthCredentialHistoryDto[]>({
    queryKey: ['merchant', 'oauth-history', user?.userId],
    queryFn: () => listMyOAuthHistory(),
    enabled: !!user?.userId,
    retry: false,
  });

  const rotateMutation = useMutation({
    mutationFn: (id: number) => rotateMyOAuthClient(id),
    onSuccess: (provisioned) => {
      setRevealedCredential(provisioned);
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'oauth-clients'] });
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'oauth-history'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      revokeMyOAuthClient(id, reason),
    onSuccess: () => {
      setRevokeTarget(null);
      setRevokeReason('');
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'oauth-clients'] });
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'oauth-history'] });
    },
  });

  const handleCopy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const activeClient = clients.find((c) => c.status === 'ACTIVE') || clients[0] || null;
  const sampleClientId = activeClient?.clientId || '<YOUR_CLIENT_ID>';
  const tokenEndpoint = activeClient?.tokenEndpoint || 'http://localhost:8080/oauth2/token';

  const curlTokenSnippet = `curl -X POST "${tokenEndpoint}" \\
  -u "${sampleClientId}:<YOUR_CLIENT_SECRET>" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials&scope=merchant:orders:read merchant:orders:write"`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/merchant/dashboard"
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white">OAuth 2.0 API Credentials</h1>
            <p className="text-sm text-slate-400">
              Machine-to-machine OAuth 2.0 Client Credentials for your approved merchant integrations
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 bg-slate-900/70 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* One-Time Revealed Secret Banner */}
      {revealedCredential && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/35 p-6 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider">
                New Client Secret Generated — Copy Now (Shown Once Only)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setRevealedCredential(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Store this secret securely in your backend vault or environment variables. SwiftDrop hashes all secrets with BCrypt and will never display this value again.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10">
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Client ID</span>
              <div className="flex items-center justify-between gap-2 mt-1">
                <code className="text-xs text-indigo-300 font-mono break-all">
                  {revealedCredential.clientId}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy('cid', revealedCredential.clientId)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer shrink-0"
                >
                  {copiedField === 'cid' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30">
              <span className="text-[10px] uppercase text-emerald-400 font-bold block">Client Secret (One-Time)</span>
              <div className="flex items-center justify-between gap-2 mt-1">
                <code className="text-xs text-emerald-300 font-mono break-all">
                  {revealedCredential.clientSecret}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy('csec', revealedCredential.clientSecret)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-300 cursor-pointer shrink-0"
                >
                  {copiedField === 'csec' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OAuth Clients List */}
      {isLoading ? (
        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-12 text-center">
          <RefreshCw className="h-6 w-6 text-slate-500 mx-auto animate-spin" />
          <p className="text-xs text-slate-400 mt-3">Loading OAuth 2.0 credentials…</p>
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-[#0c1829] border border-rose-500/25 p-8 text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
          <p className="text-sm font-bold text-white">Unable to load OAuth credentials</p>
          <p className="text-xs text-slate-400">
            {(error as Error)?.message || 'Identity Service OAuth endpoint is temporarily unavailable.'}
          </p>
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-10 text-center space-y-3">
          <KeyRound className="h-9 w-9 text-slate-600 mx-auto" />
          <h2 className="text-sm font-bold text-white">No OAuth 2.0 Client Provisioned Yet</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            OAuth 2.0 credentials are automatically provisioned when a System Administrator approves your merchant application. Contact Head Office Administration if your account was approved prior to OAuth activation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className={`rounded-2xl bg-[#0c1829] border p-5 space-y-4 ${
                client.status === 'ACTIVE' ? 'border-indigo-500/35' : 'border-white/10 opacity-75'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Client ID:</span>
                    <code className="text-sm font-bold text-indigo-300 font-mono">
                      {client.clientId}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(`id-${client.id}`, client.clientId)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 cursor-pointer"
                      title="Copy Client ID"
                    >
                      {copiedField === `id-${client.id}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Merchant ID: <span className="font-mono text-slate-200">{client.merchantId}</span> · Token Endpoint:{' '}
                    <span className="font-mono text-sky-300">{client.tokenEndpoint}</span>
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold self-start sm:self-center ${
                    client.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : client.status === 'REVOKED'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {client.status}
                </span>
              </div>

              {/* Scopes */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Authorized OAuth 2.0 Scopes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {client.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[11px] font-mono"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata + Actions */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                <div className="flex flex-wrap gap-4">
                  <span>Created: {formatDateTime(client.createdAt)}</span>
                  <span>Last Used: {formatDateTime(client.lastUsedAt)}</span>
                  {client.revocationReason && (
                    <span className="text-rose-400">Reason: {client.revocationReason}</span>
                  )}
                </div>

                {client.status === 'ACTIVE' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => rotateMutation.mutate(client.id)}
                      disabled={rotateMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${rotateMutation.isPending ? 'animate-spin' : ''}`} />
                      Rotate Secret
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(client)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Developer Quick-Start Documentation */}
      <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="h-4 w-4 text-sky-400" />
            OAuth 2.0 Client Credentials Integration Guide
          </h2>
          <button
            type="button"
            onClick={() => handleCopy('curl', curlTokenSnippet)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
          >
            {copiedField === 'curl' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            Copy cURL
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Request a short-lived Bearer access token (3600s TTL, no refresh tokens) from the SwiftDrop OAuth 2.0 token endpoint, then pass it in the <code className="text-indigo-300">Authorization: Bearer &lt;access_token&gt;</code> header to Order Service endpoints.
        </p>
        <pre className="p-4 rounded-xl bg-slate-950 border border-white/10 text-xs text-sky-300 font-mono overflow-x-auto">
          {curlTokenSnippet}
        </pre>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          {ALL_MERCHANT_OAUTH_SCOPES.map((item) => (
            <div key={item.scope} className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-xs">
              <code className="text-indigo-300 font-mono font-semibold">{item.scope}</code>
              <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Credential Audit History */}
      {history.length > 0 && (
        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-6 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Credential Audit History
          </h2>
          <div className="divide-y divide-white/5 text-xs">
            {history.slice(0, 10).map((item) => (
              <div key={item.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white">{item.action}</span>{' '}
                  <span className="font-mono text-indigo-300 text-[11px]">({item.clientId})</span>
                  {item.details && <p className="text-[11px] text-slate-400 mt-0.5">{item.details}</p>}
                </div>
                <div className="text-[11px] text-slate-500 text-right">
                  <div>{item.performedBy}</div>
                  <div>{formatDateTime(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0c1829] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <XCircle className="h-5 w-5" />
              <h2 className="text-base font-bold text-white">Revoke OAuth Client</h2>
            </div>
            <p className="text-xs text-slate-300">
              Revoking <code className="font-mono text-indigo-300">{revokeTarget.clientId}</code> immediately blocks all future OAuth token requests using this credential.
            </p>
            <input
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Reason for revocation (optional)"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-400"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-slate-300 text-xs font-semibold hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  revokeMutation.mutate({ id: revokeTarget.id, reason: revokeReason || undefined })
                }
                disabled={revokeMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                {revokeMutation.isPending ? 'Revoking…' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
