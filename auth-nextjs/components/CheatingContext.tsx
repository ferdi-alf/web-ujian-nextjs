"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { mutate } from "swr";

interface Item {
  ujianId: string;
  siswaDetailId: string;
  type: string;
  timestamp: number;
}

interface SiswaDetail {
  id: string;
  name: string;
  nis: string;
  profileImage?: string;
  kelas: {
    tingkat: string;
    jurusan: string;
  };
}

interface ChartDataItem {
  tingkat: string;
  jurusan: string;
  count: number;
}

interface CheatingContextType {
  newCheatingEvent: Item | null;
  setNewCheatingEvent: (event: Item | null) => void;
  refreshChartData: () => void;
  cheatingStats: ChartDataItem[];
  updateCheatingStats: (siswaDetail: SiswaDetail) => void;
  isLoadingStats: boolean;
}

const CheatingContext = createContext<CheatingContextType>({
  newCheatingEvent: null,
  setNewCheatingEvent: () => {},
  refreshChartData: () => {},
  cheatingStats: [],
  updateCheatingStats: () => {},
  isLoadingStats: false,
});

export const useCheating = () => useContext(CheatingContext);

export const CheatingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [newCheatingEvent, setNewCheatingEvent] = useState<Item | null>(null);
  const [cheatingStats, setCheatingStats] = useState<ChartDataItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Fetch initial cheating stats from the API
  const fetchInitialStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch("/api/kecurangan/");
      if (!response.ok) {
        throw new Error("Failed to fetch cheating stats");
      }
      const data = await response.json();
      setCheatingStats(data);
    } catch (error) {
      console.error("Error fetching cheating stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchInitialStats();
  }, [fetchInitialStats]);

  // Function to refresh chart data (used for manual refresh)
  const refreshChartData = useCallback(() => {
    mutate("cheatingStats");
    fetchInitialStats();
  }, [fetchInitialStats]);

  // Function to update cheating stats based on new event
  const updateCheatingStats = useCallback((siswaDetail: SiswaDetail) => {
    if (!siswaDetail || !siswaDetail.kelas) return;

    const { tingkat, jurusan } = siswaDetail.kelas;

    setCheatingStats((prevStats) => {
      // Find if the class already exists in stats
      const existingIndex = prevStats.findIndex(
        (item) => item.tingkat === tingkat && item.jurusan === jurusan
      );

      if (existingIndex >= 0) {
        // If class exists, increment count
        const updatedStats = [...prevStats];
        updatedStats[existingIndex] = {
          ...updatedStats[existingIndex],
          count: updatedStats[existingIndex].count + 1,
        };
        return updatedStats;
      } else {
        // If class doesn't exist, add new entry
        return [...prevStats, { tingkat, jurusan, count: 1 }];
      }
    });
  }, []);

  // When a new cheating event is set, we don't automatically refresh
  // as we'll handle updates incrementally instead
  useEffect(() => {
    if (newCheatingEvent) {
      // We'll fetch the student details in the component that uses this context
      // and then call updateCheatingStats with the student details
      // This keeps the context focused on state management
    }
  }, [newCheatingEvent]);

  return (
    <CheatingContext.Provider
      value={{
        newCheatingEvent,
        setNewCheatingEvent,
        refreshChartData,
        cheatingStats,
        updateCheatingStats,
        isLoadingStats,
      }}
    >
      {children}
    </CheatingContext.Provider>
  );
};
