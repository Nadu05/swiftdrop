'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: number;
  label: string;
  sublabel?: string;
}

export interface SearchableSelectProps {
  id: string;
  label: string;
  placeholder: string;
  options: SearchableSelectOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  hint?: string;
}

export default function SearchableSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  emptyText = 'No matching options found',
  hint,
}: SearchableSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return options;
    }
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(trimmed) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(trimmed))
    );
  }, [options, query]);

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

  const handleSelect = (optionValue: number) => {
    onChange(optionValue);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  return (
    <div className="org-form-field" ref={containerRef} style={{ position: 'relative' }}>
      <label htmlFor={id} className="org-form-label">
        <span>{label}</span>
        <span className="org-form-optional">(Optional)</span>
      </label>

      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          className="org-form-input"
          style={{ paddingRight: '4.25rem' }}
          placeholder={loading ? 'Loading...' : placeholder}
          disabled={disabled || loading}
          value={isOpen ? query : selectedOption?.label ?? ''}
          onFocus={() => {
            if (!disabled && !loading) {
              setIsOpen(true);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              setQuery('');
            }
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: '0.65rem',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#94a3b8',
          }}
        >
          {loading ? (
            <Loader2 size={14} className="org-icon--spinning" aria-hidden="true" />
          ) : (
            <>
              {value !== null && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label={`Clear ${label}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.1rem',
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
                aria-label={`Toggle ${label} options`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: '0.1rem',
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
            id={`${id}-listbox`}
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: '220px',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
              zIndex: 50,
              padding: '0.25rem',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.82rem',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Search size={13} aria-hidden="true" />
                <span>{emptyText}</span>
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                      color: isSelected ? '#e0f2fe' : '#e2e8f0',
                      fontSize: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{option.label}</span>
                    {option.sublabel && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {option.sublabel}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {hint && <span className="org-form-hint">{hint}</span>}
    </div>
  );
}
