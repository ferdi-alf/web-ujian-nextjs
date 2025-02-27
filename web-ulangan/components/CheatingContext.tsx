import React, { createContext, useContext, useState, useEffect } from "react";
import { mutate } from "swr";

interface Item {
  ujianId: string;
  siswaDetailId: string;
  type: string;
  timestamp: number;
}

interface CheatingContextType {
  newCheatingEvent: Item | null;
  setNewCheatingEvent: (event: Item | null) => void;
  refreshChartData: () => void;
}

const CheatingContext = createContext<CheatingContextType>({
  newCheatingEvent: null,
  setNewCheatingEvent: () => {},
  refreshChartData: () => {},
});

export const useCheating = () => useContext(CheatingContext);

export const CheatingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [newCheatingEvent, setNewCheatingEvent] = useState<Item | null>(null);

  const refreshChartData = () => {
    mutate("cheatingStats");
  };

  // When a new cheating event is set, automatically refresh the chart data
  useEffect(() => {
    if (newCheatingEvent) {
      refreshChartData();
    }
  }, [newCheatingEvent]);

  return (
    <CheatingContext.Provider
      value={{
        newCheatingEvent,
        setNewCheatingEvent,
        refreshChartData,
      }}
    >
      {children}
    </CheatingContext.Provider>
  );
};
