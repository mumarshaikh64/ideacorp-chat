import { create } from 'zustand';
import api from '../services/api';
import { initStaffSocket, disconnectSocket, getSocket } from '../services/socket';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('ideacrop_user') || 'null'),
  token: localStorage.getItem('ideacrop_token') || null,
  isAuthenticated: Boolean(localStorage.getItem('ideacrop_token')),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, token } = res.data;

      localStorage.setItem('ideacrop_token', token);
      localStorage.setItem('ideacrop_user', JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      });

      // Initialize Socket.IO connection as staff
      initStaffSocket(token);

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please check credentials.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  updateStatus: async (newStatus) => {
    const { user } = get();
    if (!user) return;

    try {
      await api.put(`/users/${user.id}/status`, { status: newStatus });
      const updatedUser = { ...user, status: newStatus };
      localStorage.setItem('ideacrop_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });

      // Emit socket status toggle
      const socket = getSocket();
      if (socket) {
        socket.emit('agent:status_toggle', { status: newStatus });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }

    localStorage.removeItem('ideacrop_token');
    localStorage.removeItem('ideacrop_user');
    disconnectSocket();

    set({
      user: null,
      token: null,
      isAuthenticated: false
    });
  }
}));
