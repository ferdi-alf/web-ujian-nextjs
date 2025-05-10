/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { existsSync } from "fs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const id = params.id;

    const session = await auth();
    const isNotRole = !(
      session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
    );
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("authjs.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: true, message: "No session token found", status: 401 },
        { status: 401 }
      );
    }

    if (!session || isNotRole) {
      return NextResponse.json(
        { error: true, message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const mataPelajaran = await prisma.mataPelajaran.findUnique({
      where: { id },
      include: {
        soal: true,
      },
    });

    if (!mataPelajaran) {
      return NextResponse.json(
        {
          error: true,
          message: "Mata pelajaran tidak ditemukan",
          status: 404,
        },
        { status: 404 }
      );
    }

    const checkUjian = await prisma.ujian.findFirst({
      where: {
        mataPelajaranId: id,
        status: "active",
      },
    });

    if (checkUjian) {
      return NextResponse.json(
        {
          error: true,
          message:
            "Gagal menghapus, karna mata pelajaran ini terdapat ujian active.",
          status: 400,
        },
        { status: 400 }
      );
    }

    for (const soal of mataPelajaran.soal) {
      if (soal.gambar) {
        const imagePath = path.join(process.cwd(), "public", soal.gambar);

        try {
          if (existsSync(imagePath)) {
            await fs.unlink(imagePath);
            console.log(`Berhasil menghapus gambar: ${imagePath}`);
          }
        } catch (error) {
          console.error(`Error menghapus gambar ${imagePath}:`, error);
        }
      }
    }

    await prisma.mataPelajaran.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Berhasil menghapus Mata Pelajaran dan semua soal terkait",
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Terjadi Kesalahan saat menghapus Mata Pelajaran",
        status: 500,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: any) {
  const idJadwal = params.id;
  console.log("idJadwal", idJadwal);

  try {
    const jadwal = await prisma.jadwal.findUnique({
      where: { id: idJadwal },
      select: {
        tingkat: true,
      },
    });

    if (!idJadwal) {
      return NextResponse.json(
        { error: true, message: "Jadwal not found" },
        { status: 404 }
      );
    }

    const tingkat = jadwal?.tingkat;

    const allJadwalWithSameTingkat = await prisma.jadwal.findMany({
      where: {
        tingkat: tingkat,
      },
      select: {
        sesi: {
          select: {
            ujian: {
              select: {
                mataPelajaranId: true,
              },
            },
          },
        },
      },
    });

    const usedMataPelajaranIds = new Set(
      allJadwalWithSameTingkat.flatMap((j) =>
        j.sesi.flatMap((s) => s.ujian.map((u) => u.mataPelajaranId))
      )
    );

    const available = await prisma.mataPelajaran.findMany({
      where: {
        tingkat,
        id: {
          notIn: Array.from(usedMataPelajaranIds).filter(Boolean),
        },
      },
      select: {
        id: true,
        tingkat: true,
        pelajaran: true,
      },
    });

    return NextResponse.json(available);
  } catch (error) {
    console.error("Error fetching available mata pelajaran:", error);
    return NextResponse.json(
      { error: "Failed to fetch available mata pelajaran" },
      { status: 500 }
    );
  }
}
