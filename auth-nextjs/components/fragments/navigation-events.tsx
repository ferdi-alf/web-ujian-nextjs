"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LoadingSpinner } from "./loading-spinner";
import { create } from "zustand";

interface LoadingStore {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

export function NavigationEvents() {
  const pathname = usePathname();

  const { isLoading, setIsLoading } = useLoadingStore();

  useEffect(() => {
    // Mulai loading ketika pathname berubah
    setIsLoading(true);

    // Gunakan requestAnimationFrame untuk menunggu rendering selesai
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsLoading(false); // Stop loading setelah 500ms atau jika page sudah siap
      }, 500);
    });
  }, [pathname, setIsLoading]);

  return isLoading ? <LoadingSpinner /> : null;
}
