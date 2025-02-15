import { writeFile } from "fs/promises";
import path from "path";
import { hash } from "bcrypt-ts";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { UpdateSiswaSchema } from "@/lib/zod";
import { revalidatePath } from "next/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    // Pastikan params sudah benar sebelum digunakan
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { message: "ID tidak ditemukan" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("next-auth.session-token")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "No session token found" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const parsedData = Object.fromEntries(formData.entries());

    const validateFields = UpdateSiswaSchema.safeParse(parsedData);
    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, ruang, kelamin, nis, nomor_ujian, username, password } =
      validateFields.data;

    const existingSiswa = await prisma.siswaDetail.findUnique({
      where: { id },
      include: { kelas: true },
    });

    if (!existingSiswa) {
      return NextResponse.json(
        { message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    let imageUrl: string | undefined;
    const file = formData.get("image") as File;
    if (file && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), "public/avatarSiswa");
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${uniqueSuffix}-${file.name}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);
        imageUrl = `/avatarSiswa/${filename}`;
      } catch (error) {
        console.error("Error saving file:", error);
        return NextResponse.json(
          { message: "Error saving image", error },
          { status: 500 }
        );
      }
    }

    const updateSiswa = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingSiswa.userId },
        data: {
          username,
          ...(imageUrl && { image: imageUrl }),
          ...(password && password.length >= 5
            ? { password: await hash(password, 10) }
            : {}),
          role: "SISWA",
          kelasId: existingSiswa.kelasId,
        },
      });

      return tx.siswaDetail.update({
        where: { id },
        data: {
          name,
          ruang,
          kelamin,
          nis,
          nomor_ujian,
          kelasId: existingSiswa.kelasId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              image: true,
              role: true,
              kelasId: true,
            },
          },
          kelas: { select: { id: true, tingkat: true, jurusan: true } },
        },
      });
    });

    revalidatePath("/siswa");

    return NextResponse.json(
      { success: true, data: updateSiswa },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/siswa/[id]:", error);
    return NextResponse.json(
      { message: "Terjadi Kesalahan pada server", error: String(error) },
      { status: 500 }
    );
  }
}
