'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, MapPinned, Plus, Search, Trash2 } from 'lucide-react';
import { getDistricts, searchPostalAreas } from '@/api/services/organization.api';
import type { DistrictDto, PostalAreaDto, ProvinceDto } from '@/types/organization.types';

export interface PostalAreaPickerProps {
  provinces: ProvinceDto[];
  physicalPostalCode?: string;
  selectedAreas: PostalAreaDto[];
  onChange: (areas: PostalAreaDto[]) => void;
  disabled?: boolean;
  error?: string | null;
}

export default function PostalAreaPicker({
  provinces,
  physicalPostalCode,
  selectedAreas,
  onChange,
  disabled = false,
  error = null,
}: PostalAreaPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvinceId, setFilterProvinceId] = useState<number | null>(null);
  const [filterDistrictId, setFilterDistrictId] = useState<number | null>(null);
  const [filterDistricts, setFilterDistricts] = useState<DistrictDto[]>([]);
  const [results, setResults] = useState<PostalAreaDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dismissedPhysicalCode, setDismissedPhysicalCode] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(selectedAreas.map((a) => a.id)),
    [selectedAreas]
  );

  // Load districts for the picker's Province filter
  useEffect(() => {
    if (filterProvinceId === null) {
      setFilterDistricts([]);
      setFilterDistrictId(null);
      return;
    }
    let cancelled = false;
    getDistricts(filterProvinceId)
      .then((data) => {
        if (!cancelled) setFilterDistricts(data);
      })
      .catch(() => {
        if (!cancelled) setFilterDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [filterProvinceId]);

  // Search postal areas with debounce
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      searchPostalAreas({
        provinceId: filterProvinceId ?? undefined,
        districtId: filterDistrictId ?? undefined,
        search: searchQuery.trim() || undefined,
      })
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch((err) => {
          if (!cancelled) {
            setLoadError(
              err instanceof Error ? err.message : 'Unable to search postal areas.'
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filterProvinceId, filterDistrictId, searchQuery]);

  // Reset dismissed warning and auto-suggest tracker if the user types a new 5-digit physical postal code
  const prevPhysicalRef = useRef<string | undefined>(physicalPostalCode);
  const autoSuggestedCodeRef = useRef<string | null>(null);
  const selectedAreasRef = useRef(selectedAreas);
  selectedAreasRef.current = selectedAreas;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (prevPhysicalRef.current !== physicalPostalCode) {
      prevPhysicalRef.current = physicalPostalCode;
      setDismissedPhysicalCode(null);
      autoSuggestedCodeRef.current = null;
    }
  }, [physicalPostalCode]);

  // Auto-suggest and attach the branch's physical postal code once per 5-digit code entry
  useEffect(() => {
    const trimmed = physicalPostalCode?.trim() ?? '';
    if (!/^[0-9]{5}$/.test(trimmed)) return;
    if (dismissedPhysicalCode === trimmed) return;
    if (autoSuggestedCodeRef.current === trimmed) return;
    if (selectedAreasRef.current.some((a) => a.postalCode === trimmed)) {
      autoSuggestedCodeRef.current = trimmed;
      return;
    }

    autoSuggestedCodeRef.current = trimmed;
    let cancelled = false;
    searchPostalAreas({ search: trimmed })
      .then((matches) => {
        if (cancelled) return;
        const exact = matches.find((m) => m.postalCode === trimmed);
        if (exact && !selectedAreasRef.current.some((a) => a.id === exact.id)) {
          onChangeRef.current([...selectedAreasRef.current, exact]);
        }
      })
      .catch(() => {
        // Non-critical auto-suggestion failure
      });

    return () => {
      cancelled = true;
    };
  }, [physicalPostalCode, dismissedPhysicalCode]);

  const handleAdd = (area: PostalAreaDto) => {
    if (disabled || selectedIds.has(area.id)) return;
    if (area.postalCode === physicalPostalCode?.trim()) {
      setDismissedPhysicalCode(null);
    }
    onChange([...selectedAreas, area]);
  };

  const handleRemove = (area: PostalAreaDto) => {
    if (disabled) return;
    if (area.postalCode === physicalPostalCode?.trim()) {
      setDismissedPhysicalCode(area.postalCode);
    }
    onChange(selectedAreas.filter((a) => a.id !== area.id));
  };

  const trimmedPhysical = physicalPostalCode?.trim() ?? '';
  const showPhysicalRemovedWarning =
    /^[0-9]{5}$/.test(trimmedPhysical) &&
    dismissedPhysicalCode === trimmedPhysical &&
    !selectedAreas.some((a) => a.postalCode === trimmedPhysical);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Non-blocking warning if physical postal code was removed */}
      {showPhysicalRemovedWarning && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#92400e',
            fontSize: '0.8125rem',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} aria-hidden="true" />
          <div>
            <strong>Physical postal code ({trimmedPhysical}) removed from coverage.</strong>{' '}
            This is allowed for hub-only branches, but pickup or drop-off orders for{' '}
            <code className="org-inline-code">{trimmedPhysical}</code> will not route to this branch.
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="org-form-grid org-form-grid--3">
        <div className="org-form-field">
          <label htmlFor="postal-area-search" className="org-form-label">
            <span>Search Postal Areas</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                pointerEvents: 'none',
              }}
            />
            <input
              id="postal-area-search"
              type="text"
              className="org-form-input"
              style={{ paddingLeft: '2.2rem' }}
              placeholder="Code (e.g. 00100) or area name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="org-form-field">
          <label htmlFor="postal-filter-province" className="org-form-label">
            <span>Filter by Province</span>
          </label>
          <select
            id="postal-filter-province"
            className="org-form-input"
            value={filterProvinceId ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              setFilterProvinceId(val);
              setFilterDistrictId(null);
            }}
            disabled={disabled}
          >
            <option value="">All Provinces</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="org-form-field">
          <label htmlFor="postal-filter-district" className="org-form-label">
            <span>Filter by District</span>
          </label>
          <select
            id="postal-filter-district"
            className="org-form-input"
            value={filterDistrictId ?? ''}
            onChange={(e) =>
              setFilterDistrictId(e.target.value ? Number(e.target.value) : null)
            }
            disabled={disabled || filterProvinceId === null}
          >
            <option value="">
              {filterProvinceId === null ? 'Select province first...' : 'All Districts'}
            </option>
            {filterDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Available Postal Areas Results */}
      <div
        style={{
          border: '1px solid var(--org-border)',
          borderRadius: '8px',
          maxHeight: '220px',
          overflowY: 'auto',
          background: '#fff',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              fontSize: '0.8125rem',
              color: '#64748b',
            }}
          >
            <Loader2 size={15} className="org-icon--spinning" aria-hidden="true" />
            <span>Searching Postal Areas...</span>
          </div>
        ) : loadError ? (
          <p className="org-form-error" style={{ padding: '0.85rem 1rem', margin: 0 }}>
            {loadError}
          </p>
        ) : results.length === 0 ? (
          <div style={{ padding: '0.85rem 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
            No active Postal Areas match your search criteria.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {results.map((area) => {
              const isSelected = selectedIds.has(area.id);
              return (
                <li
                  key={area.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.55rem 0.9rem',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <code className="org-inline-code">{area.postalCode}</code>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{area.areaName}</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {area.districtName}, {area.provinceName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`org-btn ${isSelected ? 'org-btn--secondary' : 'org-btn--primary'}`}
                    style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => handleAdd(area)}
                    disabled={disabled || isSelected}
                  >
                    {isSelected ? (
                      <>
                        <Check size={13} aria-hidden="true" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} aria-hidden="true" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Selected Postal Areas List */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          <span className="org-form-label" style={{ margin: 0 }}>
            <MapPinned size={14} aria-hidden="true" style={{ marginRight: '0.35rem' }} />
            <span>Selected Postal Areas ({selectedAreas.length})</span>
            <span className="org-form-required" aria-hidden="true">*</span>
          </span>
        </div>

        {selectedAreas.length === 0 ? (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: `1px dashed ${error ? '#fca5a5' : 'var(--org-border)'}`,
              background: error ? '#fef2f2' : '#f8fafc',
              fontSize: '0.8125rem',
              color: error ? '#991b1b' : '#64748b',
            }}
          >
            No Postal Areas selected yet. Add at least one Postal Area above for this active branch.
          </div>
        ) : (
          <div className="org-table-wrap" style={{ border: '1px solid var(--org-border)', borderRadius: '8px' }}>
            <table className="org-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Postal Code</th>
                  <th>Area Name</th>
                  <th>District</th>
                  <th>Province</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedAreas.map((area) => (
                  <tr key={area.id}>
                    <td>
                      <code className="org-inline-code">{area.postalCode}</code>
                    </td>
                    <td style={{ fontWeight: 500 }}>{area.areaName}</td>
                    <td>{area.districtName}</td>
                    <td>{area.provinceName}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="org-btn org-btn--secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', color: '#dc2626' }}
                        onClick={() => handleRemove(area)}
                        disabled={disabled}
                        aria-label={`Remove ${area.postalCode} ${area.areaName}`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <p className="org-form-error" role="alert" style={{ marginTop: '0.4rem' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
