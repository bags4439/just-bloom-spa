import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface UiState {
  toasts: Toast[];
  isSidebarCollapsed: boolean;
  dashboardRefreshKey: number;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;
  triggerDashboardRefresh: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isSidebarCollapsed: false,
  dashboardRefreshKey: 0,
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  triggerDashboardRefresh: () =>
    set((state) => ({ dashboardRefreshKey: state.dashboardRefreshKey + 1 })),
}));
