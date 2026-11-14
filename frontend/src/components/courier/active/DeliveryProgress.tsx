import type { CourierJob } from '@/types/courier.types';

const STEPS = ['Accepted', 'Picked up', 'Delivered'];

/** Accepted -> Picked up -> Delivered, with the failed step marked in red. */
export default function DeliveryProgress({ job }: { job: CourierJob }) {
  const reached =
    job.status === 'DELIVERED' ? 3 : job.status === 'IN_TRANSIT' ? 2 : job.status === 'FAILED' ? (job.pickedUpAt ? 2 : 1) : 1;
  const failed = job.status === 'FAILED';

  return (
    <ol className="glass-card courier-steps" aria-label="Delivery progress">
      {STEPS.map((label, i) => {
        const done = i < reached;
        const isFailStep = failed && i === reached;
        const state = isFailStep ? ' courier-steps__item--failed' : done ? ' courier-steps__item--done' : '';
        return (
          <li key={label} className={`courier-steps__item${state}`} aria-current={!done && !isFailStep && i === reached ? 'step' : undefined}>
            <span className="courier-steps__dot" aria-hidden="true">
              {isFailStep ? '!' : done ? '✓' : i + 1}
            </span>
            <span>{isFailStep ? 'Failed' : label}</span>
            {i < STEPS.length - 1 && <span className="courier-steps__line" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
