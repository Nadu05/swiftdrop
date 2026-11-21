import type {
  BranchPostalAreaResponse,
  BranchResponse,
  BranchStatus,
  BranchUpdateRequest,
  PostalAreaDto,
} from '../../../types/organization.types.ts';

/**
 * Maps backend `BranchPostalAreaResponse` records (where `id` is the junction row ID
 * and `postalAreaId` is the canonical Postal Area ID) into `PostalAreaDto` items
 * expected by `PostalAreaPicker`.
 */
export function mapBranchPostalAreasToDtos(
  assigned: readonly BranchPostalAreaResponse[]
): PostalAreaDto[] {
  return assigned.map((item) => ({
    id: item.postalAreaId,
    postalCode: item.postalCode,
    areaName: item.areaName,
    provinceId: item.provinceId,
    provinceName: item.provinceName,
    districtId: item.districtId,
    districtName: item.districtName,
    dsDivisionId: item.dsDivisionId,
    dsDivisionName: item.dsDivisionName,
    latitude: item.latitude,
    longitude: item.longitude,
    isActive: item.isActive,
  }));
}

/**
 * Validates that a branch has at least one assigned Postal Area when required.
 * ACTIVE branches (and newly created branches) require >= 1 Postal Area; INACTIVE
 * branches may have 0 assigned Postal Areas while offline.
 */
export function validateBranchPostalAreasForMode(
  mode: 'create' | 'edit',
  branchStatus: BranchStatus | undefined,
  postalAreaIds: readonly number[]
): string | null {
  if (postalAreaIds.length > 0) {
    return null;
  }
  if (mode === 'create') {
    return 'Select at least one Postal Area for this active branch.';
  }
  if (branchStatus === 'ACTIVE') {
    return 'An ACTIVE branch must have at least one assigned Postal Area.';
  }
  return null;
}

/**
 * Returns true if the set of selected Postal Area IDs differs from the initial set.
 */
export function havePostalAreaIdsChanged(
  initialIds: readonly number[],
  currentIds: readonly number[]
): boolean {
  const initialSet = new Set(initialIds);
  const currentSet = new Set(currentIds);
  if (initialSet.size !== currentSet.size) {
    return true;
  }
  for (const id of currentSet) {
    if (!initialSet.has(id)) {
      return true;
    }
  }
  return false;
}

export interface SubmitBranchEditWithPostalAreasParams {
  branchId: number;
  updatePayload: BranchUpdateRequest;
  initialPostalAreaIds: readonly number[];
  nextPostalAreaIds: readonly number[];
  updateBranch: (id: number, payload: BranchUpdateRequest) => Promise<BranchResponse>;
  updateBranchPostalAreas: (
    id: number,
    postalAreaIds: number[]
  ) => Promise<BranchPostalAreaResponse[]>;
}

/**
 * Orchestrates saving branch edits and postal area coverage.
 * When postal area coverage changed, `PUT /branches/{id}/postal-areas` runs first so
 * cross-branch 409 conflicts or active-branch validation errors abort before mutating
 * branch details.
 */
export async function submitBranchEditWithPostalAreas({
  branchId,
  updatePayload,
  initialPostalAreaIds,
  nextPostalAreaIds,
  updateBranch,
  updateBranchPostalAreas,
}: SubmitBranchEditWithPostalAreasParams): Promise<BranchResponse> {
  if (havePostalAreaIdsChanged(initialPostalAreaIds, nextPostalAreaIds)) {
    await updateBranchPostalAreas(branchId, [...nextPostalAreaIds]);
  }
  return updateBranch(branchId, updatePayload);
}
