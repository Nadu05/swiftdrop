'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Loader2, MapPin, Search, X } from 'lucide-react';
import { usePostalAreas } from '@/hooks/api/use-organization';
import type { PostalAreaDto } from '@/types/organization.types';

export interface PostalAreaComboboxProps {
  id: string;
  label: string;
  value: string;
  selectedArea: PostalAreaDto | null;
  onSelect: (area: PostalAreaDto | null) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Searchable Sri Lankan Postal Area / postal code selector backed by
 * Organization Service (`GET /api/v1/organization/locations/postal-areas`).
 */
export default function PostalAreaCombobox({
  id,
  label,
  value,
  selectedArea,
  onSelect,
  placeholder = 'Search by postal code (e.g. 00300) or area name (e.g. Colombo 03)',
  error,
  disabled = false,
}: PostalAreaComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const {
    data: postalAreas = [],
    isFetching,
    error: fetchError,
  } = usePostalAreas(debouncedQuery, isOpen || (Boolean(value) && !selectedArea));

  // If form has a postal code (e.g. from preset or profile) without a resolved selectedArea,
  // hydrate selectedArea automatically when lookup results arrive.
  useEffect(() => {
    if (value && !selectedArea && postalAreas.length > 0) {
      const exact = postalAreas.find((a) => a.postalCode === value);
      if (exact) {
        onSelect(exact);
      }
    }
  }, [value, selectedArea, postalAreas, onSelect]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [postalAreas.length, isOpen]);

  const displayValue = isOpen
    ? query
    : selectedArea
      ? `${selectedArea.postalCode} — ${selectedArea.areaName} (${selectedArea.districtName})`
      : value
        ? value
        : '';

  const handleSelectArea = (area: PostalAreaDto) => {
    onSelect(area);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      return;
    }

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen || postalAreas.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % postalAreas.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + postalAreas.length) % postalAreas.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = postalAreas[highlightedIndex];
      if (target) {
        handleSelectArea(target);
      }
    }
  };

  return (
    <div className="sd-field-group" ref={containerRef} style={{ position: 'relative' }}>
      <label htmlFor={id} className="sd-field-label">
        {label}
      </label>

      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && postalAreas[highlightedIndex]
              ? `${listboxId}-option-${postalAreas[highlightedIndex].id}`
              : undefined
          }
          aria-invalid={Boolean(error)}
          placeholder={placeholder}
          disabled={disabled}
          value={displayValue}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className={`sd-text-input ${error ? 'has-error' : ''}`}
          style={{ paddingRight: '4.25rem' }}
        />

        <div
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#64748b',
          }}
        >
          {isFetching ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <>
              {(value || selectedArea) && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label={`Clear ${label}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '0.15rem',
                    display: 'inline-flex',
                  }}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                aria-label={`Toggle ${label} list`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: '0.15rem',
                  display: 'inline-flex',
                }}
              >
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {isOpen && !disabled && (
          <div
            id={listboxId}
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: '240px',
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
              zIndex: 50,
              padding: '0.3rem',
            }}
          >
            {fetchError ? (
              <div
                role="alert"
                style={{
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.8rem',
                  color: '#dc2626',
                }}
              >
                {fetchError instanceof Error
                  ? fetchError.message
                  : 'Unable to load Postal Areas from Organization Service.'}
              </div>
            ) : isFetching && postalAreas.length === 0 ? (
              <div
                style={{
                  padding: '0.75rem',
                  fontSize: '0.82rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                <span>Searching Sri Lankan Postal Areas...</span>
              </div>
            ) : postalAreas.length === 0 ? (
              <div
                style={{
                  padding: '0.75rem',
                  fontSize: '0.82rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <Search size={14} aria-hidden="true" />
                <span>No matching Postal Area found. Try a 5-digit postal code or city name.</span>
              </div>
            ) : (
              postalAreas.map((area, index) => {
                const isSelected = area.postalCode === value;
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={area.id}
                    id={`${listboxId}-option-${area.id}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectArea(area)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.55rem 0.7rem',
                      borderRadius: '7px',
                      border: 'none',
                      cursor: 'pointer',
                      background: isSelected
                        ? '#e0ecfe'
                        : isHighlighted
                          ? '#f1f5f9'
                          : 'transparent',
                      color: isSelected ? '#1d4ed8' : '#0f172a',
                      fontSize: '0.84rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <MapPin size={13} color={isSelected ? '#1d4ed8' : '#64748b'} aria-hidden="true" />
                      <strong style={{ fontFamily: 'monospace', fontSize: '0.84rem' }}>
                        {area.postalCode}
                      </strong>
                      <span>{area.areaName}</span>
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {area.districtName} · {area.provinceName}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedArea && !error && (
        <div style={{ fontSize: '0.74rem', color: '#475569' }}>
          Selected Postal Area: <strong>{selectedArea.postalCode}</strong> · {selectedArea.areaName},{' '}
          {selectedArea.districtName} District ({selectedArea.provinceName} Province)
        </div>
      )}

      {error && (
        <div role="alert" className="sd-error-hint">
          {error}
        </div>
      )}
    </div>
  );
}
