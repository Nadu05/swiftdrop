'use client';

import React, { useState } from 'react';
import {
  Store,
  Search,
  Tag,
  MapPin,
  CheckCircle2,
  Eye,
  X,
} from 'lucide-react';
import type { MerchantApplication } from './types';

interface RegisteredMerchantsTableProps {
  merchants: MerchantApplication[];
  isLoading?: boolean;
}

export default function RegisteredMerchantsTable({
  merchants,
  isLoading = false,
}: RegisteredMerchantsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantApplication | null>(null);

  const filteredMerchants = merchants.filter((m) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      m.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.businessRegistrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.contactPerson.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.businessAddress.nearestBranch.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Search and Filters */}
      <section
        className="dispatcher-reports-filters-card"
        aria-label="Registered Merchants Filters"
        style={{ marginBottom: '1.25rem' }}
      >
        <div className="dispatcher-reports-filters-grid">
          <div className="dispatcher-reports-filter-group" style={{ flex: 1.5 }}>
            <label htmlFor="registered-search" className="dispatcher-reports-filter-label">
              <Search size={13} aria-hidden="true" />
              <span>Search Registered Merchants</span>
            </label>
            <div className="dispatcher-select-wrapper">
              <input
                id="registered-search"
                type="text"
                className="dispatcher-reports-date-input"
                placeholder="Search by business name, BRN, contact person, or branch hub..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="dispatcher-reports-filter-group">
            <label htmlFor="registered-category" className="dispatcher-reports-filter-label">
              <Tag size={13} aria-hidden="true" />
              <span>Business Category</span>
            </label>
            <div className="dispatcher-select-wrapper">
              <select
                id="registered-category"
                className="dispatcher-select dispatcher-reports-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={isLoading}
              >
                <option value="ALL">All Categories</option>
                <option value="GROCERY_FOOD">Grocery / Food</option>
                <option value="PHARMACY">Pharmacy</option>
                <option value="RETAIL">Retail</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Directory Table */}
      <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
        <div className="dispatcher-card__header">
          <div>
            <h2 className="dispatcher-card__title">Registered Partner Directory</h2>
            <p className="dispatcher-card__subtitle">
              Showing {filteredMerchants.length} verified and active partner businesses
            </p>
          </div>
        </div>

        <div className="dispatcher-table-container">
          <table className="dispatcher-table">
            <thead>
              <tr>
                <th>Merchant ID &amp; Name</th>
                <th>Category</th>
                <th>Contact Person</th>
                <th>Assigned Hub</th>
                <th>Daily Volume</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div className="dispatcher-reports-skeleton-list">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="dispatcher-reports-skeleton-item" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="dispatcher-table__empty">
                    <Store size={32} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                    <p>No registered merchants match the search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((merchant) => (
                  <tr key={merchant.id}>
                    {/* Merchant ID & Name */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{merchant.businessName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span className="dispatcher-zone-code-badge" style={{ fontSize: '0.7rem' }}>
                          {merchant.id}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          BRN: {merchant.businessRegistrationNumber}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="dispatcher-zone-area-tag" style={{ fontWeight: 600 }}>
                        {merchant.categoryLabel}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        {merchant.businessAddress.city}
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {merchant.contactPerson.fullName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {merchant.contactPerson.phone}
                      </div>
                    </td>

                    {/* Assigned Hub */}
                    <td>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.8rem',
                          color: '#334155',
                          fontWeight: 500,
                        }}
                      >
                        <MapPin size={13} color="#2563eb" />
                        <span>{merchant.businessAddress.nearestBranch}</span>
                      </div>
                    </td>

                    {/* Daily Volume */}
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                        {merchant.expectedDailyVolume}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className="dispatcher-status-badge"
                        style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                      >
                        <CheckCircle2 size={12} />
                        Active Partner
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="dispatcher-overview__refresh-btn"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => setSelectedMerchant(merchant)}
                        aria-label={`View details for ${merchant.businessName}`}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Details Modal */}
      {selectedMerchant && (
        <div className="dispatcher-modal-backdrop" onClick={() => setSelectedMerchant(null)}>
          <div
            className="dispatcher-modal"
            style={{ maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="dispatcher-modal__header">
              <div>
                <h3 className="dispatcher-modal__title">{selectedMerchant.businessName}</h3>
                <p className="dispatcher-modal__subtitle">
                  {selectedMerchant.legalName || selectedMerchant.businessName} • {selectedMerchant.id}
                </p>
              </div>
              <button
                type="button"
                className="dispatcher-modal__close-btn"
                onClick={() => setSelectedMerchant(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="dispatcher-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>BRN NUMBER</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {selectedMerchant.businessRegistrationNumber}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>CATEGORY</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {selectedMerchant.categoryLabel}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>CONTACT PERSON</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {selectedMerchant.contactPerson.fullName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedMerchant.contactPerson.phone} • {selectedMerchant.contactPerson.email}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>DISPATCH HUB</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {selectedMerchant.businessAddress.nearestBranch}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedMerchant.businessAddress.street}, {selectedMerchant.businessAddress.city}
                  </div>
                </div>
              </div>

              {selectedMerchant.reviewNotes && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#166534',
                  }}
                >
                  <strong>Verification Audit Note:</strong> {selectedMerchant.reviewNotes}
                </div>
              )}
            </div>

            <div className="dispatcher-modal__footer">
              <button
                type="button"
                className="dispatcher-btn-primary"
                onClick={() => setSelectedMerchant(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

