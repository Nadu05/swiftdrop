import type { AdminCreateUserPayload } from '../../../types/admin.types.ts';
import type { BranchResponse } from '../../../types/organization.types.ts';

export type BranchAssignableRole = 'DISPATCHER' | 'COURIER' | 'BRANCH_STAFF';

export interface BranchAssignableRoleOption {
  value: BranchAssignableRole;
  label: string;
  desc: string;
}

export const BRANCH_STAFF_ASSIGNABLE_ROLES: BranchAssignableRoleOption[] = [
  {
    value: 'DISPATCHER',
    label: 'Dispatcher',
    desc: 'Reviews delivery requests, selects eligible couriers, and manages dispatch assignments.',
  },
  {
    value: 'COURIER',
    label: 'Courier',
    desc: 'Executes assigned pickup tasks, inter-branch linehaul, and last-mile deliveries.',
  },
  {
    value: 'BRANCH_STAFF',
    label: 'Branch Staff',
    desc: 'Handles branch counter drop-offs, parcel intake verification, and hub operations.',
  },
];

export const PASSWORD_POLICY_REGEX =
  /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;

export const PHONE_POLICY_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

export interface SelectableBranchOption {
  id: number;
  name: string;
  code: string;
  city?: string;
}

/**
 * Resolves the initial branch ID for a Global System Admin (`canManageAllBranches: true`)
 * from the authoritative `allBranches` list returned by Organization Service.
 *
 * Prevents 404 requests to `GET /api/v1/organization/branches/{id}` when the admin's
 * seeded `authorizedBranchId` (e.g. Branch #1) no longer exists in Organization Service.
 */
export function resolveInitialInspectedBranchId(params: {
  inspectedBranchId: number | null;
  authorizedBranchId: number | null;
  allBranches: BranchResponse[];
}): number | null {
  const { inspectedBranchId, authorizedBranchId, allBranches } = params;

  if (
    inspectedBranchId !== null &&
    allBranches.some((b) => Number(b.id) === Number(inspectedBranchId))
  ) {
    return Number(inspectedBranchId);
  }

  if (
    authorizedBranchId !== null &&
    allBranches.some((b) => Number(b.id) === Number(authorizedBranchId))
  ) {
    return Number(authorizedBranchId);
  }

  const firstActive = allBranches.find((b) => b.status === 'ACTIVE');
  if (firstActive) {
    return Number(firstActive.id);
  }

  return allBranches[0]?.id ? Number(allBranches[0].id) : null;
}

export function resolveSelectableBranchesForStaffRegistration(params: {
  canManageAllBranches: boolean;
  effectiveBranchId: number | null;
  branch: BranchResponse | null;
  allBranches: BranchResponse[];
}): SelectableBranchOption[] {
  const { canManageAllBranches, effectiveBranchId, branch, allBranches } = params;

  if (!canManageAllBranches) {
    if (branch) {
      return [
        {
          id: Number(branch.id),
          name: branch.name,
          code: branch.code,
          city: branch.city,
        },
      ];
    }
    const matched = allBranches.find(
      (b) => Number(b.id) === Number(effectiveBranchId)
    );
    if (matched) {
      return [
        {
          id: Number(matched.id),
          name: matched.name,
          code: matched.code,
          city: matched.city,
        },
      ];
    }
    if (effectiveBranchId) {
      return [
        {
          id: Number(effectiveBranchId),
          name: `Branch #${effectiveBranchId}`,
          code: `BR-${effectiveBranchId}`,
        },
      ];
    }
    return [];
  }

  const activeBranches = allBranches.filter(
    (b) => !b.status || b.status === 'ACTIVE'
  );
  const map = new Map<number, SelectableBranchOption>();
  for (const b of activeBranches) {
    map.set(Number(b.id), {
      id: Number(b.id),
      name: b.name,
      code: b.code,
      city: b.city,
    });
  }
  if (branch && !map.has(Number(branch.id))) {
    map.set(Number(branch.id), {
      id: Number(branch.id),
      name: branch.name,
      code: branch.code,
      city: branch.city,
    });
  }
  return Array.from(map.values());
}

export interface CreateBranchStaffFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: BranchAssignableRole;
  branchId: number | null;
}

export function buildCreateBranchStaffPayload(
  form: CreateBranchStaffFormState,
  scope: {
    canManageAllBranches: boolean;
    effectiveBranchId: number | null;
  }
): AdminCreateUserPayload {
  const resolvedBranchId =
    form.branchId !== null && Number.isFinite(Number(form.branchId)) && Number(form.branchId) > 0
      ? Number(form.branchId)
      : null;

  if (!resolvedBranchId) {
    throw new Error('Please select an assigned branch for the branch staff member.');
  }

  if (
    !scope.canManageAllBranches &&
    scope.effectiveBranchId !== null &&
    Number(resolvedBranchId) !== Number(scope.effectiveBranchId)
  ) {
    throw new Error('Branch Managers can only register branch staff for their assigned branch.');
  }

  const fullName = form.fullName.trim();
  if (fullName.length < 2 || fullName.length > 150) {
    throw new Error('Full name must be between 2 and 150 characters.');
  }

  const email = form.email.trim();
  if (!email) {
    throw new Error('Email address is required.');
  }

  const phone = form.phone.trim();
  if (phone && !PHONE_POLICY_REGEX.test(phone)) {
    throw new Error(
      "Phone number must be between 7 and 20 digits and can include '+', spaces, or dashes."
    );
  }

  if (!PASSWORD_POLICY_REGEX.test(form.password)) {
    throw new Error(
      'Password must be at least 8 characters and contain at least one uppercase letter, one digit, and one special character (e.g. Staff@123).'
    );
  }

  return {
    fullName,
    email,
    phone: phone || undefined,
    password: form.password,
    roles: [form.role],
    branchId: resolvedBranchId,
  };
}

/**
 * Extracts a descriptive human-readable validation or domain error message from
 * Identity Service (`GlobalExceptionHandler`) responses (`fieldErrors` or `message`).
 */
export function extractAdminApiErrorMessage(
  err: unknown,
  fallback = 'Unable to complete the requested staff operation.'
): string {
  if (err && typeof err === 'object') {
    const maybeAxios = err as {
      message?: string;
      response?: {
        status?: number;
        data?: {
          message?: string;
          error?: string;
          fieldErrors?: Record<string, string>;
        };
      };
    };

    const data = maybeAxios.response?.data;
    if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
      const messages = Object.values(data.fieldErrors).filter(Boolean);
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    if (typeof data?.message === 'string' && data.message.trim().length > 0) {
      return data.message.trim();
    }

    if (
      typeof maybeAxios.message === 'string' &&
      maybeAxios.message.trim().length > 0 &&
      !maybeAxios.message.startsWith('Request failed with status code')
    ) {
      return maybeAxios.message.trim();
    }
  }

  if (err instanceof Error && !err.message.startsWith('Request failed with status code')) {
    return err.message;
  }

  return fallback;
}
