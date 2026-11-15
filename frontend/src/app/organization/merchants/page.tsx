'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  RefreshCw,
  Clock,
  ClipboardList,
  Store,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import MerchantApprovalSummaryCards from '@/components/dispatcher/merchant-approvals/MerchantApprovalSummaryCards';
import MerchantApprovalFilters from '@/components/dispatcher/merchant-approvals/MerchantApprovalFilters';
import MerchantApprovalTable from '@/components/dispatcher/merchant-approvals/MerchantApprovalTable';
import RegisteredMerchantsTable from '@/components/dispatcher/merchant-approvals/RegisteredMerchantsTable';
import {
  getMerchantApplications,
  getMerchantApprovalSummaryMetrics,
  getRegisteredMerchants,
  submitMerchantApplication,
  type MerchantApplicationCreateRequest,
} from '@/components/dispatcher/merchant-approvals/merchantApprovalApi';
import type {
  MerchantApplication,
  MerchantApprovalSummaryMetrics,
  MerchantApprovalFilterState,
} from '@/components/dispatcher/merchant-approvals/types';
import { AdminGuard } from '@/components/auth/RoleGuard';

function OrganizationMerchantManagementContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'directory' ? 'directory' : 'approvals';

  const [activeTab, setActiveTab] = useState<'approvals' | 'directory'>(initialTab);

  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [metrics, setMetrics] = useState<MerchantApprovalSummaryMetrics>({
    pendingReview: 0,
    awaitingMerchant: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    totalSubmissions: 0,
  });

  const [filters, setFilters] = useState<MerchantApprovalFilterState>({
    searchTerm: '',
    status: 'ALL',
    category: 'ALL',
    sortOrder: 'newest',
  });

  const [registeredMerchants, setRegisteredMerchants] = useState<MerchantApplication[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [formState, setFormState] = useState<MerchantApplicationCreateRequest>({
    businessName: '',
    legalName: '',
    businessRegistrationNumber: '',
    category: 'RETAIL',
    contactFullName: '',
    contactDesignation: 'Managing Director',
    contactEmail: '',
    contactPhone: '',
    streetAddress: '',
    city: '',
    district: 'Colombo',
    postalCode: '00100',
    nearestBranch: 'Colombo Central Hub',
    expectedDailyVolume: '20-50 parcels/day',
  });

  const formatTimestamp = () => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  };

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const [loadedApps, loadedMetrics, loadedRegistered] = await Promise.all([
          getMerchantApplications(filters),
          getMerchantApprovalSummaryMetrics(),
          getRegisteredMerchants(),
        ]);

        setApplications(loadedApps);
        setMetrics(loadedMetrics);
        setRegisteredMerchants(loadedRegistered);
        setLastUpdated(formatTimestamp());
      } catch (err: any) {
        console.error('Failed to load merchant data:', err);
        setError(err?.message || 'Unable to load merchant information from Organization Service.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleResetFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'ALL',
      category: 'ALL',
      sortOrder: 'newest',
    });
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const created = await submitMerchantApplication(formState);
      setSubmitSuccess(
        `Merchant application ${created.id} for "${created.businessName}" submitted with status ${created.status}.`
      );
      setIsModalOpen(false);
      setFormState({
        businessName: '',
        legalName: '',
        businessRegistrationNumber: '',
        category: 'RETAIL',
        contactFullName: '',
        contactDesignation: 'Managing Director',
        contactEmail: '',
        contactPhone: '',
        streetAddress: '',
        city: '',
        district: 'Colombo',
        postalCode: '00100',
        nearestBranch: 'Colombo Central Hub',
        expectedDailyVolume: '20-50 parcels/day',
      });
      await loadData(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit merchant application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dispatcher-overview" style={{ padding: '1.5rem 2rem' }}>
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <nav aria-label="Breadcrumb" className="dispatcher-breadcrumb">
            <span>SwiftDrop</span>
            <span className="dispatcher-breadcrumb-separator">/</span>
            <span>Head Office Administration</span>
            <span className="dispatcher-breadcrumb-separator">/</span>
            <span className="dispatcher-breadcrumb-current">Merchant Approvals &amp; Onboarding</span>
          </nav>

          <h1 className="dispatcher-overview__title">Merchant Approvals &amp; Onboarding</h1>
          <p className="dispatcher-overview__subtitle">
            Head Office Administration portal for reviewing merchant onboarding applications, verifying business credentials, and managing approved partner merchants.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          {lastUpdated && (
            <div className="dispatcher-overview__date-badge" title="Live data last sync time">
              <Clock size={14} className="dispatcher-overview__date-icon" aria-hidden="true" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          )}

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh merchant management data"
          >
            <RefreshCw
              size={14}
              className={`dispatcher-overview__refresh-icon ${
                isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''
              }`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="dispatcher-btn-primary"
            onClick={() => {
              setSubmitError(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={15} />
            <span>New Merchant Application</span>
          </button>
        </div>
      </header>

      {submitSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.1rem',
            marginBottom: '1rem',
            borderRadius: '10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{submitSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#166534' }}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="dispatcher-zone-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'approvals'}
          className={`dispatcher-zone-tab-btn ${
            activeTab === 'approvals' ? 'dispatcher-zone-tab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('approvals')}
        >
          <ClipboardList size={15} />
          <span>Approval Queue</span>
          {metrics.pendingReview > 0 && (
            <span
              style={{
                marginLeft: '0.35rem',
                padding: '0.1rem 0.5rem',
                borderRadius: '9999px',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              {metrics.pendingReview} pending
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'directory'}
          className={`dispatcher-zone-tab-btn ${
            activeTab === 'directory' ? 'dispatcher-zone-tab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('directory')}
        >
          <Store size={15} />
          <span>Registered Directory ({registeredMerchants.length})</span>
        </button>
      </div>

      {activeTab === 'approvals' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <MerchantApprovalSummaryCards metrics={metrics} isLoading={isLoading && !isRefreshing} />

          <MerchantApprovalFilters
            filters={filters}
            onChange={(updated) => setFilters(updated)}
            onReset={handleResetFilters}
            isLoading={isLoading || isRefreshing}
          />

          <MerchantApprovalTable
            applications={applications}
            isLoading={isLoading && !isRefreshing}
            error={error}
          />
        </div>
      ) : (
        <RegisteredMerchantsTable
          merchants={registeredMerchants}
          isLoading={isLoading && !isRefreshing}
        />
      )}

      {isModalOpen && (
        <div className="dispatcher-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="dispatcher-modal"
            style={{ maxWidth: '680px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-merchant-modal-title"
          >
            <div className="dispatcher-modal__header">
              <div>
                <h3 id="new-merchant-modal-title" className="dispatcher-modal__title">
                  Submit Merchant Onboarding Application
                </h3>
                <p className="dispatcher-modal__subtitle">
                  Register business details and contact information for Head Office verification.
                </p>
              </div>
              <button
                type="button"
                className="dispatcher-modal__close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateApplication}>
              <div
                className="dispatcher-modal__body"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.85rem',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                }}
              >
                {submitError && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="dispatcher-reports-filter-label">Business Name *</label>
                  <input
                    type="text"
                    required
                    className="dispatcher-reports-date-input"
                    value={formState.businessName}
                    onChange={(e) => setFormState({ ...formState, businessName: e.target.value })}
                    placeholder="e.g. Ceylon Spice Traders"
                  />
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">Legal Entity Name</label>
                  <input
                    type="text"
                    className="dispatcher-reports-date-input"
                    value={formState.legalName || ''}
                    onChange={(e) => setFormState({ ...formState, legalName: e.target.value })}
                    placeholder="e.g. Ceylon Spice Traders (Pvt) Ltd"
                  />
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">
                    Business Registration Number (BRN) *
                  </label>
                  <input
                    type="text"
                    required
                    className="dispatcher-reports-date-input"
                    value={formState.businessRegistrationNumber}
                    onChange={(e) =>
                      setFormState({ ...formState, businessRegistrationNumber: e.target.value })
                    }
                    placeholder="e.g. PV-00891234"
                  />
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">Business Category *</label>
                  <select
                    className="dispatcher-select dispatcher-reports-select"
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        category: e.target.value as MerchantApplicationCreateRequest['category'],
                      })
                    }
                  >
                    <option value="GROCERY_FOOD">Grocery &amp; Food</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="RETAIL">Retail</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">Contact Person Full Name *</label>
                  <input
                    type="text"
                    required
                    className="dispatcher-reports-date-input"
                    value={formState.contactFullName}
                    onChange={(e) =>
                      setFormState({ ...formState, contactFullName: e.target.value })
                    }
                    placeholder="e.g. Kasun Perera"
                  />
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">Designation</label>
                  <input
                    type="text"
                    className="dispatcher-reports-date-input"
                    value={formState.contactDesignation || ''}
                    onChange={(e) =>
                      setFormState({ ...formState, contactDesignation: e.target.value })
                    }
                    placeholder="e.g. Operations Manager"
                  />
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">Contact Email *</label>
                  <input
                    type="email"
                    required
                    className="dispatcher-reports-date-input"
                    value={formState.contactEmail}
                    onChange={(e) => setFormState({ ...formState, contactEmail: e.target.value })}
                    placeholder="contact@business.lk"
                  />
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    className="dispatcher-reports-date-input"
                    value={formState.contactPhone}
                    onChange={(e) => setFormState({ ...formState, contactPhone: e.target.value })}
                    placeholder="+94 77 123 4567"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="dispatcher-reports-filter-label">Street Address *</label>
                  <input
                    type="text"
                    required
                    className="dispatcher-reports-date-input"
                    value={formState.streetAddress}
                    onChange={(e) => setFormState({ ...formState, streetAddress: e.target.value })}
                    placeholder="e.g. 48 Galle Road, Kollupitiya"
                  />
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">City *</label>
                  <input
                    type="text"
                    required
                    className="dispatcher-reports-date-input"
                    value={formState.city}
                    onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                    placeholder="e.g. Colombo 03"
                  />
                </div>

                <div>
                  <label className="dispatcher-reports-filter-label">Preferred Dispatch Hub</label>
                  <input
                    type="text"
                    className="dispatcher-reports-date-input"
                    value={formState.nearestBranch || ''}
                    onChange={(e) => setFormState({ ...formState, nearestBranch: e.target.value })}
                    placeholder="e.g. Colombo Central Hub"
                  />
                </div>
              </div>

              <div className="dispatcher-modal__footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="dispatcher-overview__refresh-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="dispatcher-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizationMerchantManagementPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <div className="dispatcher-overview" style={{ padding: '2rem', color: '#64748b' }}>
            Loading Head Office merchant approvals...
          </div>
        }
      >
        <OrganizationMerchantManagementContent />
      </Suspense>
    </AdminGuard>
  );
}

