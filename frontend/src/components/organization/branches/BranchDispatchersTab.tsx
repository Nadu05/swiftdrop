'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Filter,
  Headphones,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useBranchDispatchers, useBranches } from '@/hooks/api/use-organization';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { DispatcherShiftStatus } from '@/types/organization.types';

export interface BranchDispatchersTabProps {
  initialBranchId?: number;
}

export default function BranchDispatchersTab({
  initialBranchId,
}: BranchDispatchersTabProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialBranchId ? String(initialBranchId) : 'ALL'
  );
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: branches = [] } = useBranches();
  const {
    data: dispatchers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useBranchDispatchers();

  const filteredDispatchers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dispatchers.filter((d) => {
      const matchesBranch =
        selectedBranchId === 'ALL' || String(d.branchId) === selectedBranchId;
      const matchesShift =
        shiftFilter === 'ALL' || d.shiftStatus === shiftFilter;
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.branchCode.toLowerCase().includes(q) ||
        d.branchName.toLowerCase().includes(q);

      return matchesBranch && matchesShift && matchesSearch;
    });
  }, [dispatchers, selectedBranchId, shiftFilter, searchQuery]);

  // Branch-wise scoped metrics when filtering by branch
  const branchScopedDispatchers = useMemo(() => {
    if (selectedBranchId === 'ALL') return dispatchers;
    return dispatchers.filter((d) => String(d.branchId) === selectedBranchId);
  }, [dispatchers, selectedBranchId]);

  const onDutyCount = useMemo(
    () => branchScopedDispatchers.filter((d) => d.shiftStatus === 'ON_DUTY').length,
    [branchScopedDispatchers]
  );

  const couriersSupervisedTotal = useMemo(
    () => branchScopedDispatchers.reduce((acc, d) => acc + d.activeCouriersSupervised, 0),
    [branchScopedDispatchers]
  );

  const selectedBranchName = useMemo(() => {
    if (selectedBranchId === 'ALL') return null;
    const b = branches.find((item) => String(item.id) === selectedBranchId);
    return b ? `${b.name} (${b.code})` : null;
  }, [branches, selectedBranchId]);

  const getShiftBadge = (status: DispatcherShiftStatus) => {
    switch (status) {
      case 'ON_DUTY':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            On Duty
          </Badge>
        );
      case 'ON_BREAK':
        return (
          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
            On Break
          </Badge>
        );
      case 'OFF_DUTY':
        return (
          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
            Off Duty
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4" data-testid="branch-dispatchers-tab">
      {/* 1. Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Branch Dispatchers
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">
                {branchScopedDispatchers.length}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                {selectedBranchName ?? 'Across all regional hubs'}
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Headphones size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Actively On Duty
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {onDutyCount}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Ready for dispatch oversight
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Couriers Supervised
              </span>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                {couriersSupervisedTotal}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Assigned delivery fleet
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Truck size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search dispatcher, phone, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs bg-white dark:bg-slate-900"
            />
          </div>

          {/* Branch Filter with branch-wise counts */}
          <select
            aria-label="Filter dispatchers by branch"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Regional Hubs ({dispatchers.length})</option>
            {branches.map((b) => {
              const count = dispatchers.filter((d) => d.branchId === b.id).length;
              return (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code}) — {count} {count === 1 ? 'dispatcher' : 'dispatchers'}
                </option>
              );
            })}
          </select>

          {/* Shift Status Filter */}
          <select
            aria-label="Filter dispatchers by shift status"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Shifts</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="ON_BREAK">On Break</option>
            <option value="OFF_DUTY">Off Duty</option>
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="gap-1.5 text-xs text-slate-700 dark:text-slate-300"
        >
          <RefreshCw
            size={13}
            className={isRefetching ? 'animate-spin' : undefined}
            aria-hidden="true"
          />
          <span>{isRefetching ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* 3. Dispatchers Table */}
      <div className="org-directory-card">
        <div className="org-table-wrapper">
          <table className="org-table" aria-label="Branch Dispatchers Table">
            <thead>
              <tr>
                <th scope="col">Dispatcher</th>
                <th scope="col">Stationed Branch</th>
                <th scope="col">Contact Channels</th>
                <th scope="col">Shift Status</th>
                <th scope="col">Couriers Supervised</th>
                <th scope="col" className="org-table__th--actions">
                  Hub Link
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDispatchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-slate-500">
                    No branch dispatchers match the current filters.
                  </td>
                </tr>
              ) : (
                filteredDispatchers.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="org-branch-name-cell">
                        <strong className="text-sm font-bold text-slate-900 dark:text-slate-50">
                          {d.name}
                        </strong>
                        <span className="org-branch-coords font-mono">{d.id}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {d.branchName}
                        </span>
                        <span className="org-branch-coords">{d.branchCode}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <a
                          href={`tel:${d.phone}`}
                          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-mono"
                        >
                          <Phone size={11} aria-hidden="true" />
                          <span>{d.phone}</span>
                        </a>
                        <a
                          href={`mailto:${d.email}`}
                          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 truncate max-w-44"
                        >
                          <Mail size={11} aria-hidden="true" />
                          <span>{d.email}</span>
                        </a>
                      </div>
                    </td>
                    <td>{getShiftBadge(d.shiftStatus)}</td>
                    <td>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {d.activeCouriersSupervised} couriers
                      </span>
                    </td>
                    <td className="org-table__td--actions">
                      <div className="org-row-actions">
                        <Link
                          href={`/organization/branches/${d.branchId}`}
                          className="org-action-btn"
                        >
                          <Building2 size={13} aria-hidden="true" />
                          <span>View Hub</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

