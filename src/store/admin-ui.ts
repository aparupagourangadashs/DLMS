import { create } from "zustand";

type AdminUiState = {
  mobileNavOpen: boolean;
  commandOpen: boolean;
  /** List page key ("section/page") whose create form should open after navigation. */
  pendingCreate: string | null;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setPendingCreate: (key: string | null) => void;
};

export const useAdminUi = create<AdminUiState>()((set) => ({
  mobileNavOpen: false,
  commandOpen: false,
  pendingCreate: null,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setPendingCreate: (pendingCreate) => set({ pendingCreate }),
}));
