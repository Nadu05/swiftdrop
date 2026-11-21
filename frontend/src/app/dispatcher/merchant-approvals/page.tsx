import { redirect } from 'next/navigation';

/**
 * Merchant Approvals has been moved from the Dispatcher portal
 * to Head Office Administration / Organization Service (/organization/merchants).
 */
export default function DispatcherMerchantApprovalsRedirectPage() {
  redirect('/organization/merchants');
}
