import { useQuery } from '@tanstack/react-query';
import { searchPostalAreas } from '@/api/services/organization.api';

export const organizationLocationKeys = {
  all: ['locations'] as const,
  postalAreas: (search: string) => [...organizationLocationKeys.all, 'postal-areas', search] as const,
};

/**
 * Query hook to search Sri Lankan Postal Areas from Organization Service.
 */
export function usePostalAreas(search: string, enabled = true) {
  const trimmed = search.trim();
  return useQuery({
    queryKey: organizationLocationKeys.postalAreas(trimmed),
    queryFn: () => searchPostalAreas(trimmed ? { search: trimmed } : undefined),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}
