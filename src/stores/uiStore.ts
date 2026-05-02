import { create } from 'zustand';

import { DEFAULT_APP_CONFIG } from '@/config/app.config';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

export interface ReceiptConfig {
  spaName: string;
  tagline: string;
  address: string;
  phone: string;
}

interface UiState {
  toasts: Toast[];
  isSidebarCollapsed: boolean;
  dashboardRefreshKey: number;
  receiptConfig: ReceiptConfig;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;
  triggerDashboardRefresh: () => void;
  setReceiptConfig: (config: ReceiptConfig) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isSidebarCollapsed: false,
  dashboardRefreshKey: 0,
  receiptConfig: {
    spaName: DEFAULT_APP_CONFIG.receiptSpaName,
    tagline: DEFAULT_APP_CONFIG.receiptTagline,
    address: DEFAULT_APP_CONFIG.receiptAddress,
    phone: DEFAULT_APP_CONFIG.receiptPhone,
  },
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
  setReceiptConfig: (receiptConfig) => set({ receiptConfig }),
}));
