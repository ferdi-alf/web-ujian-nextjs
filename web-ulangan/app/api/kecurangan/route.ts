/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stats = await prisma.kecurangan.findMany({
      include: {
        siswaDetail: {
          include: {
            kelas: true,
          },
        },
        ujian: true,
      },
    });

    const validData = stats.filter((item) => item.siswaDetail !== null);

    const groupedData = validData.reduce(
      (
        acc: {
          [key: string]: {
            tingkat: string;
            jurusan: string;
            count: number;
            types: { [key: string]: number };
            details: any[];
          };
        },
        curr: {
          siswaDetail: {
            kelas: {
              tingkat: string;
              jurusan: string | null;
            };
            name: string;
          } | null;
          type: string;
          id: string;
          ujianId: string;
          siswaDetailId: string | null;
        }
      ) => {
        const tingkat = curr.siswaDetail?.kelas.tingkat || "UNKNOWN";
        const jurusan = curr.siswaDetail?.kelas.jurusan || "UNKNOWN";
        const key = `${tingkat}-${jurusan}`;

        if (!acc[key]) {
          acc[key] = {
            tingkat,
            jurusan,
            count: 0,
            types: {},
            details: [],
          };
        }

        acc[key].count++;

        const type = curr.type;
        if (!acc[key].types[type]) {
          acc[key].types[type] = 0;
        }
        acc[key].types[type]++;

        // Tambahkan detail untuk analisis lebih lanjut jika diperlukan
        acc[key].details.push({
          id: curr.id,
          type: curr.type,
          ujianId: curr.ujianId,
          siswaId: curr.siswaDetailId,
          siswaName: curr.siswaDetail?.name,
        });

        return acc;
      },
      {} as Record<string, any>
    );

    const result = Object.values(groupedData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching cheating stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch cheating stats" },
      { status: 500 }
    );
  }
}
