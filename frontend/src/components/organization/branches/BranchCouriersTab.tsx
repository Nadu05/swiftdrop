'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bike,
  Building2,
  Car,
  CheckCircle2,
  Filter,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Star,
  Truck,
  Users,
} from 'lucide-react';
import { useBranches, useBranchCouriers } from '@/hooks/api/use-organization';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CourierShiftStatus, CourierVehicleType } from '@/types/organization.types';

export interface BranchCouriersTabProps {
  initialBranchId?: number;
}

export default function BranchCouriersTab({ initialBranchId }: BranchCouriersTabProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialBranchId ? String(initialBranchId) : 'ALL'
  );
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | CourierVehicleType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CourierShiftStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: branches = [] } = useBranches();
  const {
    data: couriers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useBranchCouriers();

  const filteredCouriers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return couriers.filter((c) => {
      const matchesBranch =
        selectedBranchId === 'ALL' || String(c.branchId) === selectedBranchId;
      const matchesVehicle =
        vehicleFilter === 'ALL' || c.vehicleType === vehicleFilter;
      const matchesStatus =
        statusFilter === 'ALL' || c.status === statusFilter;
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.courierCode.toLowerCase().includes(q) ||
        c.vehiclePlate.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.branchCode.toLowerCase().includes(q) ||
        c.branchName.toLowerCase().includes(q);

      return matchesBranch && matchesVehicle && matchesStatus && matchesSearch;
    });
  }, [couriers, selectedBranchId, vehicleFilter, statusFilter, searchQuery]);

  // Branch-wise scoped metrics when filtering by branch
  const branchScopedCouriers = useMemo(() => {
    if (selectedBranchId === 'ALL') return couriers;
    return couriers.filter((c) => String(c.branchId) === selectedBranchId);
  }, [couriers, selectedBranchId]);

  const onDeliveryCount = useMemo(
    () => branchScopedCouriers.filter((c) => c.status === 'ON_DELIVERY').length,
    [branchScopedCouriers]
  );
  const totalCompleted = useMemo(
    () => branchScopedCouriers.reduce((acc, c) => acc + c.completedDeliveriesTotal, 0),
    [branchScopedCouriers]
  );

  const selectedBranchName = useMemo(() => {
    if (selectedBranchId === 'ALL') return null;
    const b = branches.find((item) => String(item.id) === selectedBranchId);
    return b ? `${b.name} (${b.code})` : null;
  }, [branches, selectedBranchId]);

  const renderVehicleBadge = (vehicle: CourierVehicleType, plate: string) => {
    const getVehicleIcon = () => {
      switch (vehicle) {
        case 'MOTORCYCLE':
          return <Bike size={14} className="text-blue-600" />;
        case 'VAN':
          return <Truck size={14} className="text-emerald-600" />;
        case 'THREE_WHEELER':
          return <Car size={14} className="text-amber-600" />;
        default:
          return <Bike size={14} className="text-slate-600" />;
      }
    };

    const getVehicleLabel = () => {
      switch (vehicle) {
        case 'MOTORCYCLE':
          return 'Motorcycle';
        case 'VAN':
          return 'Delivery Van';
        case 'THREE_WHEELER':
          return 'Three-Wheeler';
        default:
          return 'Bicycle';
      }
    };

    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
          {getVehicleIcon()}
          <span>{getVehicleLabel()}</span>
        </span>
        <span className="font-mono text-[11px] text-slate-500 font-medium">
          {plate}
        </span>
      </div>
    );
  };

  const renderStatusBadge = (status: CourierShiftStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Available
          </Badge>
        );
      case 'ON_DELIVERY':
        return (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
            On Delivery
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
    <div className="space-y-4" data-testid="branch-couriers-tab">
      {/* 1. Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Fleet Couriers
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">
                {branchScopedCouriers.length}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                {selectedBranchName ?? 'Across all regional coverage zones'}
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Truck size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active On Delivery
              </span>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                {onDeliveryCount}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Couriers actively handling assigned orders
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Bike size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Lifetime Completed
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {totalCompleted.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Total deliveries successfully delivered
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
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
              placeholder="Search courier, plate, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs bg-white dark:bg-slate-900"
            />
          </div>

          {/* Branch Filter with branch-wise counts */}
          <select
            aria-label="Filter couriers by branch"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Regional Hubs ({couriers.length})</option>
            {branches.map((b) => {
              const count = couriers.filter((c) => c.branchId === b.id).length;
              return (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code}) — {count} {count === 1 ? 'courier' : 'couriers'}
                </option>
              );
            })}
          </select>

          {/* Vehicle Filter */}
          <select
            aria-label="Filter couriers by vehicle type"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value as 'ALL' | CourierVehicleType)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Vehicles</option>
            <option value="MOTORCYCLE">Motorcycle</option>
            <option value="VAN">Delivery Van</option>
            <option value="THREE_WHEELER">Three-Wheeler</option>
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter couriers by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | CourierShiftStatus)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_DELIVERY">On Delivery</option>
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

      {/* 3. Couriers Table Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Branch Delivery Fleet
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredCouriers.length} of {couriers.length} couriers stationed across regional branches
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium">Loading branch couriers...</p>
          </div>
        ) : filteredCouriers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Truck size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No couriers match the selected criteria.</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your branch, vehicle type, or search term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Courier</th>
                  <th className="py-3 px-4 font-semibold">Vehicle &amp; Plate</th>
                  <th className="py-3 px-4 font-semibold">Stationed Hub</th>
                  <th className="py-3 px-4 font-semibold">Shift Status</th>
                  <th className="py-3 px-4 font-semibold">Rating</th>
                  <th className="py-3 px-4 font-semibold">Active / Total</th>
                  <th className="py-3 px-4 font-semibold">Contact Channels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCouriers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Truck size={14} className="text-blue-600" />
                        <span>{c.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">
                        {c.courierCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {renderVehicleBadge(c.vehicleType, c.vehiclePlate)}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/organization/branches/${c.branchId}`}
                        className="group flex flex-col hover:opacity-85 transition-opacity"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                          {c.branchName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {c.branchCode}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      {renderStatusBadge(c.status)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span>{c.rating.toFixed(1)}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {c.activeDeliveriesCount} active
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {c.completedDeliveriesTotal} completed
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Phone size={11} className="text-slate-400" />
                          <span>{c.phone}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Mail size={11} className="text-slate-400" />
                          <span>{c.email}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

