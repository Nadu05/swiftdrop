import { axiosClient } from '@/api/axios-client';
import { getApiErrorMessage } from '@/api/services/auth.api';

export interface NotificationItemDto {
  id: number;
  notificationCode: string;
  eventId: string;
  eventType: string;
  notificationType: string;
  channel: string;
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
  trackingNumber?: string | null;
  orderId?: string | null;
  applicationCode?: string | null;
  title: string;
  message: string;
  correlationId?: string | null;
  status: string;
  attemptCount: number;
  errorMessage?: string | null;
  readAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

function handleNotificationError(error: unknown, fallback: string): never {
  const message = getApiErrorMessage(error);
  throw new Error(message && message !== 'An unexpected error occurred' ? message : fallback);
}

/**
 * Authoritative API client for SwiftDrop Notification Service (`/api/v1/notifications/**`).
 * Routed through the API Gateway with HttpOnly cookie authentication and `X-Correlation-Id`.
 */
export const notificationsApi = {
  async listNotifications(params?: {
    trackingNumber?: string;
    status?: string;
  }): Promise<NotificationItemDto[]> {
    try {
      const { data } = await axiosClient.get<NotificationItemDto[]>('/api/v1/notifications', {
        params,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleNotificationError(error, 'Failed to load notifications.');
    }
  },

  async getMyNotifications(trackingNumber?: string): Promise<NotificationItemDto[]> {
    try {
      const { data } = await axiosClient.get<NotificationItemDto[]>('/api/v1/notifications/me', {
        params: trackingNumber ? { trackingNumber } : undefined,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleNotificationError(error, 'Failed to load your notifications.');
    }
  },

  async getPublicTrackingNotifications(trackingNumber: string): Promise<NotificationItemDto[]> {
    try {
      const { data } = await axiosClient.get<NotificationItemDto[]>(
        `/api/v1/notifications/tracking/${encodeURIComponent(trackingNumber)}`
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleNotificationError(error, 'Failed to load tracking notifications.');
    }
  },

  async markAsRead(idOrCode: string | number): Promise<NotificationItemDto> {
    try {
      const { data } = await axiosClient.patch<NotificationItemDto>(
        `/api/v1/notifications/${encodeURIComponent(String(idOrCode))}/read`
      );
      return data;
    } catch (error) {
      handleNotificationError(error, 'Failed to mark notification as read.');
    }
  },

  async retryFailedNotifications(): Promise<NotificationItemDto[]> {
    try {
      const { data } = await axiosClient.post<NotificationItemDto[]>(
        '/api/v1/notifications/retry-failed'
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleNotificationError(error, 'Failed to retry failed notifications.');
    }
  },
};
