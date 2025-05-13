// src/store/ui-store.ts
import { create } from 'zustand';

type UIState = {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  
  // Actions
  toggleSidebar: () => void;
  openModal: (modalName: string) => void;
  closeModal: () => void;
};

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  openModal: (modalName: string) => set({ activeModal: modalName }),
  closeModal: () => set({ activeModal: null })
}));