import { create } from "zustand";

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  txHash?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newNotif: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false,
    };

    set((state) => {
      const updated = [newNotif, ...state.notifications].slice(0, 50); // Keep max 50
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  removeNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },
}));