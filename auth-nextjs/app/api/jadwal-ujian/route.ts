"use server";
import { auth } from "@/auth";
import { JadwalData } from "@/components/table/data-jadwalUjian";
import { prisma } from "@/lib/prisma";
import { addJadwalUjianSchema } from "@/lib/zod";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();
  const sessionStore = await cookies();
  const sessionToken = sessionStore.get("authjs.session-token")?.value;

  if (!session && sessionToken) {
    return NextResponse.json(
      { status: 401, error: true, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validateFields = addJadwalUjianSchema.safeParse(body);
    console.log("data yang diterima API", body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          error: true,
          message: "Validation failed",
          error_field: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { tingkat, tanggal, jumlahSesi } = validateFields.data;
    const existingJadwal = await prisma.jadwal.findFirst({
      where: {
        tingkat: tingkat,
        tanggal: tanggal,
      },
    });

    if (existingJadwal) {
      const formattedDate = new Date(tanggal).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      return NextResponse.json(
        {
          error: true,
          message: `Jadwal tingkat ${tingkat} - ${formattedDate} sudah ada`,
          status: 409,
        },
        { status: 409 }
      );
    }

    const jadwal = await prisma.jadwal.create({
      data: {
        tingkat,
        tanggal,
      },
    });

    console.log("data jadwal", jadwal);

    const sesiData = Array.from({ length: Number(jumlahSesi) }, (_, index) => ({
      sesi: index + 1,
      jadwalId: jadwal.id,
    }));

    await prisma.sesi.createMany({
      data: sesiData,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Jadwal dan sesi berhasil ditambahkan",
        status: 201,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan pada server",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    const sessionStore = await cookies();
    const sessionToken = sessionStore.get("authjs.session-token")?.value;

    if (!session && sessionToken) {
      return NextResponse.json(
        { status: 401, error: true, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const jadwalList = await prisma.jadwal.findMany({
      include: {
        sesi: {
          include: {
            ujian: {
              include: {
                mataPelajaran: true,
              },
            },
          },
        },
      },
      orderBy: {
        tanggal: "asc",
      },
    });

    const grouped = {
      X: [],
      XI: [],
      XII: [],
    } as Record<"X" | "XI" | "XII", JadwalData[]>;

    for (const jadwal of jadwalList) {
      const jumlahUjian = jadwal.sesi.reduce(
        (total, sesi) => total + sesi.ujian.length,
        0
      );

      const jadwalData = {
        id: jadwal.id,
        tanggal: jadwal.tanggal.toISOString(),
        tingkat: jadwal.tingkat,
        jumlahUjian,
        sesi: jadwal.sesi.map((s) => ({
          id: s.id,
          sesi: s.sesi,
          jamMulai: s.jamMulai,
          jamSelesai: s.jamSelesai,
          ujian: s.ujian.map((u) => ({
            id: u.id,
            jamMulai: u.jamMulai,
            jamSelesai: u.jamSelesai,
            mataPelajaran: `${u.mataPelajaran.tingkat} ${u.mataPelajaran.pelajaran}`,
          })),
        })),
      };

      grouped[jadwal.tingkat].push(jadwalData);
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Gagal mengambil jadwal ujian:", error);
    return NextResponse.json(
      { error: true, message: "Gagal mengambil data jadwal ujian" },
      { status: 500 }
    );
  }
}
