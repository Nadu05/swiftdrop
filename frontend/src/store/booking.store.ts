'use client';

import { create } from 'zustand';

interface BookingUiState {
  step: 1 | 2;
  recentTrackingSearches: string[];
  setStep: (step: 1 | 2) => void;
  addRecentTrackingSearch: (trackingNumber: string) => void;
  resetBookingUi: () => void;
}

/**
 * Client-side UI state for the customer booking wizard and tracking search history.
 * Server data (quotations, orders, tracking events) is managed exclusively by TanStack Query.
 */
export const useBookingStore = create<BookingUiState>((set) => ({
  step: 1,
  recentTrackingSearches: [],
  setStep: (step) => set({ step }),
  addRecentTrackingSearch: (trackingNumber) =>
    set((state) => {
      const normalized = trackingNumber.trim().toUpperCase();
      if (!normalized) return state;
      const filtered = state.recentTrackingSearches.filter((t) => t !== normalized);
      return {
        recentTrackingSearches: [normalized, ...filtered].slice(0, 5),
      };
    }),
  resetBookingUi: () => set({ step: 1 }),
}));

