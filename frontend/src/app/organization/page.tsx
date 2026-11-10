import { redirect } from 'next/navigation';

/**
 * Phase 1: Redirects /organization root to the Branch Directory (/organization/branches).
 * Organization dashboard overview charts will be added in a later phase.
 */
export default function OrganizationIndexPage() {
  redirect('/organization/branches');
}

