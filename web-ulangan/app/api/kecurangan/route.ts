import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stats = await prisma.kecurangan.groupBy({
      by: ["siswaDetailId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    const formattedStats = await Promise.all(
      stats.map(async (stat) => {
        if (!stat.siswaDetailId) return null;

        const siswa = await prisma.siswaDetail.findUnique({
          where: { id: stat.siswaDetailId },
          include: { kelas: true },
        });

        return {
          kelas: `${siswa?.kelas.tingkat} ${siswa?.kelas.jurusan}`,
          count: stat._count.id,
        };
      })
    );

    const filteredStats = formattedStats.filter(Boolean);

    return NextResponse.json(filteredStats);
  } catch (error) {
    console.error("Error fetching cheating stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch cheating stats" },
      { status: 500 }
    );
  }
}
