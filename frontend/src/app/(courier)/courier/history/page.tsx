import type { Metadata } from 'next';
import JobHistory from '@/components/courier/history/JobHistory';

export const metadata: Metadata = { title: 'Job History' };

/** Member 08: Job History — /courier/history */
export default function Page() {
  return <JobHistory />;
}
