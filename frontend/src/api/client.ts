import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    
    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        console.debug('[Auth] Token userId:', decoded.userId);
      } catch (e) {
        console.warn('[Auth] Could not decode token');
      }
    }
  }
  return config;
});

// Normalize error responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ??
      (err.code === 'ECONNABORTED' ? 'Request timed out' : 'Network error');
    
    // Log auth errors for debugging
    if (err.response?.status === 401) {
      console.warn('[Auth] Unauthorized - clearing session');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
    
    return Promise.reject(new Error(message));
  }
);

export default api;