import axios from 'axios';

// Base URL for the BFF (Next.js Route Handlers)
const baseURL = process.env.NEXT_PUBLIC_BFF_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for automatic token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest.url || '';

    // Do NOT retry or refresh for specific auth endpoints like refresh or login itself
    // to prevent infinite loops.
    const skipRefreshUrls = ['/v1/auth/refresh', '/v1/auth/login', '/v1/auth/register', '/v1/auth/verify-email'];
    const shouldSkipRefresh = skipRefreshUrls.some(url => requestUrl.includes(url));

    const isUnauthorized = error.response?.status === 401 || error.response?.status === 403;
    if (isUnauthorized && !shouldSkipRefresh) {
      if (!originalRequest._retry) {
        if (isRefreshing) {
          // If another request is already refreshing the token, queue this one
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          }).then(() => {
            originalRequest._retry = true;
            // Fix for Axios baseURL duplication bug on retries (queued requests):
            const retryConfig = { ...originalRequest };
            if (retryConfig.baseURL && retryConfig.url?.startsWith(retryConfig.baseURL)) {
              retryConfig.url = retryConfig.url.slice(retryConfig.baseURL.length);
            }
            return apiClient(retryConfig);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt to refresh the token via the BFF
          await apiClient.post('/v1/auth/refresh');
          
          processQueue(null);

          // If successful, retry the original request
          // Fix for Axios baseURL duplication bug on retries:
          const retryConfig = { ...originalRequest };
          if (retryConfig.baseURL && retryConfig.url?.startsWith(retryConfig.baseURL)) {
            retryConfig.url = retryConfig.url.slice(retryConfig.baseURL.length);
          }
          return apiClient(retryConfig);
        } catch (refreshError) {
          processQueue(refreshError);
          // If refresh fails, user session is expired
          // Don't redirect — the AuthContext will handle the state
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  }
);
