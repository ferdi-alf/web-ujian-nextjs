/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("authjs.session-token");

  if (!sessionToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const hasil = await prisma.kecurangan.findMany({
      include: {
        siswaDetail: {
          include: {
            kelas: true,
          },
        },
        ujian: {
          include: {
            mataPelajaran: true,
          },
        },
      },
    });

    const chartData: Record<string, { "chart-1": any[]; "chart-2": any[] }> =
      {};

    hasil.forEach((data) => {
      const tingkat = data.ujian.mataPelajaran.tingkat;
      const mataPelajaran = data.ujian.mataPelajaran.pelajaran;
      const kelas = `${data.siswaDetail?.kelas.tingkat}-${data.siswaDetail?.kelas.jurusan}`;

      if (!chartData[`chartData${tingkat}`]) {
        chartData[`chartData${tingkat}`] = { "chart-1": [], "chart-2": [] };
      }

      const chart1Index = chartData[`chartData${tingkat}`]["chart-1"].findIndex(
        (item) => item.mataPelajaran === mataPelajaran
      );
      if (chart1Index > -1) {
        chartData[`chartData${tingkat}`]["chart-1"][
          chart1Index
        ].totalKecurangan += 1;
      } else {
        chartData[`chartData${tingkat}`]["chart-1"].push({
          mataPelajaran,
          totalKecurangan: 1,
        });
      }

      const chart2Index = chartData[`chartData${tingkat}`]["chart-2"].findIndex(
        (item) => item.kelas === kelas
      );
      if (chart2Index > -1) {
        chartData[`chartData${tingkat}`]["chart-2"][
          chart2Index
        ].totalKecurangan += 1;
      } else {
        chartData[`chartData${tingkat}`]["chart-2"].push({
          kelas,
          totalKecurangan: 1,
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        status: 200,
        data: chartData,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: true, message: "Terjadi kesalahan di server", status: 500 },
      { status: 500 }
    );
  }
}
