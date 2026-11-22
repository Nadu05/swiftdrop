import test from 'node:test';
import assert from 'node:assert/strict';
import {
  havePostalAreaIdsChanged,
  mapBranchPostalAreasToDtos,
  submitBranchEditWithPostalAreas,
  validateBranchPostalAreasForMode,
} from './branch-postal-coverage';
import type {
  BranchPostalAreaResponse,
  BranchResponse,
  BranchUpdateRequest,
} from '../../../types/organization.types';

test('mapBranchPostalAreasToDtos maps postalAreaId to PostalAreaDto.id instead of junction id', () => {
  const assigned: BranchPostalAreaResponse[] = [
    {
      id: 901,
      postalAreaId: 42,
      postalCode: '00100',
      areaName: 'Colombo 01 - Fort',
      provinceId: 1,
      provinceName: 'Western',
      districtId: 10,
      districtName: 'Colombo',
      dsDivisionId: 100,
      dsDivisionName: 'Colombo',
      latitude: 6.9344,
      longitude: 79.8428,
      isActive: true,
      assignedAt: '2026-11-18T10:00:00',
      assignedBy: 'admin@swiftdrop.lk',
    },
  ];

  const mapped = mapBranchPostalAreasToDtos(assigned);

  assert.equal(mapped.length, 1);
  assert.deepEqual(mapped[0], {
    id: 42,
    postalCode: '00100',
    areaName: 'Colombo 01 - Fort',
    provinceId: 1,
    provinceName: 'Western',
    districtId: 10,
    districtName: 'Colombo',
    dsDivisionId: 100,
    dsDivisionName: 'Colombo',
    latitude: 6.9344,
    longitude: 79.8428,
    isActive: true,
  });
});

test('validateBranchPostalAreasForMode requires at least one area in create or ACTIVE edit, but allows empty in INACTIVE edit', () => {
  assert.equal(
    validateBranchPostalAreasForMode('create', undefined, []),
    'Select at least one Postal Area for this active branch.'
  );
  assert.equal(
    validateBranchPostalAreasForMode('edit', 'ACTIVE', []),
    'An ACTIVE branch must have at least one assigned Postal Area.'
  );
  assert.equal(validateBranchPostalAreasForMode('edit', 'ACTIVE', [42]), null);
  assert.equal(validateBranchPostalAreasForMode('edit', 'INACTIVE', []), null);
});

test('havePostalAreaIdsChanged detects added or removed IDs independent of order', () => {
  assert.equal(havePostalAreaIdsChanged([10, 20], [20, 10]), false);
  assert.equal(havePostalAreaIdsChanged([10, 20], [10, 20, 30]), true);
  assert.equal(havePostalAreaIdsChanged([10, 20], [10]), true);
  assert.equal(havePostalAreaIdsChanged([], []), false);
});

const mockBranch: BranchResponse = {
  id: 7,
  code: 'CMB-1',
  name: 'Colombo Central',
  addressLine1: '100 Galle Rd',
  addressLine2: null,
  city: 'Colombo',
  provinceId: 1,
  districtId: 10,
  postalCode: '00100',
  phone: '+94112345678',
  email: 'cmb@swiftdrop.lk',
  latitude: 6.9271,
  longitude: 79.8612,
  status: 'ACTIVE',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-18T00:00:00Z',
};

test('submitBranchEditWithPostalAreas skips PUT when postal areas are unchanged', async () => {
  const calls: string[] = [];
  const payload: BranchUpdateRequest = { name: 'Colombo Hub' };

  const result = await submitBranchEditWithPostalAreas({
    branchId: 7,
    updatePayload: payload,
    initialPostalAreaIds: [10, 20],
    nextPostalAreaIds: [20, 10],
    updateBranch: async (id, body) => {
      calls.push(`PATCH:${id}:${body.name}`);
      return { ...mockBranch, name: body.name ?? mockBranch.name };
    },
    updateBranchPostalAreas: async () => {
      calls.push('PUT');
      return [];
    },
  });

  assert.deepEqual(calls, ['PATCH:7:Colombo Hub']);
  assert.equal(result.name, 'Colombo Hub');
});

test('submitBranchEditWithPostalAreas calls PUT before PATCH when postal areas change, and aborts PATCH on PUT conflict', async () => {
  const calls: string[] = [];
  const payload: BranchUpdateRequest = { name: 'Colombo Hub' };

  await assert.rejects(
    () =>
      submitBranchEditWithPostalAreas({
        branchId: 7,
        updatePayload: payload,
        initialPostalAreaIds: [10],
        nextPostalAreaIds: [10, 99],
        updateBranch: async () => {
          calls.push('PATCH');
          return mockBranch;
        },
        updateBranchPostalAreas: async (id, areaIds) => {
          calls.push(`PUT:${id}:${areaIds.join(',')}`);
          throw new Error('Postal area 99 is already assigned to another branch.');
        },
      }),
    /already assigned to another branch/
  );

  assert.deepEqual(calls, ['PUT:7:10,99']);
});
