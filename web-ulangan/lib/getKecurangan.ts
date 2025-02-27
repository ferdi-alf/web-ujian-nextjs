"use server";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stats = await prisma.$queryRaw(
      Prisma.sql`
      SELECT 
        CONCAT(kelas.tingkat, ' ', kelas.jurusan) AS kelas,
        COUNT(kecurangan.id) AS count
      FROM kecurangan
      LEFT JOIN siswa_detail ON kecurangan.siswaDetailId = siswa_detail.id
      LEFT JOIN kelas ON siswa_detail.kelasId = kelas.id
      WHERE kecurangan.siswaDetailId IS NOT NULL -- Hindari data null
      GROUP BY kelas.id, kelas.tingkat, kelas.jurusan
      ORDER BY count DESC
    `
    );

    console.log("Stats Data:", stats); // Debugging output

    if (!stats) {
      return NextResponse.json({ message: "No data found" }, { status: 404 });
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching cheating stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch cheating stats" },
      { status: 500 }
    );
  }
}
