import { create } from "zustand";

export const useUI = create((set) => ({
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
