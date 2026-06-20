import axios from 'axios';

// Resolve the API URL dynamically based on environment or window location
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isLocal ? '/api/users' : 'https://authentication-system-4w2o.onrender.com/api/users';
};

const API_URL = getApiUrl();

const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to resolve static profile pic paths to the correct host (local proxy vs Render production URL)
export const getProfilePicUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal) return path; // local dev proxies '/static'
  
  return `https://authentication-system-4w2o.onrender.com${path}`;
};

// Request Interceptor: Inject Access Token
authApi.interceptors.request.use(
  async (config) => {
    const { useAuthStore } = await import('../store/authStore');
    const store = useAuthStore.getState();
    const token = store.accessToken;
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Token Refresh on 401
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { useAuthStore } = await import('../store/authStore');
        const store = useAuthStore.getState();
        const refresh_token = store.refreshToken;
        
        if (!refresh_token) {
          store.logout();
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}/refresh`, {
          refresh_token: refresh_token
        });
        
        if (response.status === 200) {
          const { access_token, refresh_token: new_refresh_token } = response.data;
          
          store.setTokens(access_token, new_refresh_token);
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return authApi(originalRequest);
        }
      } catch (refreshError) {
        const { useAuthStore } = await import('../store/authStore');
        const store = useAuthStore.getState();
        store.logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default authApi;
export { API_URL };
