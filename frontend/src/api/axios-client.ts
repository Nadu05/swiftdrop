import axios from 'axios';

/**
 * Shared Axios HTTP Client for SwiftDrop Frontend
 * 
 * Configured according to agents/agent.frontend.md:
 * - Directs all traffic through the API Gateway (port 8080 by default)
 * - Reads base URL from NEXT_PUBLIC_API_BASE_URL
 * - Never connects browser code directly to database ports or internal services
 * - Attaches authentication token if present in browser storage
 */

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: automatically attaches JWT token when Member 01's login is active
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Check for auth token in localStorage or sessionStorage
      const token = localStorage.getItem('swiftdrop_auth_token') || sessionStorage.getItem('swiftdrop_auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: handles common HTTP errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // We pass through the error so domain services can map it to friendly messages
    return Promise.reject(error);
  }
);

