/** Actions the courier can run on a job. They match the backend CourierLifecycle (ACCEPT, PICKUP, DELIVER, FAIL). */
export type CourierActionName = 'ACCEPT' | 'PICKUP' | 'DELIVER' | 'FAIL';

/**
 * True when the courier may run the action on this job. The backend sends the permitted actions in
 * `allowedActions`; when it sends none (older response) the rule is derived from the status so the UI still works.
 */
export function canDo(
  job: { status: string; allowedActions?: string[]; taskType?: string },
  action: CourierActionName
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
