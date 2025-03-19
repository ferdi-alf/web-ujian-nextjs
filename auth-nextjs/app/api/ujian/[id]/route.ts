/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateUjianSchema } from "@/lib/zod";

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const body = await request.json();
    console.log("Body yang diterima di API:", body);
    const validateFields = updateUjianSchema.safeParse(body);
    console.log("Hasil Validasi API:", validateFields);

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

    const { status, waktuPengerjaan, token: examToken } = validateFields.data;

    const existingUjian = await prisma.ujian.findUnique({
      where: { id: params.id },
      include: {
        mataPelajaran: true,
      },
    });

    if (!existingUjian) {
      return NextResponse.json(
        { error: true, message: "Ujian tidak ditemukan", status: 404 },
        { status: 404 }
      );
    }

    if (status === "active") {
      const activeUjianSameTingkat = await prisma.ujian.findFirst({
        where: {
          id: { not: params.id }, // Exclude current exam
          status: "active",
          mataPelajaran: {
            tingkat: existingUjian.mataPelajaran.tingkat,
          },
        },
      });

      if (activeUjianSameTingkat) {
        return NextResponse.json(
          {
            error: true,
            message: `Sudah ada ujian aktif untuk tingkat ${existingUjian.mataPelajaran.tingkat}. Nonaktifkan ujian tersebut terlebih dahulu.`,
            status: 400,
          },
          { status: 400 }
        );
      }
    }

    if (
      status === "active" ||
      (existingUjian.status === "active" && status === "selesai")
    ) {
      // Ambil semua siswa dengan tingkat yang sama dengan mata pelajaran
      const siswaSameTingkat = await prisma.siswaDetail.findMany({
        where: {
          kelas: {
            tingkat: existingUjian.mataPelajaran.tingkat,
          },
        },
        select: {
          user: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      // Filter hanya siswa yang memiliki user (tidak null)
      const userIds = siswaSameTingkat
        .filter((siswa) => siswa.user !== null)
        .map((siswa) => siswa.user.id);

      if (userIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          const users = await tx.user.findMany({
            where: {
              id: { in: userIds },
            },
            select: {
              id: true,
              status: true,
            },
          });

          for (const user of users) {
            if (user.status === "UJIAN" || user.status === "SELESAI_UJIAN") {
              await tx.user.update({
                where: { id: user.id },
                data: { status: "ONLINE" },
              });
            }
          }
        });
      }
    }

    const updateUjian = await prisma.ujian.update({
      where: {
        id: params.id,
      },
      data: {
        waktuPengerjaan: parseInt(waktuPengerjaan),
        status: status,
        token: examToken,
      },
    });

    return NextResponse.json(
      {
        success: true,
        status: 200,
        data: updateUjian,
        message: `Berhasil memperbarui ujian ${existingUjian.mataPelajaran.pelajaran} tingkat ${existingUjian.mataPelajaran.tingkat}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating ujian:", error);
    return NextResponse.json(
      { error: true, message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: any) {
  try {
    const ujianId = params.id;

    const ujian = await prisma.ujian.findUnique({
      where: {
        id: ujianId,
      },
      include: {
        mataPelajaran: true,
      },
    });

    if (!ujian) {
      return NextResponse.json(
        { error: "Ujian tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: ujian.id,
      mataPelajaran: {
        tingkat: ujian.mataPelajaran.tingkat,
        pelajaran: ujian.mataPelajaran.pelajaran,
      },
    });
  } catch (error) {
    console.error("Error fetching ujian:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
