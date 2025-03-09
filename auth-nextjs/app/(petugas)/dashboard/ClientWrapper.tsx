// Buat file baru: ClientWrapper.tsx
"use client";

import { CheatingProvider } from "@/components/CheatingContext";
import { ChartDashboard } from "@/components/chart/chart-dashoard";
import { CardPemantau } from "@/components/card/card-pemantau";

export const ClientWrapper = () => {
  return (
    <CheatingProvider>
      <ChartDashboard />
      <CardPemantau />
    </CheatingProvider>
  );
};
