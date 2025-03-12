"use client";
import useSWR from "swr";
import { ChartPieKecurangan } from "./chart/chart-PieKecurangan";
import ChartKecurangan from "./chart/chart-kecurangan";
import ChartLoading from "./skeleton/chart-loading";

const fetchData = async () => {
  try {
    const response = await fetch("/api/chart-analytic", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fecth data");
  }
};

const AnalyticsComponents = () => {
  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR("/api/chart-analytic", fetchData);
  console.log("data:", rawData);

  if (isLoading)
    return (
      <div>
        <ChartLoading />
      </div>
    );
  if (error) return <div>Error loading data</div>;
  return (
    <div className="">
      {rawData.data.chartDataX ? (
        <ChartUi
          title="Analytic tingkat X"
          chartData={rawData.data.chartDataX}
        />
      ) : (
        ""
      )}

      {rawData.data.chartDataXI ? (
        <ChartUi
          title="Analytic tingkat XI"
          chartData={rawData.data.chartDataXI}
        />
      ) : (
        ""
      )}
      {rawData.data.chartDataXII ? (
        <ChartUi
          title="Analytic tingkat XII"
          chartData={rawData.data.chartDataXII}
        />
      ) : (
        ""
      )}
    </div>
  );
};

interface ChartData {
  title: string;
  chartData: {
    "chart-1": [];
    "chart-2": [];
  };
}

function ChartUi({ title, chartData }: ChartData) {
  return (
    <div className="p-2 rounded-lg ">
      {/* Header Judul */}
      <div
        className="w-72 p-2 pl-4 border-t  bg-slate-100 font-medium relative rounded-tr-3xl rounded-tl-lg"
        style={{
          clipPath: "polygon(0% 0%, 85% 0%, 100% 40%, 100% 100%, 0% 100%)",
        }}
      >
        <h3>{title}</h3>
      </div>

      {/* Wrapper Grid dengan overflow-x-auto */}
      <div className="overflow-x-auto p-3 rounded-tr-lg rounded-b-lg bg-slate-100">
        <div className="grid grid-cols-2 gap-4 min-w-[800px]">
          {/* Wrapper untuk Chart Kecurangan */}
          <div className="flex flex-col gap-2 h-full">
            <ChartKecurangan
              className="h-[280px] w-full min-w-[300px]"
              data={chartData["chart-1"]}
              xKey="mataPelajaran"
              title="kecurangan Permapel"
              footerTextTrading="Bar Chart Pemantauan Kecurangan Permapel"
              footerText="Menampilkan total kecurangan dari setiap Mapel ujian yang di kerjakan"
            />
            {/* Chart 2 - Kecurangan per Kelas */}
            <ChartKecurangan
              className="h-[280px] w-full min-w-[300px]"
              data={chartData["chart-2"]}
              xKey="kelas"
              title="Kecurangan Perkelas"
              footerTextTrading="Bar Chart Pemantauan Kecurangan Perkelas"
              footerText="Menampilkan total kecurangan dari Setiap Kelas"
            />
          </div>

          {/* Wrapper untuk Pie Chart */}
          <div className="flex h-full">
            <ChartPieKecurangan
              chartData={chartData["chart-1"]}
              className="h-full max-h-[565px] w-full min-w-[300px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsComponents;
