'use client';

import React, { useState } from 'react';
import { Edit2, Power, Eye, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DeliveryZone } from './types';

interface ZoneTableProps {
  zones: DeliveryZone[];
  isLoading?: boolean;
  onEdit: (zone: DeliveryZone) => void;
  onToggleStatus: (zoneId: string) => void;
  onViewDetails: (zone: DeliveryZone) => void;
}

export default function ZoneTable({
  zones,
  isLoading = false,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: ZoneTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.max(1, Math.ceil(zones.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentZones = zones.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Delivery Zones Directory</h2>
          <p className="dispatcher-card__subtitle">
            Showing {zones.length} configured delivery territories across Sri Lanka
          </p>
        </div>
      </div>

      <div className="dispatcher-table-container">
        <table className="dispatcher-table">
          <thead>
            <tr>
              <th>Zone Details</th>
              <th>Zone Code</th>
              <th>Associated Branch</th>
              <th>Coverage Areas</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div className="dispatcher-reports-skeleton-list">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="dispatcher-reports-skeleton-item" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : currentZones.length === 0 ? (
              <tr>
                <td colSpan={6} className="dispatcher-table__empty">
                  <MapPin size={32} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                  <p>No delivery zones found matching your search and filter criteria.</p>
                </td>
              </tr>
            ) : (
              currentZones.map((zone) => {
                const isActive = zone.status === 'ACTIVE';
                return (
                  <tr key={zone.id}>
                    {/* Zone Details */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{zone.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ID: {zone.id}</div>
                    </td>

                    {/* Zone Code */}
                    <td>
                      <span className="dispatcher-zone-code-badge">{zone.code}</span>
                    </td>

                    {/* Associated Branch */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{zone.branchName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Branch #{zone.branchId}</div>
                    </td>

                    {/* Coverage Areas */}
                    <td>
                      <div className="dispatcher-zone-areas-list">
                        {zone.coverageAreas.slice(0, 3).map((area, idx) => (
                          <span key={idx} className="dispatcher-zone-area-tag">
                            {area}
                          </span>
                        ))}
                        {zone.coverageAreas.length > 3 && (
                          <span className="dispatcher-zone-area-tag dispatcher-zone-area-tag--more" title={zone.coverageAreas.slice(3).join(', ')}>
                            +{zone.coverageAreas.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className="dispatcher-status-badge"
                        style={{
                          background: isActive ? '#f0fdf4' : '#f8fafc',
                          color: isActive ? '#15803d' : '#64748b',
                          border: `1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}`,
                        }}
                      >
                        <span
                          className="dispatcher-status-dot"
                          style={{ background: isActive ? '#16a34a' : '#94a3b8' }}
                        />
                        {zone.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="dispatcher-zone-action-btn"
                          onClick={() => onViewDetails(zone)}
                          title="View Zone Details"
                          aria-label={`View details for ${zone.name}`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="dispatcher-zone-action-btn"
                          onClick={() => onEdit(zone)}
                          title="Edit Zone"
                          aria-label={`Edit ${zone.name}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className={`dispatcher-zone-action-btn ${isActive ? 'dispatcher-zone-action-btn--deactivate' : 'dispatcher-zone-action-btn--activate'}`}
                          onClick={() => onToggleStatus(zone.id)}
                          title={isActive ? 'Deactivate Zone' : 'Activate Zone'}
                          aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${zone.name}`}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="dispatcher-zone-pagination">
          <span className="dispatcher-zone-pagination-text">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, zones.length)} of {zones.length} zones
          </span>
          <div className="dispatcher-zone-pagination-btns">
            <button
              type="button"
              className="dispatcher-overview__refresh-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="dispatcher-overview__refresh-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

