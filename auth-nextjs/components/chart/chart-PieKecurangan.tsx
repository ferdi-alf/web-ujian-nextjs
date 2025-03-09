"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart } from "recharts";

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
import { cn } from "@/lib/utils";

interface ChartPieKecuranganProps {
  className?: string;
  chartData: { mataPelajaran: string; totalKecurangan: number }[];
}

// Warna dinamis berdasarkan --chart-1 sampai --chart-5
const colors = [
  "hsl(221.2, 83.2%, 53.3%)",
  "hsl(212, 95%, 68%)",
  "hsl(216, 92%, 60%)",
  "hsl(210, 98%, 78%)",
  "hsl(212, 97%, 87%)",
  "hsl(200, 90%, 50%)",
  "hsl(190, 85%, 45%)",
  "hsl(180, 80%, 55%)",
  "hsl(170, 75%, 50%)",
  "hsl(160, 70%, 60%)",
  "hsl(150, 65%, 50%)",
  "hsl(140, 60%, 45%)",
  "hsl(130, 55%, 55%)",
  "hsl(120, 50%, 50%)",
  "hsl(110, 45%, 45%)",
  "hsl(100, 40%, 55%)",
  "hsl(90, 35%, 50%)",
  "hsl(80, 30%, 45%)",
  "hsl(70, 25%, 55%)",
  "hsl(60, 20%, 50%)",
];

export function ChartPieKecurangan({
  className,
  chartData,
}: ChartPieKecuranganProps) {
  // Format data agar setiap entry memiliki warna yang sesuai
  const formattedData = chartData.map((item, index) => ({
    ...item,
    fill: colors[index % colors.length], // Ambil langsung dari array warna
  }));

  const chartConfig = formattedData.reduce((acc, item, index) => {
    acc[item.mataPelajaran] = {
      label: item.mataPelajaran,
      color: colors[index % colors.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card
      className={cn("flex flex-col h-full max-h-[400px] w-[480px]", className)}
    >
      <CardHeader className="items-center pb-0">
        <CardTitle>Pie Chart - Kecurangan Permapel</CardTitle>
        <CardDescription>kecurangan Permapel</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[380px] px-0"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="mataPelajaran" />}
            />
            <Pie
              data={formattedData}
              dataKey="totalKecurangan"
              labelLine={false}
              label={({ payload, ...props }) => (
                <text
                  cx={props.cx}
                  cy={props.cy}
                  x={props.x}
                  y={props.y}
                  textAnchor={props.textAnchor}
                  dominantBaseline={props.dominantBaseline}
                  fill="hsla(var(--foreground))"
                >
                  {payload.totalKecurangan}
                </text>
              )}
              nameKey="mataPelajaran"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Pie Chart Pemantauan Kecurangan Permapel{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Menampilkan total kecurangan dari setiap Mapel ujian yang di kerjakan
        </div>
      </CardFooter>
    </Card>
  );
}
