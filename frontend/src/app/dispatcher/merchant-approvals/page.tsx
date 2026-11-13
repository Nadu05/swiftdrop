import { redirect } from 'next/navigation';

export default function MerchantApprovalsPage() {
  redirect('/dispatcher/merchants?tab=approvals');
}
