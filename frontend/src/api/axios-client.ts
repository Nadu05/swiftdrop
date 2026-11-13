import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';

/**
 * Shared Axios instance for all API Gateway requests.
 * - withCredentials: true — ensures HttpOnly auth cookies (sd_access_token, sd_refresh_token) are sent on every request
 * - Attaches Bearer token fallback if present in browser storage
 * - Automatically intercepts 401s and refreshes access token
 */
export const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: optionally attaches Bearer token if present
axiosClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('swiftdrop_auth_token') || sessionStorage.getItem('swiftdrop_auth_token');
      if (token && config.headers && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Refresh token coordination ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown | null) => {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor: handle token refresh on 401 & surface meaningful error messages
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only intercept 401s, skip if it's the refresh endpoint itself or already retried
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => axiosClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${BASE_URL}/api/v1/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );
        processQueue(null);
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/register') {
            window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response) {
      return Promise.reject(error);
    }
    if (error.request) {
      return Promise.reject(new Error('Unable to reach the server. Please check your connection.'));
    }
    return Promise.reject(error);
  }
);

// Backward-compatible export alias
export const apiClient = axiosClient;
export default axiosClient;
