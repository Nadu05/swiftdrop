'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import { Building2, MapPin, MapPinned, Search } from 'lucide-react';
import type { BranchResponse, BranchStatusFilter } from '@/types/organization.types';

export interface ServiceAreaCoverageOverviewProps {
  branches: BranchResponse[];
  isLoading: boolean;
}

function ServiceAreaCoverageOverview({
  branches,
  isLoading,
}: ServiceAreaCoverageOverviewProps) {
  const [statusFilter, setStatusFilter] = useState<BranchStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const totalAssignedAreas = useMemo(
    () =>
      branches.reduce(
        (sum, branch) => sum + (branch.assignedPostalAreas?.length ?? 0),
        0
      ),
    [branches]
  );

  const counts = useMemo(() => {
    const active = branches.filter((b) => b.status === 'ACTIVE').length;
    const inactive = branches.filter((b) => b.status === 'INACTIVE').length;
    return {
      all: branches.length,
      active,
      inactive,
    };
  }, [branches]);

  const filteredBranches = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return branches
      .filter((branch) => statusFilter === 'ALL' || branch.status === statusFilter)
      .map((branch) => {
        const areas = branch.assignedPostalAreas ?? [];
        if (!normalizedQuery) {
          return { branch, areas };
        }
        const branchMatches =
          branch.name.toLowerCase().includes(normalizedQuery) ||
          branch.code.toLowerCase().includes(normalizedQuery) ||
          branch.city.toLowerCase().includes(normalizedQuery);
        const matchingAreas = areas.filter(
          (area) =>
            area.postalCode.toLowerCase().includes(normalizedQuery) ||
            area.areaName.toLowerCase().includes(normalizedQuery) ||
            area.districtName.toLowerCase().includes(normalizedQuery) ||
            area.provinceName.toLowerCase().includes(normalizedQuery)
        );
        if (branchMatches) {
          return { branch, areas };
        }
        if (matchingAreas.length > 0) {
          return { branch, areas: matchingAreas };
        }
        return null;
      })
      .filter(
        (item): item is { branch: BranchResponse; areas: NonNullable<BranchResponse['assignedPostalAreas']> } =>
          item !== null
      );
  }, [branches, statusFilter, searchQuery]);

  return (
    <section
      className="org-directory-card org-dashboard-card"
      aria-labelledby="org-service-area-coverage-heading"
    >
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <div className="org-dashboard-card__title-row">
            <h2
              id="org-service-area-coverage-heading"
              className="org-directory-card__title"
            >
              Service-Area Coverage Overview
            </h2>
            {!isLoading && (
              <span className="org-code-badge">
                {totalAssignedAreas}{' '}
                {totalAssignedAreas === 1 ? 'Postal Area' : 'Postal Areas'}
              </span>
            )}
          </div>
          <p className="org-directory-card__subtitle">
            Assigned Sri Lankan Postal Areas configured per branch in{' '}
            <code className="org-inline-code">organization-service</code>.
            Pickup and delivery routing uses these branch assignments.
          </p>
        </div>

        <div className="org-dashboard-card__header-actions">
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '0.65rem',
                color: '#64748b',
                pointerEvents: 'none',
              }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search branch or postal code..."
              aria-label="Search branch or assigned postal area"
              className="org-form-input"
              style={{
                paddingLeft: '2rem',
                paddingTop: '0.4rem',
                paddingBottom: '0.4rem',
                fontSize: '0.8rem',
                minWidth: '210px',
              }}
            />
          </div>

          <div
            className="org-filters__status-group"
            role="group"
            aria-label="Filter service-area coverage by branch status"
          >
            <button
              type="button"
              className={`org-filters__status-pill${
                statusFilter === 'ALL' ? ' org-filters__status-pill--active' : ''
              }`}
              onClick={() => setStatusFilter('ALL')}
              aria-pressed={statusFilter === 'ALL'}
            >
              <span>All</span>
              <span className="org-filters__status-count">{counts.all}</span>
            </button>
            <button
              type="button"
              className={`org-filters__status-pill${
                statusFilter === 'ACTIVE' ? ' org-filters__status-pill--active' : ''
              }`}
              onClick={() => setStatusFilter('ACTIVE')}
              aria-pressed={statusFilter === 'ACTIVE'}
            >
              <span>Active</span>
              <span className="org-filters__status-count">{counts.active}</span>
            </button>
            <button
              type="button"
              className={`org-filters__status-pill${
                statusFilter === 'INACTIVE' ? ' org-filters__status-pill--active' : ''
              }`}
              onClick={() => setStatusFilter('INACTIVE')}
              aria-pressed={statusFilter === 'INACTIVE'}
            >
              <span>Inactive</span>
              <span className="org-filters__status-count">{counts.inactive}</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
          Loading branch service-area coverage...
        </div>
      ) : branches.length === 0 ? (
        <div className="org-state-box">
          <div className="org-state-box__icon" aria-hidden="true">
            <MapPinned size={22} />
          </div>
          <p className="org-state-box__title">No service areas configured</p>
          <p className="org-state-box__desc">
            Create a branch and assign Sri Lankan Postal Areas to see branch coverage here.
          </p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="org-state-box">
          <div className="org-state-box__icon" aria-hidden="true">
            <Search size={20} />
          </div>
          <p className="org-state-box__title">No matching branches or postal areas</p>
          <p className="org-state-box__desc">
            Try clearing your search filter or switching the branch status filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem 1.25rem 1.25rem' }}>
          {filteredBranches.map(({ branch, areas }) => {
            const isActive = branch.status === 'ACTIVE';
            return (
              <div
                key={branch.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '1rem 1.15rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
                    <Building2 size={16} color="#2563eb" aria-hidden="true" />
                    <Link
                      href={`/organization/branches/${branch.id}`}
                      style={{
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        color: '#0f172a',
                        textDecoration: 'none',
                      }}
                    >
                      {branch.name}
                    </Link>
                    <span className="org-code-badge">{branch.code}</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.8rem',
                        color: '#64748b',
                      }}
                    >
                      <MapPin size={13} aria-hidden="true" />
                      {branch.city}
                    </span>
                    <span
                      className={`org-status-badge ${
                        isActive ? 'org-status-badge--active' : 'org-status-badge--inactive'
                      }`}
                    >
                      <span className="org-status-badge__dot" aria-hidden="true" />
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
                      {areas.length} {areas.length === 1 ? 'area' : 'areas'}
                    </span>
                  </div>
                </div>

                {areas.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    No postal areas assigned to this branch yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {areas.map((area) => (
                      <div
                        key={area.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '0.5rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontWeight: 600,
                            fontSize: '0.74rem',
                            color: '#1d4ed8',
                            backgroundColor: '#eff6ff',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.3rem',
                          }}
                        >
                          {area.postalCode}
                        </span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {area.areaName}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          {area.districtName}, {area.provinceName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default memo(ServiceAreaCoverageOverview);

