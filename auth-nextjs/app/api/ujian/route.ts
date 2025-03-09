/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AddUjian } from "@/lib/zod";
import { Tingkat } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pelajaran = searchParams.get("pelajaran");
  const tingkat = searchParams.get("tingkat");

  if (!pelajaran || !tingkat) {
    return NextResponse.json(
      {
        error: true,
        message: "Pelajaran dan tingkat harus diisi",
        status: 400,
      },
      { status: 400 }
    );
  }

  try {
    // Cari ujian berdasarkan pelajaran dan tingkat
    const ujian = await prisma.ujian.findFirst({
      where: {
        mataPelajaran: {
          pelajaran: pelajaran,
          tingkat: tingkat as Tingkat, // Pastikan tingkat sesuai dengan enum
        },
      },
      include: {
        mataPelajaran: true,
      },
    });

    if (!ujian) {
      return NextResponse.json(
        { error: true, message: "Ujian tidak ditemukan", status: 404 },
        { status: 404 }
      );
    }

    // Ambil soal berdasarkan mataPelajaranId ujian
    const soal = await prisma.soal.findMany({
      where: { mataPelajaranId: ujian.mataPelajaranId },
      include: { Jawaban: true },
    });

    return NextResponse.json(
      {
        success: true,
        ujian,
        soal,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: true, message: "Terjadi kesalahan server", status: 500 },
      { status: 500 }
    );
  }
}
