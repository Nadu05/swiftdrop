import { create } from 'zustand';
import type {
  BranchManagerSessionContext,
  BranchResponse,
} from '@/types/organization.types';

/**
 * Branch Console Client UI & Session Context Store (Zustand)
 * Member 04 — Branch Manager Dashboard & Branch Console Integration
 *
 * Follows agents/agent.frontend.md §6:
 * - Manages shared client-side UI state for the Branch Console (active assigned branch ID
 *   and deferred auth boundary flags) so navigating between Overview (/organization/console),
 *   Delivery Request Queue (/organization/console/requests), and Courier Roster
 *   (/organization/console/couriers) preserves the authorized branch context.
 * - Never duplicates TanStack Query API caches.
 * - Frontend state is a UX boundary only; the backend remains authoritative for
 *   enforcing branch-level permissions and data isolation.
 *
 * TODO (Auth Integration — Member 01 Identity Service):
 * Once authentication and authorization are merged, initialize `setBranchManagerSession`
 * from the authenticated user's verified session/claims rather than deferred defaults.
 */

export interface BranchConsoleState extends BranchManagerSessionContext {
  setAssignedBranchId: (branchId: number | null) => void;
  setBranchManagerSession: (
    session: Partial<BranchManagerSessionContext>
  ) => void;
  resetBranchManagerSession: () => void;
}

const INITIAL_BRANCH_CONSOLE_STATE: BranchManagerSessionContext = {
  assignedBranchId: null,
  managerDisplayName: null,
  managerEmail: null,
  // Least-privilege default: Branch Managers do not automatically receive Head Office permissions
  canAccessHeadOffice: false,
  canEditBranchConfig: false,
};

export const useBranchConsoleStore = create<BranchConsoleState>((set) => ({
  ...INITIAL_BRANCH_CONSOLE_STATE,
  setAssignedBranchId: (assignedBranchId) => set({ assignedBranchId }),
  setBranchManagerSession: (session) =>
    set((state) => ({
      ...state,
      ...session,
    })),
  resetBranchManagerSession: () => set({ ...INITIAL_BRANCH_CONSOLE_STATE }),
}));

export interface ResolveAuthorizedBranchInput {
  /**
   * Explicit assigned branch ID passed via component prop or authenticated context.
   * When `null`, explicitly indicates the user has no assigned branch.
   * When `undefined`, falls back to the store or authorized branch list.
   */
  explicitAssignedBranchId?: number | null;
  /**
   * Branch ID currently stored in `useBranchConsoleStore`.
   */
  storeAssignedBranchId: number | null;
  /**
   * Available branches returned by `GET /api/v1/organization/branches`.
   */
  availableBranches: BranchResponse[];
  /**
   * Raw `branchId` query parameter from the URL (if any).
   * Used ONLY to detect and block unauthorized URL-based branch switching on the
   * Branch Manager Dashboard — never used to override an assigned branch.
   */
  urlBranchIdParam?: string | null;
  /**
   * Whether the dashboard should fall back to the first active branch from `availableBranches`
   * when no explicit or store branch ID has been set yet (while auth integration is deferred).
   */
  allowAuthorizedListFallback?: boolean;
}

export interface ResolvedAuthorizedBranchResult {
  resolvedBranchId: number | null;
  resolvedBranch: BranchResponse | null;
  isUrlOverrideBlocked: boolean;
  blockedUrlBranchId: string | null;
}

/**
 * Resolves the Branch Manager's authorized branch while strictly preventing
 * URL query-parameter tampering (`?branchId=...`) from switching branches.
 *
 * Security / UX Boundary Rule (Prompt §5.A):
 * "The branch identity must come from the authenticated user's assigned branch context
 * or an existing authorized branch-selection mechanism.
 * Do not let the user access another branch merely by changing a URL or query parameter."
 */
export function resolveAuthorizedBranchContext({
  explicitAssignedBranchId,
  storeAssignedBranchId,
  availableBranches,
  urlBranchIdParam,
  allowAuthorizedListFallback = true,
}: ResolveAuthorizedBranchInput): ResolvedAuthorizedBranchResult {
  // 1. Determine the authoritative assigned branch ID (ignoring URL query parameters)
  let resolvedBranchId: number | null = null;

  if (explicitAssignedBranchId !== undefined) {
    resolvedBranchId = explicitAssignedBranchId;
  } else if (
    storeAssignedBranchId !== null &&
    Number.isInteger(storeAssignedBranchId) &&
    storeAssignedBranchId > 0
  ) {
    resolvedBranchId = storeAssignedBranchId;
  } else if (allowAuthorizedListFallback && availableBranches.length > 0) {
    const activeBranch =
      availableBranches.find((b) => b.status === 'ACTIVE') ??
      availableBranches[0];
    resolvedBranchId = activeBranch ? activeBranch.id : null;
  }

  const resolvedBranch =
    resolvedBranchId !== null
      ? availableBranches.find((b) => b.id === resolvedBranchId) ?? null
      : null;

  // 2. Detect if the URL contains a `branchId` query parameter attempting to access another branch
  const trimmedUrlParam = urlBranchIdParam?.trim() || null;
  let isUrlOverrideBlocked = false;
  let blockedUrlBranchId: string | null = null;

  if (trimmedUrlParam) {
    const parsedUrlId = Number(trimmedUrlParam);
    const isDifferentFromResolved =
      !Number.isInteger(parsedUrlId) ||
      parsedUrlId <= 0 ||
      resolvedBranchId === null ||
      parsedUrlId !== resolvedBranchId;

    if (isDifferentFromResolved) {
      isUrlOverrideBlocked = true;
      blockedUrlBranchId = trimmedUrlParam;
    }
  }

  return {
    resolvedBranchId,
    resolvedBranch,
    isUrlOverrideBlocked,
    blockedUrlBranchId,
  };
}

