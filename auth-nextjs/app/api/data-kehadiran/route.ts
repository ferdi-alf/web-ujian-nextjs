/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import "dayjs/locale/id";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("authjs.session-token")?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { error: true, message: "Unauthorized", status: 403 },
      { status: 403 }
    );
  }

  try {
    const today = dayjs().locale("id").format("YYYY-MM-DD");

    const allStudent = await prisma.siswaDetail.findMany({
      include: { kelas: true },
    });

    const loginLogs = await prisma.loginLog.findMany({
      where: {
        user: { role: "SISWA" },
        loginDate: {
          gte: new Date(today + "T00:00:00.000Z"), // Mulai dari awal hari ini
          lt: new Date(today + "T23:59:59.999Z"), // Sampai akhir hari ini
        },
      },
      include: {
        user: {
          include: {
            siswaDetail: {
              include: { kelas: true },
            },
          },
        },
      },
    });

    const formattedData: Record<"X" | "XI" | "XII", { [key: string]: any }> = {
      X: {},
      XI: {},
      XII: {},
    };

    allStudent.forEach((siswa) => {
      if (!siswa.kelas) return;

      const tingkat = siswa.kelas.tingkat; // X, XI, or XII
      const jurusan = siswa.kelas.jurusan; // RPL, TKJ, etc.
      const kelasKey = `${tingkat}-${jurusan}`;

      if (!formattedData[tingkat][kelasKey]) {
        formattedData[tingkat][kelasKey] = {
          kelas: kelasKey,
          tanggal: dayjs(today).locale("id").format("DD-MM-YYYY"),
          hari: dayjs(today).locale("id").format("dddd"),
          siswa: [],
        };
      }

      const loginHariIni = loginLogs.some(
        (log) => log.user.siswaDetail?.id === siswa.id
      );

      formattedData[tingkat][kelasKey].siswa.push({
        id: siswa.id,
        nama: siswa.name,
        keterangan: loginHariIni ? "Hadir" : "Tidak Hadir",
      });
    });

    (Object.keys(formattedData) as Array<"X" | "XI" | "XII">).forEach(
      (tingkat) => {
        formattedData[tingkat] = Object.values(formattedData[tingkat]);
      }
    );

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error saat fetch data kehadiran:", error);
    return NextResponse.json(
      { error: true, message: "Server error" },
      { status: 500 }
    );
  }
}
