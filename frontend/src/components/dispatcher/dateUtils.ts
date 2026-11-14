/**
 * Shared dynamic date-filter utilities for dispatcher tables.
 * Uses the live system clock rather than static fixture dates.
 */
export function isSameLocalDay(isoDate: string | undefined, referenceDate: Date): boolean {
  if (!isoDate) return false;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === referenceDate.getFullYear() &&
    parsed.getMonth() === referenceDate.getMonth() &&
    parsed.getDate() === referenceDate.getDate()
  );
}

export function matchesRelativeDateFilter(
  isoDate: string | undefined,
  dateFilter: string | undefined
): boolean {
  if (!dateFilter || dateFilter === 'ALL') return true;
  if (!isoDate) return false;

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return false;

  const now = new Date();
  if (dateFilter === 'TODAY') {
    return isSameLocalDay(isoDate, now);
  }
  if (dateFilter === 'YESTERDAY') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return isSameLocalDay(isoDate, yesterday);
  }
  if (dateFilter === 'LAST_7_DAYS' || dateFilter === 'LAST_WEEK' || dateFilter === '7D') {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return parsed.getTime() >= sevenDaysAgo.getTime();
  }
  if (dateFilter === 'THIS_MONTH' || dateFilter === '30D') {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    return parsed.getTime() >= thirtyDaysAgo.getTime();
  }

  return true;
}

