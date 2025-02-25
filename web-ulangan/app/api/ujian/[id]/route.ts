import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateUjianSchema } from "@/lib/zod";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7) // Hapus 'Bearer ' dari string
      : null;

    if (!token) {
      return NextResponse.json(
        { error: true, message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

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
    const id = params.id;

    const existingUjian = await prisma.ujian.findUnique({
      where: { id: id },
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
    const updateUjian = await prisma.ujian.update({
      where: {
        id: id,
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
