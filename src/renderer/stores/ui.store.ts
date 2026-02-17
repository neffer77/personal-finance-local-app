import { create } from 'zustand'

interface UiState {
  summaryBarVisible: boolean
  sidePanelOpen: boolean
  selectedTransactionId: number | null
  importModalOpen: boolean
  shortcutsOverlayOpen: boolean

  setSummaryBarVisible: (visible: boolean) => void
  openSidePanel: (transactionId: number) => void
  closeSidePanel: () => void
  openImportModal: () => void
  closeImportModal: () => void
  toggleShortcutsOverlay: () => void
}

export const useUiStore = create<UiState>((set) => ({
  summaryBarVisible: true,
  sidePanelOpen: false,
  selectedTransactionId: null,
  importModalOpen: false,
  shortcutsOverlayOpen: false,

  setSummaryBarVisible: (visible) => set({ summaryBarVisible: visible }),
  openSidePanel: (transactionId) => set({ sidePanelOpen: true, selectedTransactionId: transactionId }),
  closeSidePanel: () => set({ sidePanelOpen: false, selectedTransactionId: null }),
  openImportModal: () => set({ importModalOpen: true }),
  closeImportModal: () => set({ importModalOpen: false }),
  toggleShortcutsOverlay: () => set((state) => ({ shortcutsOverlayOpen: !state.shortcutsOverlayOpen })),
}))
