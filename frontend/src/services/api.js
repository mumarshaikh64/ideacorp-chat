import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ideacrop_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if checking public chat links
      const isPublicRoute = window.location.pathname.startsWith('/c/');
      if (!isPublicRoute && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('ideacrop_token');
        localStorage.removeItem('ideacrop_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
