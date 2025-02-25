"use server";
import { prisma } from "@/lib/prisma";
import { AddUjian } from "@/lib/zod";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const tokenAuth = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7) // Hapus 'Bearer ' dari string
      : null;

    if (!tokenAuth) {
      return NextResponse.json(
        { error: true, message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validateFields = AddUjian.safeParse(body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          status: 400,
          message: "Validation failed",
          errors: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { mataPelajaran, waktuPengerjaan, token } = validateFields.data;
    const checkMataPelajaran = await prisma.mataPelajaran.findUnique({
      where: { id: mataPelajaran },
    });

    if (!checkMataPelajaran) {
      return NextResponse.json(
        {
          error: true,
          message: `Mata pelajaran dengan ID ${mataPelajaran} tidak ditemukan`,
          status: 400,
        },
        { status: 400 }
      );
    }

    const findPelajaran = await prisma.ujian.findFirst({
      where: {
        mataPelajaranId: mataPelajaran,
      },
    });

    if (findPelajaran) {
      return NextResponse.json(
        {
          error: true,
          message: `Data ujian dengan mata pelajaran ${checkMataPelajaran.pelajaran} tingkat ${checkMataPelajaran.tingkat} sudah ada`,
          status: 400,
        },
        { status: 400 }
      );
    }

    const parsedWaktuPengerjaan = parseInt(waktuPengerjaan);
    if (isNaN(parsedWaktuPengerjaan) || parsedWaktuPengerjaan <= 0) {
      return NextResponse.json({
        error: true,
        message: "Waktu pengerjaan harus berupa angka positif",
        status: 400,
      });
    }

    const newData = await prisma.ujian.create({
      data: {
        mataPelajaranId: mataPelajaran,
        waktuPengerjaan: parsedWaktuPengerjaan,
        token: token || null,
      },
    });
    revalidatePath("/ujian");

    return NextResponse.json(
      {
        status: 201,
        success: true,
        message: `Ujian untuk mata pelajaran ${checkMataPelajaran.pelajaran} tingkat ${checkMataPelajaran.tingkat} berhasil ditambahkan`,
        data: newData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in /api/ujian:", error);
    return NextResponse.json(
      {
        status: 500,
        error: true,
        message: "Terjadi kesalahan pada server",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
