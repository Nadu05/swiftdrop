import { redirect } from 'next/navigation';

// /dispatcher has no content of its own; send users to the overview.
export default function DispatcherIndexPage() {
  redirect('/dispatcher/dashboard');
}

