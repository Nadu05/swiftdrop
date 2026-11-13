import { redirect } from 'next/navigation';

/**
 * Merchant Management & Approval Queue has been moved from the Dispatcher portal
 * to Head Office Administration / Organization Service (/organization/merchants).
 */
export default function DispatcherMerchantsRedirectPage() {
  redirect('/organization/merchants');
}
