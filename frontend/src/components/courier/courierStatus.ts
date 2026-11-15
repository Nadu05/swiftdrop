/**
 * Single source of truth for how statuses look in the courier portal
 * (Global UI/UX Design System doc, section 8: one centralized status configuration).
 *
 * Tones map to semantic colours: success = green, warning = amber, error = red,
 * info = blue, neutral = grey, brand = SwiftDrop navy. Unknown values fall back
 * to a neutral badge with a readable label, so new backend statuses never break the UI.
 */
export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';

export interface StatusStyle {
  label: string;
  tone: StatusTone;
}

/** Courier job lifecycle (pickup tasks and delivery jobs). */
export const JOB_STATUS: Record<string, StatusStyle> = {
  ASSIGNED: { label: 'Awaiting acceptance', tone: 'warning' },
  ACCEPTED: { label: 'Accepted', tone: 'info' },
  PICKED_UP: { label: 'Picked up', tone: 'info' },
  IN_TRANSIT: { label: 'In transit', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  FAILED: { label: 'Failed attempt', tone: 'error' },
  RETURN_TO_SENDER: { label: 'Return to sender', tone: 'warning' },
  RETURNED_TO_SENDER: { label: 'Returned to sender', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const TASK_TYPE: Record<'PICKUP' | 'DELIVERY', StatusStyle> = {
  PICKUP: { label: 'Pickup task', tone: 'brand' },
  DELIVERY: { label: 'Delivery', tone: 'info' },
};

export const PRIORITY: Record<string, StatusStyle> = {
  URGENT: { label: 'Urgent', tone: 'error' },
  HIGH: { label: 'High priority', tone: 'warning' },
  NORMAL: { label: 'Normal', tone: 'neutral' },
};

export const AVAILABILITY: Record<string, StatusStyle> = {
  AVAILABLE: { label: 'Online', tone: 'success' },
  BUSY: { label: 'On a route', tone: 'warning' },
  ON_BREAK: { label: 'On break', tone: 'info' },
  OFFLINE: { label: 'Offline', tone: 'neutral' },
};

/** Inter-branch transfer manifests (dispatch-service TransferManifestStatus). */
export const MANIFEST_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: 'Being prepared', tone: 'neutral' },
  ASSIGNED: { label: 'Ready to depart', tone: 'warning' },
  IN_TRANSIT: { label: 'In transit', tone: 'info' },
  RECEIVED: { label: 'Received', tone: 'success' },
  RECEIVED_WITH_DISCREPANCY: { label: 'Received with issues', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export function resolveStatus(map: Record<string, StatusStyle>, value: string | undefined | null): StatusStyle {
  if (!value) return { label: 'Unknown', tone: 'neutral' };
  const known = map[value.toUpperCase()];
  if (known) return known;
  const label = value.replace(/_/g, ' ').toLowerCase();
  return { label: label.charAt(0).toUpperCase() + label.slice(1), tone: 'neutral' };
}

/** Delivery-attempt rule: three attempts, then the job goes to dispatcher exception review. */
export const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * True when the courier may run the action on this job. The backend sends the permitted actions;
 * when it sends none (older response) the rule is derived from the status so the UI still works.
 */
export function canDo(
  job: { status: string; allowedActions?: string[]; taskType?: string },
  action: 'ACCEPT' | 'PICKUP' | 'DELIVER' | 'FAIL'
): boolean {
  if (job.allowedActions && job.allowedActions.length > 0) return job.allowedActions.includes(action);
  switch (action) {
    case 'ACCEPT':
      return job.status === 'ASSIGNED';
    case 'PICKUP':
      return job.status === 'ACCEPTED';
    default:
      return job.status === 'IN_TRANSIT' && job.taskType !== 'PICKUP';
  }
}
