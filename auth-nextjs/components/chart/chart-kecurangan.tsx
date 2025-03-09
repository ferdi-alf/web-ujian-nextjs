/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { cn } from "@/lib/utils"; // Untuk menggabungkan className Tailwind

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
} from "@/components/ui/chart";

const chartConfig = {
  desktop: {
    label: "Total Kecurangan",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function ChartKecurangan({
  className,
  data,
  xKey,
  title,
  footerTextTrading,
  footerText,
}: {
  className?: string;
  data: { [key: string]: any }[];
  xKey: string;
  title: string;
  footerTextTrading: string;
  footerText: string;
}) {
  return (
    <Card className={cn("w-full h-full flex flex-col", className)}>
      <CardHeader>
        <CardTitle>Bar Chart</CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="h-full flex flex-col flex-1 min-h-0">
        <ChartContainer config={chartConfig} className="h-full flex-1 min-h-0">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={true} />
            <XAxis
              dataKey={xKey} // Gunakan mataPelajaran atau kelas
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              interval="preserveStartEnd"
              textAnchor="end"
            />
            <ChartTooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;

                return (
                  <div className="p-2 bg-white shadow-md rounded-lg border">
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <div
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="font-medium">{entry.name}:</span>
                        <span>{entry.value}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />

            <Bar
              dataKey="totalKecurangan"
              fill="var(--color-desktop)"
              radius={8}
            />
          </BarChart>
        </ChartContainer>
        <CardFooter className="flex flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            {footerTextTrading} <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">{footerText}</div>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
