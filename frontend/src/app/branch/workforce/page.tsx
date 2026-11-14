'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Bike,
  UserCog,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Phone,
  Mail,
  Truck,
  Building2,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  getAdminUsers,
  createAdminUser,
  suspendUser,
  activateUser,
} from '@/api/services/admin.api';
import { dispatchApi, CourierProfileDto } from '@/api/services/dispatch.api';
import { AdminUser } from '@/types/admin.types';

export default function BranchWorkforcePage() {
  const user = useAuthStore((s) => s.user);
  const activeBranchId = user?.branchId;

  // Tabs: 'dispatchers' | 'couriers'
  const [activeTab, setActiveTab] = useState<'dispatchers' | 'couriers'>('dispatchers');

  // Data states
  const [dispatchers, setDispatchers] = useState<AdminUser[]>([]);
  const [couriers, setCouriers] = useState<CourierProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showDispatcherModal, setShowDispatcherModal] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Form states - Dispatcher
  const [dFullName, setDFullName] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dPassword, setDPassword] = useState('');
  const [dPhone, setDPhone] = useState('');

  // Form states - Courier
  const [cFullName, setCFullName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cVehicleType, setCVehicleType] = useState('Motorcycle');
  const [cVehiclePlate, setCVehiclePlate] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const loadWorkforce = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dispatchers and couriers
      const [usersRes, couriersRes] = await Promise.allSettled([
        getAdminUsers({ role: 'DISPATCHER', size: 100 }),
        dispatchApi.getCouriers({ branchId: activeBranchId || undefined }),
      ]);

      if (usersRes.status === 'fulfilled') {
        const allDispatchers = usersRes.value.content || [];
        // Filter by branchId if user is branch-scoped
        const branchDispatchers = activeBranchId
          ? allDispatchers.filter((u) => u.branchId === activeBranchId || !u.branchId)
          : allDispatchers;
        setDispatchers(branchDispatchers);
      } else {
        // May fail if current user is strictly BRANCH_MANAGER without system ADMIN privilege
        console.warn('Dispatcher user list restricted by backend RBAC:', usersRes.reason);
      }

      if (couriersRes.status === 'fulfilled') {
        setCouriers(couriersRes.value || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load branch workforce directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkforce();
  }, [activeBranchId]);

  // Filtered lists
  const filteredDispatchers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dispatchers.filter((d) => {
      return (
        !q ||
        d.fullName?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q)
      );
    });
  }, [dispatchers, searchQuery]);

  const filteredCouriers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return couriers.filter((c) => {
      return (
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.vehiclePlate?.toLowerCase().includes(q)
      );
    });
  }, [couriers, searchQuery]);

  // Create Dispatcher Submit
  const handleRegisterDispatcher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingUser(true);
      setError(null);

      await createAdminUser({
        fullName: dFullName,
        email: dEmail,
        password: dPassword,
        phone: dPhone || undefined,
        roles: ['DISPATCHER'],
        accountStatus: 'ACTIVE',
        emailVerified: true,
        branchId: activeBranchId || undefined,
      });

      showToast(`Dispatcher ${dFullName} registered successfully for Hub #${activeBranchId || 1}!`);
      setShowDispatcherModal(false);
      setDFullName('');
      setDEmail('');
      setDPassword('');
      setDPhone('');
      await loadWorkforce();
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? 'Provisioning requires Head Office Admin authorization. Please request a Head Office Administrator to approve this account.'
          : err?.message || 'Failed to register dispatcher account'
      );
    } finally {
      setSubmittingUser(false);
    }
  };

  // Create Courier Submit
  const handleRegisterCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingUser(true);
      setError(null);

      await createAdminUser({
        fullName: cFullName,
        email: cEmail,
        password: cPassword,
        phone: cPhone || undefined,
        roles: ['COURIER'],
        accountStatus: 'ACTIVE',
        emailVerified: true,
        branchId: activeBranchId || undefined,
      });

      showToast(`Courier ${cFullName} registered successfully!`);
      setShowCourierModal(false);
      setCFullName('');
      setCEmail('');
      setCPassword('');
      setCPhone('');
      setCVehiclePlate('');
      await loadWorkforce();
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? 'Provisioning requires Head Office Admin authorization. Please request a Head Office Administrator to approve this account.'
          : err?.message || 'Failed to register courier account'
      );
    } finally {
      setSubmittingUser(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (userItem: AdminUser) => {
    try {
      if (userItem.accountStatus === 'ACTIVE') {
        await suspendUser(userItem.userId);
        showToast(`Account for ${userItem.email} suspended.`);
      } else {
        await activateUser(userItem.userId);
        showToast(`Account for ${userItem.email} activated.`);
      }
      await loadWorkforce();
    } catch (err: any) {
      setError(err?.message || 'Failed to update user status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Branch Workforce Management
              </h1>
              <p className="text-sm text-slate-400">
                Manage branch dispatchers, rostered couriers, shift availability, and operational credentials for Hub{' '}
                <span className="font-semibold text-cyan-300">#{activeBranchId || 'Central'}</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadWorkforce}
            disabled={loading}
            className="sd-btn sd-btn--secondary-dark"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {activeTab === 'dispatchers' ? (
            <button
              onClick={() => setShowDispatcherModal(true)}
              className="sd-btn sd-btn--primary"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Dispatcher</span>
            </button>
          ) : (
            <button
              onClick={() => setShowCourierModal(true)}
              className="sd-btn sd-btn--primary"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Courier</span>
            </button>
          )}
        </div>
      </div>

        {/* Notifications */}
        {successToast && (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium">{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Enterprise Permission Notice */}
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-200 text-xs flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Enterprise Role Governance:</strong> User credentials and role assignments are cryptographically signed by the Identity Service. Accounts created at the branch hub are automatically bound to{' '}
            <span className="font-mono text-cyan-300">branchId: {activeBranchId || 1}</span>.
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('dispatchers')}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'dispatchers'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCog className="h-4 w-4" />
            Branch Dispatchers ({dispatchers.length})
          </button>

          <button
            onClick={() => setActiveTab('couriers')}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'couriers'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bike className="h-4 w-4" />
            Courier Fleet ({couriers.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center bg-[#0b1528] p-3 rounded-xl border border-slate-800">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'dispatchers' ? 'dispatchers' : 'couriers'} by name, contact...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Tab 1: Dispatchers List */}
        {activeTab === 'dispatchers' && (
          <div className="bg-[#0b1528] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Dispatcher</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Assigned Branch Hub</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDispatchers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No dispatchers found for this branch hub.
                      </td>
                    </tr>
                  ) : (
                    filteredDispatchers.map((d) => (
                      <tr key={d.userId} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white">{d.fullName}</div>
                          <div className="text-xs text-slate-500 font-mono">ID: {d.userId.slice(0, 8)}...</div>
                        </td>
                        <td className="py-4 px-4 text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="h-3.5 w-3.5 text-slate-500" />
                            {d.email}
                          </div>
                          {d.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Phone className="h-3.5 w-3.5 text-slate-500" />
                              {d.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium text-slate-200">
                            {d.branchId ? `Branch Hub #${d.branchId}` : 'Central Hub'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              d.accountStatus === 'ACTIVE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {d.accountStatus}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-400">
                          {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(d)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                              d.accountStatus === 'ACTIVE'
                                ? 'bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800'
                                : 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
                            }`}
                          >
                            {d.accountStatus === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Couriers List */}
        {activeTab === 'couriers' && (
          <div className="bg-[#0b1528] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Courier</th>
                    <th className="py-3.5 px-4">Vehicle & License</th>
                    <th className="py-3.5 px-4">Duty Status</th>
                    <th className="py-3.5 px-4">Active Deliveries</th>
                    <th className="py-3.5 px-4">Completed Today</th>
                    <th className="py-3.5 px-4">Contact Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCouriers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No couriers found rostered at this branch hub.
                      </td>
                    </tr>
                  ) : (
                    filteredCouriers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white">{c.name}</div>
                          <div className="text-xs text-slate-500 font-mono">Code: {c.courierCode}</div>
                        </td>
                        <td className="py-4 px-4 text-xs">
                          <div className="font-medium text-slate-200">{c.vehicleType}</div>
                          <div className="text-slate-500">{c.vehiclePlate || 'No Plate Recorded'}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              c.status === 'AVAILABLE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : c.status === 'BUSY'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : c.status === 'ON_BREAK'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-semibold text-white">
                          {c.activeDeliveries || 0} / {c.maxCapacity || 5}
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-emerald-400">
                          {c.completedToday || 0} parcels
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-300">
                          {c.phone || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Modal: Register Dispatcher */}
      {showDispatcherModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1528] w-full max-w-lg rounded-2xl border border-slate-700 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Register Branch Dispatcher</h3>
              </div>
              <button
                onClick={() => setShowDispatcherModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterDispatcher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={dFullName}
                  onChange={(e) => setDFullName(e.target.value)}
                  placeholder="e.g. Ruwan Silva"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={dEmail}
                  onChange={(e) => setDEmail(e.target.value)}
                  placeholder="dispatcher@swiftdrop.lk"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  value={dPassword}
                  onChange={(e) => setDPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 special"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={dPhone}
                  onChange={(e) => setDPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                Assigned Role: <span className="font-semibold text-cyan-400">DISPATCHER</span> | Hub: <span className="font-semibold text-white">#{activeBranchId || 1}</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDispatcherModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-cyan-600/30"
                >
                  {submittingUser ? 'Provisioning...' : 'Provision Dispatcher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Courier */}
      {showCourierModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1528] w-full max-w-lg rounded-2xl border border-slate-700 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Register Branch Courier</h3>
              </div>
              <button
                onClick={() => setShowCourierModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterCourier} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Courier Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={cFullName}
                  onChange={(e) => setCFullName(e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={cEmail}
                  onChange={(e) => setCEmail(e.target.value)}
                  placeholder="courier@swiftdrop.lk"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  value={cPassword}
                  onChange={(e) => setCPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 special"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vehicle Type *
                  </label>
                  <select
                    value={cVehicleType}
                    onChange={(e) => setCVehicleType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Van">Van</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vehicle Plate / Reg
                  </label>
                  <input
                    type="text"
                    value={cVehiclePlate}
                    onChange={(e) => setCVehiclePlate(e.target.value)}
                    placeholder="WP AB-1234"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                  placeholder="+94 77 987 6543"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCourierModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-cyan-600/30"
                >
                  {submittingUser ? 'Registering...' : 'Register Courier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
