import { dispatchApi, type DeliveryJobDto } from '@/api/services/dispatch.api';
import type {
  DeliveryHistoryRecord,
  DeliveryHistoryStatus,
  DeliveryHistorySummaryMetrics,
  ProofOfDeliveryType,
} from './types';

function mapHistoryStatus(status?: string): DeliveryHistoryStatus {
  switch (status) {
    case 'DELIVERED':
      return 'DELIVERED';
    case 'RETURN_TO_SENDER':
    case 'RETURNED_TO_SENDER':
      return 'RETURNED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'FAILED':
    case 'PENDING_DISPATCHER_DECISION':
    default:
      return 'FAILED';
  }
}

function normalizePodType(type?: string): ProofOfDeliveryType {
  if (type === 'SIGNATURE' || type === 'PHOTO' || type === 'OTP') return type;
  return 'NONE';
}

function normalizePriority(priority?: string): 'HIGH' | 'NORMAL' | 'URGENT' {
  if (priority === 'URGENT' || priority === 'EXPRESS') return 'URGENT';
  if (priority === 'HIGH') return 'HIGH';
  return 'NORMAL';
}

export function mapJobToHistoryRecord(job: DeliveryJobDto): DeliveryHistoryRecord {
  const status = mapHistoryStatus(job.status);
  const attempts = job.attempts || [];
  const attemptCount = Number(job.attemptCount ?? attempts.length ?? (status === 'DELIVERED' ? 1 : 0));
  const latestAttempt = attempts[attempts.length - 1];
  const pod = job.proofOfDelivery;
  const podType = normalizePodType(pod?.type);
  const podRef =
    pod?.reference ||
    pod?.otpReference ||
    pod?.signatureReference ||
    pod?.photoEvidenceReference ||
    '';
  const photoUrl =
    podType === 'PHOTO' &&
    (podRef.startsWith('http://') ||
      podRef.startsWith('https://') ||
      podRef.startsWith('data:image/'))
      ? podRef
      : undefined;

  const recipientName = job.recipient?.name || job.recipientName || 'Recipient';
  const recipientPhone = job.recipient?.phone || job.recipientPhone || '—';
  const deliveryAddress = job.recipient?.address || job.dropoffAddress || '—';
  const city = job.recipient?.city || job.dropoffCity || '—';

  const completedAt =
    job.completedAt ||
    job.deliveredAt ||
    latestAttempt?.attemptedAt ||
    job.updatedAt ||
    job.createdAt ||
    new Date().toISOString();

  const timeline = [
    ...(job.createdAt
      ? [
          {
            id: `tl-created-${job.id}`,
            stage: 'Job Created',
            timestamp: job.createdAt,
            description: `Dispatch delivery job ${job.jobCode || job.orderId} initialized.`,
            performedBy: job.branchName || 'Dispatch System',
          },
        ]
      : []),
    ...(job.assignedAt
      ? [
          {
            id: `tl-assigned-${job.id}`,
            stage: 'Courier Assigned',
            timestamp: job.assignedAt,
            description: `Assigned to courier ${job.courierName || job.courierCode || '—'}.`,
            performedBy: 'Dispatcher',
          },
        ]
      : []),
    ...(job.pickedUpAt
      ? [
          {
            id: `tl-pickedup-${job.id}`,
            stage: 'Out For Delivery',
            timestamp: job.pickedUpAt,
            description: 'Courier picked up parcel from branch and departed.',
            performedBy: job.courierName || 'Courier',
          },
        ]
      : []),
    ...attempts.map((a, idx) => ({
      id: `tl-att-${job.id}-${idx}`,
      stage: `Attempt #${a.attemptNumber} (${a.status || 'RECORDED'})`,
      timestamp: a.attemptedAt || a.createdAt || completedAt,
      description: [a.reason || a.failureReason, a.notes].filter(Boolean).join(' — ') || 'Attempt recorded',
      performedBy: a.courierName || job.courierName || 'Courier',
    })),
    ...(status === 'DELIVERED'
      ? [
          {
            id: `tl-delivered-${job.id}`,
            stage: 'Delivered (POD Verified)',
            timestamp: completedAt,
            description: `Received by ${pod?.receivedBy || recipientName} via ${podType}.`,
            performedBy: job.courierName || 'Courier',
          },
        ]
      : []),
  ];

  return {
    id: `HIST-${job.id}`,
    orderId: String(job.orderId ?? job.id),
    trackingNumber: job.trackingNumber || '—',
    recipient: {
      name: recipientName,
      phone: recipientPhone,
      address: deliveryAddress,
      city,
    },
    merchant: {
      name: job.merchantName || job.senderName || 'Customer / Merchant',
      phone: job.senderPhone,
    },
    courier: {
      id: String(job.courierId || job.courierCode || '—'),
      name: job.courierName || 'Unassigned',
      code: job.courierCode || '—',
      vehiclePlate: '—',
      phone: job.courierPhone || '—',
    },
    status,
    pod:
      pod && status === 'DELIVERED'
        ? {
            recipientName: pod.receivedBy || recipientName,
            confirmationDetails:
              pod.notes || `Verified via ${podType} handover confirmation`,
            podReference: podRef || `POD-${job.trackingNumber}`,
            photoUrl,
            podType,
          }
        : undefined,
    failureDetails:
      status !== 'DELIVERED' && (job.failure || latestAttempt)
        ? {
            reason:
              job.failure?.reason ||
              latestAttempt?.reason ||
              latestAttempt?.failureReason ||
              String(job.status).replace(/_/g, ' '),
            attemptTimestamp:
              job.failure?.reportedAt || latestAttempt?.attemptedAt || completedAt,
            courierNotes: job.failure?.notes || latestAttempt?.notes || '—',
            attemptsCount: Math.max(attemptCount, 1),
          }
        : undefined,
    completedAt,
    deliveryAttempts: attemptCount,
    deliveryNotes: job.parcel?.notes || job.parcelInfo?.notes,
    parcel: {
      category: job.parcelInfo?.category || job.parcel?.description || 'Standard Parcel',
      weight: `${Number(job.parcel?.weightKg ?? job.parcelInfo?.weightKg ?? 0)} kg`,
    },
    priority: normalizePriority(job.priority),
    timeline,
  };
}

export function calculateHistoryMetrics(
  records: DeliveryHistoryRecord[]
): DeliveryHistorySummaryMetrics {
  const totalDeliveries = records.length;
  const successfullyDelivered = records.filter((r) => r.status === 'DELIVERED').length;
  const failedDeliveries = records.filter((r) => r.status !== 'DELIVERED').length;
  const totalDeliveryAttempts = records.reduce(
    (sum, r) => sum + (r.deliveryAttempts || 0),
    0
  );

  return {
    totalDeliveries,
    successfullyDelivered,
    failedDeliveries,
    totalDeliveryAttempts,
  };
}

const ARCHIVE_STATUSES = new Set([
  'DELIVERED',
  'FAILED',
  'PENDING_DISPATCHER_DECISION',
  'RETURN_TO_SENDER',
  'RETURNED_TO_SENDER',
  'CANCELLED',
]);

export async function getDeliveryHistory(): Promise<{
  deliveries: DeliveryHistoryRecord[];
  metrics: DeliveryHistorySummaryMetrics;
}> {
  const jobs = await dispatchApi.getDeliveryJobs();
  const archiveJobs = jobs.filter(
    (j) => ARCHIVE_STATUSES.has(String(j.status).toUpperCase()) || (j.attempts?.length ?? 0) > 0
  );
  const records = archiveJobs
    .map(mapJobToHistoryRecord)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  return {
    deliveries: records,
    metrics: calculateHistoryMetrics(records),
  };
}
