import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRANCH_STAFF_ASSIGNABLE_ROLES,
  resolveSelectableBranchesForStaffRegistration,
  buildCreateBranchStaffPayload,
  resolveInitialInspectedBranchId,
  extractAdminApiErrorMessage,
} from './branch-staff-form';
import type { BranchResponse } from '../../../types/organization.types';

const colomboBranch: BranchResponse = {
  id: 5,
  name: 'colombo',
  code: 'CMB-4',
  addressLine1: 'NO 15/6, Poojapitiya',
  addressLine2: null,
  city: 'Colombo',
  postalCode: '00100',
  phone: '+94757833488',
  email: 'colombo@swiftdrop.lk',
  latitude: 6.9271,
  longitude: 79.8612,
  status: 'ACTIVE',
  createdAt: '2026-11-18T00:00:00Z',
  updatedAt: '2026-11-18T00:00:00Z',
};

const kandyBranch: BranchResponse = {
  id: 2,
  name: 'Kandy Main Hub',
  code: 'KDY-MAIN',
  addressLine1: 'Peradeniya Rd',
  addressLine2: null,
  city: 'Kandy',
  postalCode: '20000',
  phone: '+94812223344',
  email: 'kandy@swiftdrop.lk',
  latitude: 7.2906,
  longitude: 80.6337,
  status: 'ACTIVE',
  createdAt: '2026-11-18T00:00:00Z',
  updatedAt: '2026-11-18T00:00:00Z',
};

test('BRANCH_STAFF_ASSIGNABLE_ROLES exposes DISPATCHER, COURIER, and BRANCH_STAFF without BRANCH_MANAGER', () => {
  const roleValues = BRANCH_STAFF_ASSIGNABLE_ROLES.map((r) => r.value);
  assert.deepEqual(roleValues, ['DISPATCHER', 'COURIER', 'BRANCH_STAFF']);
});

test('resolveSelectableBranchesForStaffRegistration restricts Branch Manager to their assigned branch and allows Head Office Admin to select any active branch', () => {
  const branchManagerOptions = resolveSelectableBranchesForStaffRegistration({
    canManageAllBranches: false,
    effectiveBranchId: 5,
    branch: colomboBranch,
    allBranches: [colomboBranch, kandyBranch],
  });
  assert.equal(branchManagerOptions.length, 1);
  assert.equal(branchManagerOptions[0].id, 5);
  assert.equal(branchManagerOptions[0].code, 'CMB-4');

  const headOfficeOptions = resolveSelectableBranchesForStaffRegistration({
    canManageAllBranches: true,
    effectiveBranchId: 5,
    branch: colomboBranch,
    allBranches: [colomboBranch, kandyBranch],
  });
  assert.deepEqual(
    headOfficeOptions.map((b) => b.id),
    [5, 2]
  );
});

test('buildCreateBranchStaffPayload submits the selected branchId and rejects unauthorized or missing branch selection', () => {
  const payload = buildCreateBranchStaffPayload(
    {
      fullName: '  naduka ',
      email: ' naduka@gmail.com ',
      phone: ' +94757833488 ',
      password: 'Password123!',
      role: 'DISPATCHER',
      branchId: 2,
    },
    {
      canManageAllBranches: true,
      effectiveBranchId: 5,
    }
  );

  assert.deepEqual(payload, {
    fullName: 'naduka',
    email: 'naduka@gmail.com',
    phone: '+94757833488',
    password: 'Password123!',
    roles: ['DISPATCHER'],
    branchId: 2,
  });

  assert.throws(
    () =>
      buildCreateBranchStaffPayload(
        {
          fullName: 'naduka',
          email: 'naduka@gmail.com',
          phone: '',
          password: 'Password123!',
          role: 'DISPATCHER',
          branchId: 2,
        },
        {
          canManageAllBranches: false,
          effectiveBranchId: 5,
        }
      ),
    /only register branch staff for their assigned branch/i
  );
});

test('Repro 1 (GET /branches/1 404): resolveInitialInspectedBranchId ignores stale authorizedBranchId (1) when not present in allBranches ([5])', () => {
  const resolvedId = resolveInitialInspectedBranchId({
    inspectedBranchId: null,
    authorizedBranchId: 1,
    allBranches: [colomboBranch],
  });
  assert.equal(resolvedId, 5);
});

test('Repro 2 (POST /admin/users 400): buildCreateBranchStaffPayload validates password policy and extractAdminApiErrorMessage extracts backend fieldErrors', () => {
  assert.throws(
    () =>
      buildCreateBranchStaffPayload(
        {
          fullName: 'naduka',
          email: 'naduka@gmail.com',
          phone: '+94757833488',
          password: 'password123', // missing uppercase and special char -> triggers 400 in AdminCreateUserRequest
          role: 'DISPATCHER',
          branchId: 5,
        },
        {
          canManageAllBranches: true,
          effectiveBranchId: 5,
        }
      ),
    /uppercase.*digit.*special character/i
  );

  const axios400Error = Object.assign(new Error('Request failed with status code 400'), {
    response: {
      status: 400,
      data: {
        status: 400,
        error: 'Validation Failed',
        fieldErrors: {
          password:
            'Password must contain at least one uppercase letter, one digit, and one special character',
        },
      },
    },
  });

  assert.equal(
    extractAdminApiErrorMessage(axios400Error),
    'Password must contain at least one uppercase letter, one digit, and one special character'
  );
});

