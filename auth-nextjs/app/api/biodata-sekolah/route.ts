import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AddBiodataSchema } from "@/lib/zod";
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
    const validateFields = AddBiodataSchema.safeParse(body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
          status: 400,
        },
        { status: 400 }
      );
    }

    const { id, namaSekolah, alamatSekolah, nipKepalaSekolah, kepalaSekolah } =
      validateFields.data;

    if (id) {
      const updateData = await prisma.biodataSekolah.update({
        where: { id },
        data: {
          alamat: alamatSekolah,
          namaSekolah: namaSekolah,
          kepalaSekolah: kepalaSekolah,
          NipKepalaSekolah: nipKepalaSekolah,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Berhasil memperbarui data",
        data: updateData,
      });
    } else {
      // Jika ID tidak ada, buat data baru
      const addData = await prisma.biodataSekolah.create({
        data: {
          alamat: alamatSekolah,
          namaSekolah: namaSekolah,
          kepalaSekolah: kepalaSekolah,
          NipKepalaSekolah: nipKepalaSekolah,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Berhasil menambahkan data baru",
        data: addData,
      });
    }
  } catch (error) {
    console.error("Error in /api/biodata-sekolah:", error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan pada server",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { status: 401, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validateFields = AddBiodataSchema.safeParse(body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { id, namaSekolah, alamatSekolah, nipKepalaSekolah, kepalaSekolah } =
      validateFields.data;

    if (!id) {
      return NextResponse.json(
        { message: "ID diperlukan untuk memperbarui data" },
        { status: 400 }
      );
    }

    const updateData = await prisma.biodataSekolah.update({
      where: { id },
      data: {
        alamat: alamatSekolah || undefined,
        namaSekolah: namaSekolah || undefined,
        kepalaSekolah: kepalaSekolah || undefined,
        NipKepalaSekolah: nipKepalaSekolah || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data berhasil diperbarui",
      data: updateData,
    });
  } catch (error) {
    console.error("Error in PUT /api/biodata-sekolah:", error);
    return NextResponse.json(
      { message: "Server error", error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
