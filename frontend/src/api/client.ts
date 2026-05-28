import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ??
      (err.code === 'ECONNABORTED' ? 'Request timed out' : 'Network error');
    return Promise.reject(new Error(message));
  }
);

export default api;
