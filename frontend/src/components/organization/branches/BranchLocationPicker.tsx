'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import InteractiveBranchMap from '@/components/organization/map/InteractiveBranchMap';
import {
  reverseGeocodeLocation,
  searchLocations,
  SRI_LANKAN_LOCATION_GAZETTEER,
  type GeocodingSuggestion,
} from '@/lib/geocoding';
import { Input } from '@/components/ui/input';

export interface BranchLocationSelection {
  latitude: number;
  longitude: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  label?: string;
}

export interface BranchLocationPickerProps {
  latitude: number;
  longitude: number;
  branchName?: string;
  branchCode?: string;
  currentAddressLine1?: string;
  currentCity?: string;
  disabled?: boolean;
  latitudeError?: string;
  longitudeError?: string;
  onSelectLocation: (selection: BranchLocationSelection) => void;
}

const QUICK_SRI_LANKAN_HUBS = [
  { label: 'Colombo', query: 'Colombo 02' },
  { label: 'Kandy', query: 'Kandy' },
  { label: 'Galle', query: 'Galle' },
  { label: 'Negombo', query: 'Negombo' },
  { label: 'Kurunegala', query: 'Kurunegala' },
  { label: 'Nugegoda', query: 'Nugegoda' },
  { label: 'Jaffna', query: 'Jaffna' },
] as const;

/**
 * Interactive Branch Location Picker (Search + Draggable Map Marker + Reverse Geocoding)
 * Member 04 — Head Office Organization Admin UI (Section 3.3)
 */
export default function BranchLocationPicker({
  latitude,
  longitude,
  branchName,
  branchCode,
  currentAddressLine1,
  currentCity,
  disabled = false,
  latitudeError,
  longitudeError,
  onSelectLocation,
}: BranchLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>(
    SRI_LANKAN_LOCATION_GAZETTEER.slice(0, 6)
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [geocodeStatusMessage, setGeocodeStatusMessage] = useState<string | null>(
    null
  );
  const [geocodeWarning, setGeocodeWarning] = useState<string | null>(null);

  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced forward geocoding search
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchLocations(searchQuery, controller.signal);
        setSuggestions(result.suggestions);
        setGeocodeWarning(result.warning);
      } catch {
        // Ignore aborted searches
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSelectSuggestion = useCallback(
    (suggestion: GeocodingSuggestion) => {
      setSearchQuery(suggestion.shortTitle);
      setIsDropdownOpen(false);
      setGeocodeWarning(null);
      setGeocodeStatusMessage(
        `Selected "${suggestion.shortTitle}" — Map marker and address fields synchronized.`
      );

      onSelectLocation({
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        addressLine1: suggestion.addressLine1,
        addressLine2: suggestion.addressLine2,
        city: suggestion.city,
        district: suggestion.district,
        label: suggestion.displayName,
      });
    },
    [onSelectLocation]
  );

  const handleQuickCitySelect = useCallback(
    async (cityQuery: string) => {
      if (disabled) return;
      setSearchQuery(cityQuery);
      const { suggestions: matches } = await searchLocations(cityQuery);
      if (matches.length > 0) {
        handleSelectSuggestion(matches[0]);
      }
    },
    [disabled, handleSelectSuggestion]
  );

  // Map click or marker drag -> update coordinates immediately & reverse geocode address
  const handleMapLocationChange = useCallback(
    async (
      nextLat: number,
      nextLng: number,
      interactionType: 'click' | 'drag'
    ) => {
      if (disabled) return;

      // 1. Immediately synchronize coordinates
      onSelectLocation({
        latitude: nextLat,
        longitude: nextLng,
      });

      // 2. Reverse-geocode to keep address and city synchronized
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsReverseGeocoding(true);
      setGeocodeWarning(null);

      try {
        const reversed = await reverseGeocodeLocation(
          nextLat,
          nextLng,
          controller.signal
        );
        onSelectLocation({
          latitude: reversed.latitude,
          longitude: reversed.longitude,
          addressLine1: reversed.addressLine1,
          city: reversed.city,
          district: reversed.district,
          label: reversed.displayName,
        });
        setSearchQuery(reversed.displayName);
        setGeocodeStatusMessage(
          interactionType === 'drag'
            ? `Marker refined to ${reversed.latitude.toFixed(5)}, ${reversed.longitude.toFixed(5)} (${reversed.city}, ${reversed.district} District). Address updated via reverse geocoding.`
            : `Map location selected at ${reversed.latitude.toFixed(5)}, ${reversed.longitude.toFixed(5)} (${reversed.city}, ${reversed.district} District).`
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setGeocodeWarning(
          'Coordinates updated from map. Reverse-geocoding address lookup was unavailable; please verify the street address field below.'
        );
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [disabled, onSelectLocation]
  );

  return (
    <div className="org-location-picker" data-testid="branch-location-picker">
      {/* 1. Place / Address Search Input & Suggestions Dropdown */}
      <div className="org-location-picker__search-block" ref={searchWrapperRef}>
        <label
          htmlFor="branch-place-search"
          className="org-form-label flex items-center justify-between"
        >
          <span className="inline-flex items-center gap-1.5">
            <Navigation size={14} className="text-blue-600" aria-hidden="true" />
            <span>Search Place or Address on Map</span>
          </span>
          <span className="text-xs font-medium text-slate-500">
            Supports Sri Lankan cities, suburbs &amp; streets
          </span>
        </label>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="branch-place-search"
            type="text"
            value={searchQuery}
            disabled={disabled}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            placeholder="Search Sri Lankan address or city (e.g. Union Place Colombo, Kandy, Galle, Negombo, Kurunegala)..."
            aria-label="Search place or address to locate branch on map"
            aria-expanded={isDropdownOpen}
            aria-controls="branch-location-suggestions-list"
            className="h-10 pl-10 pr-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
          {isSearching ? (
            <Loader2
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
              aria-hidden="true"
            />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsDropdownOpen(true);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Clear location search"
            >
              <X size={15} />
            </button>
          ) : null}

          {/* Suggestions Dropdown */}
          {isDropdownOpen && !disabled && (
            <div
              id="branch-location-suggestions-list"
              role="listbox"
              aria-label="Location suggestions"
              className="org-location-picker__dropdown"
            >
              <div className="org-location-picker__dropdown-header">
                <span>
                  {searchQuery.trim()
                    ? `Matching locations (${suggestions.length})`
                    : 'Suggested Sri Lankan Delivery Hubs'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Click to center map &amp; fill address
                </span>
              </div>

              {suggestions.length === 0 ? (
                <div className="p-3.5 text-xs text-slate-500 text-center">
                  No matching locations found for &ldquo;{searchQuery}&rdquo;. Try a nearby Sri
                  Lankan city or click directly on the map below.
                </div>
              ) : (
                <ul className="org-location-picker__suggestions-list">
                  {suggestions.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="org-location-picker__suggestion-btn"
                        onClick={() => handleSelectSuggestion(item)}
                      >
                        <MapPin
                          size={15}
                          className="text-blue-600 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-xs font-bold text-slate-900 truncate">
                              {item.shortTitle}
                            </strong>
                            <span className="text-[11px] font-mono text-slate-500 shrink-0">
                              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 truncate mt-0.5">
                            {item.displayName}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Quick-select Sri Lankan city chips */}
        <div
          className="org-location-picker__quick-chips"
          aria-label="Quick select Sri Lankan cities"
        >
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <Sparkles size={11} className="text-blue-600" aria-hidden="true" />
            <span>Quick Jump:</span>
          </span>
          {QUICK_SRI_LANKAN_HUBS.map((hub) => (
            <button
              key={hub.label}
              type="button"
              disabled={disabled}
              onClick={() => handleQuickCitySelect(hub.query)}
              className="org-location-picker__chip"
            >
              {hub.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Map Canvas */}
      <InteractiveBranchMap
        latitude={latitude}
        longitude={longitude}
        branchLabel={branchName || currentAddressLine1 || currentCity || 'New Branch Location'}
        branchCode={branchCode}
        interactive={!disabled}
        onLocationChange={handleMapLocationChange}
        heightPx={360}
      />

      {/* 3. Geocoding / Reverse Geocoding Feedback Banner */}
      {(isReverseGeocoding || geocodeStatusMessage || geocodeWarning) && (
        <div
          className={`org-location-picker__status ${
            geocodeWarning ? 'org-location-picker__status--warning' : ''
          }`}
          role="status"
          aria-live="polite"
        >
          {isReverseGeocoding ? (
            <>
              <Loader2 size={14} className="animate-spin text-blue-600 shrink-0" />
              <span>Reverse geocoding selected marker coordinates...</span>
            </>
          ) : geocodeWarning ? (
            <>
              <Info size={14} className="text-amber-600 shrink-0" />
              <span>{geocodeWarning}</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>{geocodeStatusMessage}</span>
            </>
          )}
        </div>
      )}

      {/* 4. Read-Only Technical Coordinates Display (Generated from Map Selection) */}
      <div
        className="org-location-picker__coords-bar"
        aria-label="Selected branch geographic coordinates"
      >
        <div className="org-location-picker__coords-header">
          <div className="inline-flex items-center gap-1.5">
            <Compass size={14} className="text-blue-600" aria-hidden="true" />
            <span className="text-xs font-bold text-slate-800">
              Selected Map Coordinates (Read-Only Technical Output)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Synchronized automatically from address search or map pin
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="org-location-picker__coord-field">
            <label
              htmlFor="branch-latitude"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
            >
              Latitude (°N)
            </label>
            <input
              id="branch-latitude"
              type="number"
              step="any"
              readOnly
              value={Number.isFinite(latitude) ? latitude : ''}
              aria-readonly="true"
              aria-invalid={Boolean(latitudeError)}
              className="org-location-picker__coord-input"
              data-testid="branch-latitude-readonly"
            />
            {latitudeError && (
              <p className="org-form-error" role="alert">
                {latitudeError}
              </p>
            )}
          </div>

          <div className="org-location-picker__coord-field">
            <label
              htmlFor="branch-longitude"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
            >
              Longitude (°E)
            </label>
            <input
              id="branch-longitude"
              type="number"
              step="any"
              readOnly
              value={Number.isFinite(longitude) ? longitude : ''}
              aria-readonly="true"
              aria-invalid={Boolean(longitudeError)}
              className="org-location-picker__coord-input"
              data-testid="branch-longitude-readonly"
            />
            {longitudeError && (
              <p className="org-form-error" role="alert">
                {longitudeError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

