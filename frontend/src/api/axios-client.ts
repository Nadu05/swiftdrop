import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? 'http://localhost:8080';

/**
 * Shared Axios instance for all API Gateway requests.
 * - withCredentials: true — ensures HttpOnly auth cookies are sent on every request
 * - No Authorization header — auth is cookie-based only
 */
const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Response interceptor: surface meaningful error messages to callers
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Pass the structured API error through
      return Promise.reject(error);
    }
    if (error.request) {
      // No response — network or CORS issue
      return Promise.reject(new Error('Unable to reach the server. Please check your connection.'));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

