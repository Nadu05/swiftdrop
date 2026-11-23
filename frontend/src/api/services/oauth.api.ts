import axiosClient from '@/api/axios-client';

export interface OAuthClientDto {
  id: number;
  clientId: string;
  merchantId: string;
  merchantName: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'ROTATED';
  scopes: string[];
  tokenEndpoint: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
}

export interface OAuthClientProvisionedDto extends OAuthClientDto {
  /** Returned ONCE upon initial provisioning or secret rotation. Never retrievable again. */
  clientSecret: string;
}

export interface OAuthCredentialHistoryDto {
  id: number;
  clientId: string;
  merchantId: string;
  action: string;
  performedBy: string;
  details?: string | null;
  createdAt: string;
}

export const ALL_MERCHANT_OAUTH_SCOPES = [
  { scope: 'merchant:profile:read', description: 'View merchant profile' },
  { scope: 'merchant:orders:read', description: 'View merchant orders' },
  { scope: 'merchant:orders:write', description: 'Create delivery orders' },
  { scope: 'merchant:orders:update', description: 'Update permitted order information' },
  { scope: 'merchant:tracking:read', description: 'Track merchant-owned deliveries' },
  { scope: 'merchant:webhooks:manage', description: 'Manage merchant webhooks' },
] as const;

// ─── Merchant Self-Service Endpoints ─────────────────────────────────────────

export async function listMyOAuthClients(): Promise<OAuthClientDto[]> {
  const { data } = await axiosClient.get<OAuthClientDto[]>('/api/v1/merchants/oauth-clients/my');
  return Array.isArray(data) ? data : [];
}

export async function listMyOAuthHistory(): Promise<OAuthCredentialHistoryDto[]> {
  const { data } = await axiosClient.get<OAuthCredentialHistoryDto[]>(
    '/api/v1/merchants/oauth-clients/my/history'
  );
  return Array.isArray(data) ? data : [];
}

export async function rotateMyOAuthClient(id: number): Promise<OAuthClientProvisionedDto> {
  const { data } = await axiosClient.post<OAuthClientProvisionedDto>(
    `/api/v1/merchants/oauth-clients/${id}/rotate`
  );
  return data;
}

export async function revokeMyOAuthClient(id: number, reason?: string): Promise<OAuthClientDto> {
  const { data } = await axiosClient.post<OAuthClientDto>(
    `/api/v1/merchants/oauth-clients/${id}/revoke`,
    reason ? { reason } : {}
  );
  return data;
}

// ─── Admin OAuth Management Endpoints ────────────────────────────────────────

export async function adminProvisionMerchantOAuthClient(payload: {
  merchantId: string;
  merchantName: string;
  scopes?: string[];
}): Promise<OAuthClientProvisionedDto> {
  const { data } = await axiosClient.post<OAuthClientProvisionedDto>(
    '/api/v1/admin/oauth-clients/provision',
    payload
  );
  return data;
}

export async function adminListMerchantOAuthClients(merchantId: string): Promise<OAuthClientDto[]> {
  const { data } = await axiosClient.get<OAuthClientDto[]>(
    `/api/v1/admin/oauth-clients/merchant/${encodeURIComponent(merchantId)}`
  );
  return Array.isArray(data) ? data : [];
}

export async function adminUpdateMerchantOAuthScopes(
  id: number,
  scopes: string[]
): Promise<OAuthClientDto> {
  const { data } = await axiosClient.put<OAuthClientDto>(
    `/api/v1/admin/oauth-clients/${id}/scopes`,
    { scopes }
  );
  return data;
}

export async function adminRevokeOAuthClient(id: number, reason?: string): Promise<OAuthClientDto> {
  const { data } = await axiosClient.post<OAuthClientDto>(
    `/api/v1/admin/oauth-clients/${id}/revoke`,
    reason ? { reason } : {}
  );
  return data;
}
