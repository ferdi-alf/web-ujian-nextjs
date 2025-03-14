/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useCheating } from "../CheatingContext";

const chartConfig = {
  count: {
    label: "Jumlah Kecurangan:",
    color: "hsl(var(--chart-blue-500))",
  },
} satisfies ChartConfig;

export function ChartDashboard() {
  // Get data from the context instead of managing local state
  const { cheatingStats, isLoadingStats } = useCheating();
  const [error, setError] = useState<Error | null>(null);

  // Siapkan data untuk chart
  const preparedChartData = cheatingStats.map((item) => ({
    kelas: `${item.tingkat} ${item.jurusan}`,
    count: item.count,
  }));

  return (
    <Card
      className={`${
        preparedChartData.length === 0 ? "flex flex-col justify-between" : ""
      }`}
    >
      <CardHeader>
        <CardTitle>Bar Chart - Kecurangan Kelas</CardTitle>
        <CardDescription>Tingkat X - XII</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingStats ? (
          <div className="h-64 flex items-center justify-center">
            Loading data...
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-red-500">
            Error loading data: {error.message}
          </div>
        ) : preparedChartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            Belum ada data kecurangan
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="overflow-x-auto ">
            <BarChart
              accessibilityLayer
              data={preparedChartData}
              margin={{
                top: 26,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="kelas"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={8}>
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Data Pemantau Realtime <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Menampilkan Data Total Kecurangan Secara Realtime Pada Setiap Kelas
        </div>
      </CardFooter>
    </Card>
  );
}
