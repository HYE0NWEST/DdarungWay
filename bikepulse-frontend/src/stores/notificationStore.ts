import { create } from 'zustand';
import { apiClient } from '../services/api/client';

export interface Notification {
  _id: string;
  type: 'SNIPING' | 'TRIP' | 'PAYMENT' | 'MARKETING' | 'SYSTEM';
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  sniping: boolean;
  trip: boolean;
  marketing: boolean;
  dnd: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

interface NotificationState {
  notifications: Notification[];
  settings: NotificationSettings | null;
  unreadCount: number;
  isLoading: boolean;
  
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  settings: null,
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/notifications');
      const notifications = response.data.data;
      const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      const notifications = get().notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      set({ notifications, unreadCount });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.post('/notifications/read-all');
      const notifications = get().notifications.map((n) => ({ ...n, isRead: true }));
      set({ notifications, unreadCount: 0 });
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  },

  fetchSettings: async () => {
    try {
      const response = await apiClient.get('/notifications/settings');
      set({ settings: response.data.data });
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  },

  updateSettings: async (newSettings) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    const updatedSettings = { ...currentSettings, ...newSettings };
    try {
      await apiClient.put('/notifications/settings', { notificationSettings: updatedSettings });
      set({ settings: updatedSettings });
    } catch (error) {
      console.error('Failed to update settings', error);
    }
  },

  addNotification: (notification) => {
    const notifications = [notification, ...get().notifications].slice(0, 50);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadCount });
  }
}));
