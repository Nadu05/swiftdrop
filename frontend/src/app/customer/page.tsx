import { redirect } from 'next/navigation';

/**
 * Customer Root Index Route: /customer
 * Automatically redirects to the customer dashboard.
 */
export default function CustomerIndexPage() {
  redirect('/customer/dashboard');
}

