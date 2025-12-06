import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'usag_access_token';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      // Avoid infinite loops if already on login
      if (currentPath !== '/login') {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem('usag_role');
        localStorage.removeItem('usag_user');
        window.location.href = '/login?reason=terminated';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

