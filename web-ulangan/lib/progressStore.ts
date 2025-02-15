import { create } from "zustand";

interface ProgressStore {
  progress: number;
  setProgress: (progress: number) => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  progress: 0,
  setProgress: (progress) => set({ progress }),
  resetProgress: () => set({ progress: 0 }),
}));
