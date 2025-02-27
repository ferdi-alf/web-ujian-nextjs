"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import useSWR from "swr";

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

// Type for chart data
interface ChartDataItem {
  kelas: string;
  count: number;
}

// Function to fetch cheating stats from API
const fetchCheatingStats = async () => {
  try {
    const response = await fetch("/api/kecurangan/");
    if (!response.ok) {
      throw new Error("Failed to fetch cheating stats");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching cheating stats:", error);
    throw error;
  }
};

const chartConfig = {
  count: {
    label: "Jumlah Kecurangan",
    color: "hsl(var(--chart-blue-500))",
  },
} satisfies ChartConfig;

export function ChartDashboard() {
  // Use SWR to fetch and update chart data
  const {
    data: chartData,
    error,
    isLoading,
  } = useSWR("cheatingStats", fetchCheatingStats);

  // Use the newCheatingEvent from context just to track when new events occur
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { newCheatingEvent } = useCheating();

  // Prepare data for the chart
  const preparedChartData = chartData
    ? chartData.map((item: ChartDataItem) => ({
        kelas: item.kelas,
        count: item.count,
      }))
    : [];

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
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            Loading data...
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-red-500">
            Error loading data
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
              <Bar dataKey="count" fill="var(--color-count)" radius={8}>
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
          Data realtime pemantauan <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Menampilkan data total Kecurangan pada setiap kelas
        </div>
      </CardFooter>
    </Card>
  );
}
