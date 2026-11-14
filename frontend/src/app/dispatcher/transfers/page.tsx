'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Package,
  Truck,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
  Eye,
  Send,
  X,
  FileText,
  Lock,
} from 'lucide-react';
import {
  dispatchApi,
  ReadyForTransferParcelDto,
  TransferManifestDto,
  CourierProfileDto,
} from '@/api/services/dispatch.api';
import { organizationApi } from '@/api/services/organization.api';
import { BranchResponse } from '@/types/organization.types';
import { useAuthStore } from '@/store/auth.store';

export default function TransfersPage() {
  const user = useAuthStore((s) => s.user);

  // Tabs: 'outgoing' | 'incoming' | 'ready-parcels'
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming' | 'ready-parcels'>('outgoing');

  // Data states
  const [readyParcels, setReadyParcels] = useState<ReadyForTransferParcelDto[]>([]);
  const [manifests, setManifests] = useState<TransferManifestDto[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [couriers, setCouriers] = useState<CourierProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestinationBranchId, setSelectedDestinationBranchId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Selection for manifest creation
  const [selectedParcelKeys, setSelectedParcelKeys] = useState<Set<string>>(new Set());

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDestinationId, setCreateDestinationId] = useState<number | ''>('');
  const [createNotes, setCreateNotes] = useState('');
  const [creatingManifest, setCreatingManifest] = useState(false);

  // Assign courier modal
  const [selectedManifestForCourier, setSelectedManifestForCourier] = useState<TransferManifestDto | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [courierNotes, setCourierNotes] = useState('');
  const [assigningCourier, setAssigningCourier] = useState(false);

  // Departure modal
  const [selectedManifestForDepart, setSelectedManifestForDepart] = useState<TransferManifestDto | null>(null);
  const [sealNumber, setSealNumber] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [departing, setDeparting] = useState(false);

  // Success message toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [readyRes, manifestRes, branchRes, courierRes] = await Promise.all([
        dispatchApi.listReadyForTransferParcels(),
        dispatchApi.listTransferManifests(),
        organizationApi.getBranches(),
        dispatchApi.getCouriers(),
      ]);
      setReadyParcels(readyRes || []);
      setManifests(manifestRes || []);
      setBranches(Array.isArray(branchRes) ? branchRes : []);
      setCouriers(courierRes || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transfer operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter ready parcels
  const filteredReadyParcels = useMemo(() => {
    return readyParcels.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.trackingNumber?.toLowerCase().includes(q) ||
        String(p.orderId).toLowerCase().includes(q) ||
        p.destinationBranchName?.toLowerCase().includes(q);
      const matchesBranch =
        selectedDestinationBranchId === 'all' ||
        String(p.destinationBranchId) === selectedDestinationBranchId;
      return matchesSearch && matchesBranch;
    });
  }, [readyParcels, searchQuery, selectedDestinationBranchId]);

  // Outgoing vs Incoming manifests
  const outgoingManifests = useMemo(() => {
    return manifests.filter((m) => {
      const isOutgoing = user?.branchId ? m.originBranchId === user.branchId : true;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        m.manifestCode.toLowerCase().includes(q) ||
        m.destinationBranchName?.toLowerCase().includes(q) ||
        m.assignedCourierName?.toLowerCase().includes(q);
      const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;
      return isOutgoing && matchesSearch && matchesStatus;
    });
  }, [manifests, user?.branchId, searchQuery, selectedStatus]);

  const incomingManifests = useMemo(() => {
    return manifests.filter((m) => {
      const isIncoming = user?.branchId ? m.destinationBranchId === user.branchId : true;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        m.manifestCode.toLowerCase().includes(q) ||
        m.originBranchName?.toLowerCase().includes(q) ||
        m.assignedCourierName?.toLowerCase().includes(q);
      const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;
      return isIncoming && matchesSearch && matchesStatus;
    });
  }, [manifests, user?.branchId, searchQuery, selectedStatus]);

  // Handle parcel selection for batch manifest creation
  const toggleParcelSelect = (tracking: string) => {
    const updated = new Set(selectedParcelKeys);
    if (updated.has(tracking)) {
      updated.delete(tracking);
    } else {
      updated.add(tracking);
    }
    setSelectedParcelKeys(updated);
  };

  const selectAllParcels = () => {
    if (selectedParcelKeys.size === filteredReadyParcels.length) {
      setSelectedParcelKeys(new Set());
    } else {
      setSelectedParcelKeys(new Set(filteredReadyParcels.map((p) => p.trackingNumber)));
    }
  };

  // Create Manifest
  const handleCreateManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDestinationId) return;

    try {
      setCreatingManifest(true);
      const targetParcels = readyParcels.filter((p) =>
        selectedParcelKeys.has(p.trackingNumber)
      );

      const payload = {
        destinationBranchId: Number(createDestinationId),
        trackingNumbers: Array.from(selectedParcelKeys),
        orderIds: targetParcels.map((p) => String(p.orderId)),
        notes: createNotes,
      };

      const newManifest = await dispatchApi.createTransferManifest(payload);
      showToast(`Transfer Manifest ${newManifest.manifestCode} created successfully!`);
      setShowCreateModal(false);
      setSelectedParcelKeys(new Set());
      setCreateNotes('');
      setCreateDestinationId('');
      setActiveTab('outgoing');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create transfer manifest');
    } finally {
      setCreatingManifest(false);
    }
  };

  // Assign Courier
  const handleAssignCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManifestForCourier || !selectedCourierId) return;

    try {
      setAssigningCourier(true);
      await dispatchApi.assignTransferCourier(selectedManifestForCourier.id, {
        courierId: selectedCourierId,
        notes: courierNotes,
      });
      showToast(`Courier assigned to manifest ${selectedManifestForCourier.manifestCode}!`);
      setSelectedManifestForCourier(null);
      setSelectedCourierId('');
      setCourierNotes('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to assign courier');
    } finally {
      setAssigningCourier(false);
    }
  };

  // Depart Manifest
  const handleDepartManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManifestForDepart) return;

    try {
      setDeparting(true);
      await dispatchApi.departTransferManifest(selectedManifestForDepart.id, {
        sealNumber,
        handoverNotes,
        employeeName: user?.fullName || 'Branch Dispatcher',
      });
      showToast(`Manifest ${selectedManifestForDepart.manifestCode} dispatched in transit!`);
      setSelectedManifestForDepart(null);
      setSealNumber('');
      setHandoverNotes('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm manifest departure');
    } finally {
      setDeparting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="sd-badge sd-badge--neutral">Draft</span>;
      case 'ASSIGNED':
        return <span className="sd-badge sd-badge--info">Assigned</span>;
      case 'IN_TRANSIT':
        return <span className="sd-badge sd-badge--info animate-pulse">In Transit</span>;
      case 'COMPLETED':
      case 'RECEIVED':
        return <span className="sd-badge sd-badge--success">Completed</span>;
      case 'RECEIVED_WITH_DISCREPANCY':
        return <span className="sd-badge sd-badge--warning">Discrepancy</span>;
      case 'CANCELLED':
        return <span className="sd-badge sd-badge--danger">Cancelled</span>;
      default:
        return <span className="sd-badge sd-badge--neutral">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                Inter-Branch Transportation
              </h1>
              <p className="text-sm text-slate-500">
                Manage line-haul transfers, manifest dispatching, driver handovers, and receiving discrepancy verification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="sd-btn sd-btn--secondary"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              if (selectedParcelKeys.size === 0) {
                setActiveTab('ready-parcels');
              } else {
                setShowCreateModal(true);
              }
            }}
            className="sd-btn sd-btn--primary"
          >
            <Plus className="h-4 w-4" />
            Create Transfer Manifest
            {selectedParcelKeys.size > 0 && ` (${selectedParcelKeys.size})`}
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sd-stat-card">
          <div className="sd-stat-card__header">
            <span>Ready for Transfer</span>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div className="sd-stat-card__value">{readyParcels.length}</div>
          <div className="sd-stat-card__subtext">Parcels at hub awaiting line-haul</div>
        </div>

        <div className="sd-stat-card">
          <div className="sd-stat-card__header">
            <span>Outgoing Line-Hauls</span>
            <Send className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="sd-stat-card__value">
            {manifests.filter((m) => m.status === 'IN_TRANSIT').length}
          </div>
          <div className="sd-stat-card__subtext">Active manifests currently en-route</div>
        </div>

        <div className="sd-stat-card">
          <div className="sd-stat-card__header">
            <span>Incoming In-Transit</span>
            <Truck className="h-4 w-4 text-sky-600" />
          </div>
          <div className="sd-stat-card__value">{incomingManifests.length}</div>
          <div className="sd-stat-card__subtext">Incoming line-hauls arriving at this hub</div>
        </div>

        <div className="sd-stat-card">
          <div className="sd-stat-card__header">
            <span>Discrepancy Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="sd-stat-card__value text-amber-600">
            {manifests.filter((m) => m.status === 'RECEIVED_WITH_DISCREPANCY').length}
          </div>
          <div className="sd-stat-card__subtext">Manifests with missing or damaged parcels</div>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="sd-tabs">
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`sd-tab-btn ${activeTab === 'outgoing' ? 'sd-tab-btn--active' : ''}`}
        >
          <Send className="h-4 w-4" />
          Outgoing Manifests ({outgoingManifests.length})
        </button>

        <button
          onClick={() => setActiveTab('incoming')}
          className={`sd-tab-btn ${activeTab === 'incoming' ? 'sd-tab-btn--active' : ''}`}
        >
          <Truck className="h-4 w-4" />
          Incoming Line-Hauls ({incomingManifests.length})
        </button>

        <button
          onClick={() => setActiveTab('ready-parcels')}
          className={`sd-tab-btn ${activeTab === 'ready-parcels' ? 'sd-tab-btn--active' : ''}`}
        >
          <Package className="h-4 w-4" />
          Ready for Transfer Parcels ({readyParcels.length})
          {selectedParcelKeys.size > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-blue-600 text-xs text-white">
              {selectedParcelKeys.size} selected
            </span>
          )}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sd-card p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search code, tracking, branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sd-input pl-9"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeTab === 'ready-parcels' ? (
            <select
              value={selectedDestinationBranchId}
              onChange={(e) => setSelectedDestinationBranchId(e.target.value)}
              className="sd-select"
            >
              <option value="all">All Destination Hubs</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="sd-select"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Completed</option>
              <option value="RECEIVED_WITH_DISCREPANCY">Discrepancy</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {/* Tab 1: Outgoing Manifests */}
      {activeTab === 'outgoing' && (
        <div className="sd-table-container">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Manifest Code</th>
                <th>Route</th>
                <th>Assigned Courier</th>
                <th>Parcels</th>
                <th>Status</th>
                <th>Created At</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outgoingManifests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No outgoing manifests found matching criteria.
                  </td>
                </tr>
              ) : (
                outgoingManifests.map((m) => (
                  <tr key={m.id}>
                    <td className="font-mono font-semibold text-blue-600">
                      {m.manifestCode}
                    </td>
                    <td>
                      <div className="font-medium text-slate-900">
                        {m.originBranchName || `Hub #${m.originBranchId}`} &rarr;{' '}
                        <span className="text-blue-600 font-semibold">
                          {m.destinationBranchName || `Hub #${m.destinationBranchId}`}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {m.originBranchCode} to {m.destinationBranchCode}
                      </div>
                    </td>
                    <td>
                      {m.assignedCourierName ? (
                        <div>
                          <div className="font-medium text-slate-800">{m.assignedCourierName}</div>
                          <div className="text-xs text-slate-500">
                            {m.vehicleType || 'Vehicle'} • {m.vehiclePlate || 'No Plate'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Unassigned Driver</span>
                      )}
                    </td>
                    <td>
                      <div className="font-semibold text-slate-900">{m.expectedParcelCount} parcels</div>
                      {m.damagedParcelCount > 0 || m.missingParcelCount > 0 ? (
                        <div className="text-xs text-amber-600 font-medium">
                          {m.missingParcelCount} missing, {m.damagedParcelCount} damaged
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">All intact</div>
                      )}
                    </td>
                    <td>{getStatusBadge(m.status)}</td>
                    <td className="text-xs text-slate-500">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {m.status === 'DRAFT' && (
                          <button
                            onClick={() => setSelectedManifestForCourier(m)}
                            className="sd-btn sd-btn--sm sd-btn--secondary"
                          >
                            Assign Driver
                          </button>
                        )}

                        {m.status === 'ASSIGNED' && (
                          <button
                            onClick={() => setSelectedManifestForDepart(m)}
                            className="sd-btn sd-btn--sm sd-btn--primary"
                          >
                            <Lock className="h-3 w-3" />
                            Depart
                          </button>
                        )}

                        <Link
                          href={`/dispatcher/transfers/${m.id}`}
                          className="sd-btn sd-btn--sm sd-btn--outline"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Incoming Manifests */}
      {activeTab === 'incoming' && (
        <div className="sd-table-container">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Manifest Code</th>
                <th>Origin Hub</th>
                <th>Driver &amp; Vehicle</th>
                <th>Expected Parcels</th>
                <th>Departure Time</th>
                <th>Status</th>
                <th className="text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody>
              {incomingManifests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No incoming line-hauls en-route to this branch.
                  </td>
                </tr>
              ) : (
                incomingManifests.map((m) => (
                  <tr key={m.id}>
                    <td className="font-mono font-semibold text-blue-600">
                      {m.manifestCode}
                    </td>
                    <td>
                      <div className="font-semibold text-slate-900">
                        {m.originBranchName || `Hub #${m.originBranchId}`}
                      </div>
                      <div className="text-xs text-slate-500">{m.originBranchCode}</div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-800">
                        {m.assignedCourierName || 'Not recorded'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {m.vehicleType || 'Truck'} • {m.vehiclePlate || '—'}
                      </div>
                    </td>
                    <td className="font-semibold text-slate-900">
                      {m.expectedParcelCount} units
                    </td>
                    <td className="text-xs text-slate-500">
                      {m.departureAt ? new Date(m.departureAt).toLocaleString() : 'In Transit'}
                    </td>
                    <td>{getStatusBadge(m.status)}</td>
                    <td className="text-right">
                      <Link
                        href={`/dispatcher/transfers/${m.id}`}
                        className={`sd-btn sd-btn--sm ${
                          m.status === 'IN_TRANSIT'
                            ? 'sd-btn--primary'
                            : 'sd-btn--secondary'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {m.status === 'IN_TRANSIT' ? 'Receive & Verify' : 'View Inspection'}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Ready for Transfer Parcels */}
      {activeTab === 'ready-parcels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between sd-card p-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="select-all-parcels"
                checked={
                  filteredReadyParcels.length > 0 &&
                  selectedParcelKeys.size === filteredReadyParcels.length
                }
                onChange={selectAllParcels}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="select-all-parcels" className="text-sm font-medium text-slate-700 cursor-pointer">
                Select All ({filteredReadyParcels.length} parcels available)
              </label>
            </div>

            {selectedParcelKeys.size > 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="sd-btn sd-btn--primary sd-btn--sm"
              >
                <Plus className="h-4 w-4" />
                Generate Manifest for {selectedParcelKeys.size} Selected Parcels
              </button>
            )}
          </div>

          <div className="sd-table-container">
            <table className="sd-table">
              <thead>
                <tr>
                  <th className="w-10">Select</th>
                  <th>Tracking Number</th>
                  <th>Destination Hub</th>
                  <th>Category &amp; Weight</th>
                  <th>Priority</th>
                  <th>Ready Since</th>
                </tr>
              </thead>
              <tbody>
                {filteredReadyParcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No parcels awaiting transfer at this hub.
                    </td>
                  </tr>
                ) : (
                  filteredReadyParcels.map((parcel) => (
                    <tr
                      key={parcel.trackingNumber}
                      onClick={() => toggleParcelSelect(parcel.trackingNumber)}
                      className="cursor-pointer"
                      style={{
                        backgroundColor: selectedParcelKeys.has(parcel.trackingNumber)
                          ? '#eff6ff'
                          : undefined,
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedParcelKeys.has(parcel.trackingNumber)}
                          onChange={() => toggleParcelSelect(parcel.trackingNumber)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="font-mono font-semibold text-blue-600">
                        {parcel.trackingNumber}
                        <span className="block text-xs font-sans text-slate-500 font-normal">
                          Order #{parcel.orderId}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold text-slate-900">
                          {parcel.destinationBranchName || `Hub #${parcel.destinationBranchId}`}
                        </div>
                        <div className="text-xs text-slate-500">{parcel.destinationBranchCode}</div>
                      </td>
                      <td>
                        <span className="font-medium text-slate-800">
                          {parcel.parcelCategory || 'Standard'}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {parcel.weightKg ? `${parcel.weightKg} kg` : 'Standard weight'}
                        </span>
                      </td>
                      <td>
                        {parcel.priority === 'URGENT' ? (
                          <span className="sd-badge sd-badge--danger">
                            Urgent
                          </span>
                        ) : (
                          <span className="sd-badge sd-badge--neutral">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-slate-500">
                        {parcel.readySince ? new Date(parcel.readySince).toLocaleString() : 'Ready'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Transfer Manifest */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sd-card w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Create Transfer Manifest</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManifest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Destination Branch Hub *
                </label>
                <select
                  required
                  value={createDestinationId}
                  onChange={(e) => setCreateDestinationId(Number(e.target.value))}
                  className="sd-select"
                >
                  <option value="">Select Destination Hub</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {b.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Selected Parcels ({selectedParcelKeys.size})
                </label>
                <div className="max-h-36 overflow-y-auto p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono space-y-1">
                  {Array.from(selectedParcelKeys).map((key) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}</span>
                      <span className="text-slate-400">Ready</span>
                    </div>
                  ))}
                  {selectedParcelKeys.size === 0 && (
                    <div className="text-slate-400">No specific parcels pre-selected.</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Line-Haul Notes &amp; Instructions
                </label>
                <textarea
                  rows={2}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="e.g. Morning scheduled transport, fragile electronics included..."
                  className="sd-textarea"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="sd-btn sd-btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingManifest || !createDestinationId}
                  className="sd-btn sd-btn--primary"
                >
                  {creatingManifest ? 'Generating...' : 'Generate Manifest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Driver/Courier */}
      {selectedManifestForCourier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sd-card w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Assign Line-Haul Driver</h3>
              </div>
              <button
                onClick={() => setSelectedManifestForCourier(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="text-slate-600">
                Manifest Code: <span className="text-blue-600 font-mono font-bold">{selectedManifestForCourier.manifestCode}</span>
              </div>
              <div className="text-slate-600">
                Route: <span className="text-slate-900 font-medium">{selectedManifestForCourier.originBranchName} &rarr; {selectedManifestForCourier.destinationBranchName}</span>
              </div>
              <div className="text-slate-600">
                Parcels Count: <span className="text-slate-900 font-bold">{selectedManifestForCourier.expectedParcelCount}</span>
              </div>
            </div>

            <form onSubmit={handleAssignCourier} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Select Transport Courier / Driver *
                </label>
                <select
                  required
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="sd-select"
                >
                  <option value="">Select Transport Driver</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.vehicleType} - {c.vehiclePlate || 'No Plate'}) — Status: {c.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Handover Instructions / Notes
                </label>
                <input
                  type="text"
                  value={courierNotes}
                  onChange={(e) => setCourierNotes(e.target.value)}
                  placeholder="e.g. Highway route scheduled, vehicle inspected..."
                  className="sd-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedManifestForCourier(null)}
                  className="sd-btn sd-btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningCourier || !selectedCourierId}
                  className="sd-btn sd-btn--primary"
                >
                  {assigningCourier ? 'Assigning...' : 'Assign Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Departure & Security Seal */}
      {selectedManifestForDepart && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sd-card w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Confirm Line-Haul Departure</h3>
              </div>
              <button
                onClick={() => setSelectedManifestForDepart(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Record security container seal and confirm driver has taken physical custody of{' '}
              <strong className="text-slate-900">{selectedManifestForDepart.expectedParcelCount} parcels</strong>.
            </p>

            <form onSubmit={handleDepartManifest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Container Security Seal Number *
                </label>
                <input
                  type="text"
                  required
                  value={sealNumber}
                  onChange={(e) => setSealNumber(e.target.value)}
                  placeholder="e.g. SL-SEAL-892147"
                  className="sd-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Handover Verification Notes
                </label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. All parcels loaded into truck bay #2, seal affixed in presence of driver..."
                  className="sd-textarea"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedManifestForDepart(null)}
                  className="sd-btn sd-btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={departing || !sealNumber}
                  className="sd-btn sd-btn--primary"
                >
                  {departing ? 'Dispatching...' : 'Confirm Departure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
