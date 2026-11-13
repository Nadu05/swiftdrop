import { redirect } from 'next/navigation';

/**
 * Merchant Application Review has been moved from the Dispatcher portal
 * to Head Office Administration / Organization Service (/organization/merchant-approvals/[applicationId]).
 */
export default async function DispatcherMerchantApplicationDetailRedirectPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  redirect(`/organization/merchant-approvals/${encodeURIComponent(applicationId)}`);
}
