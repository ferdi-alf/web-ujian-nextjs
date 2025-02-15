import { prisma } from "@/lib/prisma";
import { AddSiswaSchema } from "@/lib/zod";
import { hash } from "bcrypt-ts";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("next-auth.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "No session token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validateFields = AddSiswaSchema.safeParse(body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { kelasId, siswaData } = validateFields.data;

    // Set batas maksimum menjadi 40
    const MAX_BATCH_SIZE = 40;

    if (siswaData.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          message: `Maksimal ${MAX_BATCH_SIZE} data siswa yang dapat ditambahkan per batch`,
          error: {
            batchSize: `Jumlah data melebihi batas (${siswaData.length}/${MAX_BATCH_SIZE})`,
          },
        },
        { status: 400 }
      );
    }

    // Verify kelas exists
    const existingKelas = await prisma.kelas.findUnique({
      where: {
        id: kelasId,
      },
    });

    if (!existingKelas) {
      return NextResponse.json(
        {
          message: "Kelas tidak ditemukan",
          error: { kelasId: "ID kelas tidak valid" },
        },
        { status: 404 }
      );
    }

    // Check for existing usernames/nomor ujian - Optimasi dengan satu query
    const existingUsernames = await prisma.user.findMany({
      where: {
        username: {
          in: siswaData.map((s) => s.nomorUjian),
        },
      },
      select: { username: true }, // Hanya ambil username yang dibutuhkan
    });

    if (existingUsernames.length > 0) {
      return NextResponse.json(
        {
          message: "Nomor ujian sudah digunakan",
          error: { nomorUjian: "Beberapa nomor ujian sudah terdaftar" },
        },
        { status: 400 }
      );
    }

    // Optimasi transaction dengan createMany
    const createdData = await prisma.$transaction(async (tx) => {
      // Proses password terlebih dahulu
      const processedSiswaData = await Promise.all(
        siswaData.map(async (siswa) => ({
          ...siswa,
          hashedPassword: await hash(siswa.password, 10),
        }))
      );

      // Buat semua user sekaligus
      await tx.user.createMany({
        data: processedSiswaData.map((siswa) => ({
          username: siswa.nomorUjian,
          password: siswa.hashedPassword,
          kelasId: kelasId,
          role: "SISWA",
        })),
      });

      // Ambil user yang baru dibuat
      const createdUsers = await tx.user.findMany({
        where: {
          username: {
            in: processedSiswaData.map((s) => s.nomorUjian),
          },
        },
      });

      // Buat siswaDetail untuk semua user
      await tx.siswaDetail.createMany({
        data: processedSiswaData.map((siswa, index) => ({
          userId: createdUsers[index].id,
          name: siswa.name,
          kelasId: kelasId,
          nis: siswa.nis,
          kelamin: siswa.kelamin,
          nomor_ujian: siswa.nomorUjian,
          ruang: siswa.ruang,
        })),
      });

      return createdUsers.map((user, index) => ({
        user: {
          id: user.id,
          username: user.username,
        },
        siswaDetail: {
          name: processedSiswaData[index].name,
          nis: processedSiswaData[index].nis,
        },
      }));
    });

    revalidatePath("/siswa");

    return NextResponse.json(
      {
        success: true,
        message: "Data siswa berhasil ditambahkan",
        data: createdData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Tambahkan konfigurasi timeout
export const config = {
  maxDuration: 300, // 5 menit
};
