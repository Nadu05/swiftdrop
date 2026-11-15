'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  Filter,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  User,
  Users,
} from 'lucide-react';
import { useBranches, useBranchUsers } from '@/hooks/api/use-organization';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BranchUserType } from '@/types/organization.types';

export interface BranchUsersTabProps {
  initialBranchId?: number;
}

export default function BranchUsersTab({ initialBranchId }: BranchUsersTabProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialBranchId ? String(initialBranchId) : 'ALL'
  );
  const [userTypeFilter, setUserTypeFilter] = useState<'ALL' | BranchUserType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: branches = [] } = useBranches();
  const {
    data: users = [],
    isLoading,
    isRefetching,
    refetch,
  } = useBranchUsers();

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesBranch =
        selectedBranchId === 'ALL' || String(u.branchId) === selectedBranchId;
      const matchesType =
        userTypeFilter === 'ALL' || u.userType === userTypeFilter;
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.district.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.branchCode.toLowerCase().includes(q);

      return matchesBranch && matchesType && matchesSearch;
    });
  }, [users, selectedBranchId, userTypeFilter, searchQuery]);

  // Branch-wise scoped metrics when filtering by branch
  const branchScopedUsers = useMemo(() => {
    if (selectedBranchId === 'ALL') return users;
    return users.filter((u) => String(u.branchId) === selectedBranchId);
  }, [users, selectedBranchId]);

  const merchantCount = useMemo(
    () => branchScopedUsers.filter((u) => u.userType === 'MERCHANT').length,
    [branchScopedUsers]
  );

  const customerCount = useMemo(
    () => branchScopedUsers.filter((u) => u.userType === 'CUSTOMER').length,
    [branchScopedUsers]
  );

  const totalOrders = useMemo(
    () => branchScopedUsers.reduce((acc, u) => acc + u.totalOrders, 0),
    [branchScopedUsers]
  );

  const selectedBranchName = useMemo(() => {
    if (selectedBranchId === 'ALL') return null;
    const b = branches.find((item) => String(item.id) === selectedBranchId);
    return b ? `${b.name} (${b.code})` : null;
  }, [branches, selectedBranchId]);

  return (
    <div className="space-y-4" data-testid="branch-users-tab">
      {/* 1. Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered Merchants
              </span>
              <div className="text-2xl font-extrabold text-purple-600 mt-1">
                {merchantCount}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                {selectedBranchName ?? 'Regional commercial partners'}
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Store size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Customer Delivery Accounts
              </span>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">
                {customerCount}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                {selectedBranchName ?? 'Direct booking consumers'}
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <User size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Orders Placed
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {totalOrders.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                {selectedBranchName ?? 'Across all regional coverage zones'}
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShoppingBag size={20} />
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
              placeholder="Search user, merchant, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs bg-white dark:bg-slate-900"
            />
          </div>

          {/* User Type Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => setUserTypeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                userTypeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Users ({branchScopedUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setUserTypeFilter('MERCHANT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                userTypeFilter === 'MERCHANT'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Merchants ({merchantCount})
            </button>
            <button
              type="button"
              onClick={() => setUserTypeFilter('CUSTOMER')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                userTypeFilter === 'CUSTOMER'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Customers ({customerCount})
            </button>
          </div>

          {/* Branch Filter with branch-wise counts */}
          <select
            aria-label="Filter users by branch"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Regional Hubs ({users.length})</option>
            {branches.map((b) => {
              const count = users.filter((u) => u.branchId === b.id).length;
              return (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code}) — {count} {count === 1 ? 'user' : 'users'}
                </option>
              );
            })}
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

      {/* 3. Users Table */}
      <div className="org-directory-card">
        <div className="org-table-wrapper">
          <table className="org-table" aria-label="Branch Users Table">
            <thead>
              <tr>
                <th scope="col">User / Business</th>
                <th scope="col">User Type</th>
                <th scope="col">Associated Hub</th>
                <th scope="col">Location</th>
                <th scope="col">Contact Channels</th>
                <th scope="col">Order History</th>
                <th scope="col">Status</th>
                <th scope="col" className="org-table__th--actions">
                  Hub Link
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-xs text-slate-500">
                    No branch users match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isMerchant = u.userType === 'MERCHANT';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="org-branch-name-cell">
                          <strong className="text-sm font-bold text-slate-900 dark:text-slate-50">
                            {u.name}
                          </strong>
                          <span className="org-branch-coords font-mono">{u.id}</span>
                        </div>
                      </td>
                      <td>
                        <Badge
                          variant="outline"
                          className={
                            isMerchant
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }
                        >
                          {isMerchant ? (
                            <Store size={11} className="mr-1 inline" aria-hidden="true" />
                          ) : (
                            <User size={11} className="mr-1 inline" aria-hidden="true" />
                          )}
                          <span>{u.userType}</span>
                        </Badge>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {u.branchName}
                          </span>
                          <span className="org-branch-coords">{u.branchCode}</span>
                        </div>
                      </td>
                      <td>
                        <span className="org-branch-city">
                          <MapPin size={13} className="org-branch-city__icon" aria-hidden="true" />
                          <span>{u.city}, {u.district}</span>
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5 text-xs">
                          <a
                            href={`tel:${u.phone}`}
                            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-mono"
                          >
                            <Phone size={11} aria-hidden="true" />
                            <span>{u.phone}</span>
                          </a>
                          <a
                            href={`mailto:${u.email}`}
                            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 truncate max-w-44"
                          >
                            <Mail size={11} aria-hidden="true" />
                            <span>{u.email}</span>
                          </a>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {u.totalOrders} deliveries
                        </span>
                      </td>
                      <td>
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {u.status}
                        </Badge>
                      </td>
                      <td className="org-table__td--actions">
                        <div className="org-row-actions">
                          <Link
                            href={`/organization/branches/${u.branchId}`}
                            className="org-action-btn"
                          >
                            <Building2 size={13} aria-hidden="true" />
                            <span>View Hub</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

