import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';

// Get base URL from environment variables, fallback to local proxy
const API_URL = import.meta.env.VITE_API_URL || '/api/users';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      rememberMe: false,

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => {
        set({ user });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setRememberMe: (rememberMe) => {
        set({ rememberMe });
      },

      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_URL}/login`, { email, password });
          const { access_token, refresh_token } = response.data;
          
          set({
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            rememberMe,
          });

          // Fetch current user details immediately after login
          await get().fetchCurrentUser();
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.detail || 'Invalid email or password';
          return { success: false, error: errorMessage };
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_URL}/register`, {
            username,
            email,
            password,
          });
          set({ isLoading: false });
          return { success: true, message: response.data.message };
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.detail || 'Registration failed';
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        const { accessToken, refreshToken } = get();
        set({ isLoading: true });

        try {
          if (accessToken) {
            // Send refresh_token in body so backend can revoke it from the DB
            await axios.post(
              `${API_URL}/logout`,
              { refresh_token: refreshToken || null },
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
          }
        } catch (e) {
          // Ignore backend errors — always clear client state
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      fetchCurrentUser: async () => {
        const token = get().accessToken;
        if (!token) return;

        try {
          const response = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ user: response.data });
        } catch (error) {
          // If fetching profile fails (e.g. expired session), logout
          get().logout();
        }
      },

      updateProfile: async ({ username, currentPassword, newPassword }) => {
        const token = get().accessToken;
        if (!token) return { success: false, error: 'Unauthorized' };

        set({ isLoading: true });
        try {
          const response = await axios.put(
            `${API_URL}/update`,
            { username, current_password: currentPassword, new_password: newPassword },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          set((state) => ({
            user: {
              ...state.user,
              username: response.data.username,
              email: response.data.email,
            },
            isLoading: false,
          }));

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.detail || 'Failed to update profile';
          return { success: false, error: errorMessage };
        }
      },

      uploadProfilePic: async (file) => {
        const token = get().accessToken;
        if (!token) return { success: false, error: 'Unauthorized' };

        set({ isLoading: true });
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await axios.post(
            `${API_URL}/upload-profile-pic`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            }
          );

          set((state) => ({
            user: {
              ...state.user,
              profile_pic: response.data.profile_pic,
            },
            isLoading: false,
          }));

          return { success: true, user: response.data };
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.detail || 'Failed to upload image';
          return { success: false, error: errorMessage };
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_URL}/forgot-password`, { email });
          set({ isLoading: false });
          return { success: true, message: response.data.message };
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.detail || 'Failed to request reset link';
          return { success: false, error: errorMessage };
        }
      },

      resetPassword: async (token, newPassword) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_URL}/reset-password`, {
            token,
            new_password: newPassword,
          });
          set({ isLoading: false });
          return { success: true, message: response.data.message };
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.detail || 'Failed to reset password';
          return { success: false, error: errorMessage };
        }
      },
    }),
    {
      name: 'saas-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Session control helper to handle 'Remember Me = false' across browser restarts
export const initializeAuthSession = () => {
  const isSessionActive = sessionStorage.getItem('saas_session_active');
  
  if (!isSessionActive) {
    // Brand new browser session
    const store = useAuthStore.getState();
    if (!store.rememberMe) {
      // Remember me was false, so clear tokens/profile on browser restart
      useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    }
    sessionStorage.setItem('saas_session_active', 'true');
  }
};
