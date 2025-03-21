/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { updateSoalSchema } from "@/lib/zod";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { z } from "zod";
import { promises as fs } from "fs";
import { existsSync } from "fs";
import { auth } from "@/auth";
import { cookies } from "next/headers";

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const id = params.id;
    const session = await auth();
    const isNotRole = !(
      session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
    );
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("authjs.session-token")?.value;

    if (!sessionToken) {
      return Response.json(
        { error: true, message: "No session token found", status: 401 },
        { status: 401 }
      );
    }

    if (!session || isNotRole) {
      return Response.json(
        { error: true, message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const existingSoal = await prisma.soal.findUnique({
      where: { id: id },
      include: {
        Jawaban: true,
      },
    });

    if (!existingSoal) {
      return NextResponse.json(
        { error: "Soal tidak ditemukan" },
        { status: 404 }
      );
    }

    const formData = await request.formData();

    const soalText = formData.get("soal") as string;
    const mataPelajaranId = formData.get("mataPelajaranId") as string;
    const imageFile = formData.get("gambar") as File | null;

    const jawabanData = [];
    const jawabanCount = parseInt(
      (formData.get("jawabanCount") as string) || "0"
    );

    for (let i = 0; i < jawabanCount; i++) {
      const jawabanId = formData.get(`jawaban[${i}].id`) as string;
      const jawabanText = formData.get(`jawaban[${i}].jawaban`) as string;
      const jawabanBenar = formData.get(`jawaban[${i}].benar`) === "true";
      jawabanData.push({
        id: jawabanId || undefined,
        jawaban: jawabanText,
        benar: jawabanBenar,
      });
    }

    const updateData: {
      soal: string;
      mataPelajaranId: string;
      gambar?: string;
      Jawaban: {
        id?: string;
        jawaban: string;
        benar: boolean;
      }[];
    } = {
      soal: soalText,
      mataPelajaranId,
      Jawaban: jawabanData,
    };

    let imagePath = existingSoal.gambar;
    const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
    if (imageFile) {
      const fileExtension = imageFile.name.split(".").pop()?.toLowerCase();
      const mimeType = imageFile.type; // Dapatkan MIME type dari file

      if (!ACCEPTED_IMAGE_TYPES.includes(mimeType)) {
        return NextResponse.json(
          { error: true, message: "Format file tidak valid", status: 400 },
          { status: 400 }
        );
      }

      if (
        (mimeType === "image/jpeg" &&
          fileExtension !== "jpg" &&
          fileExtension !== "jpeg") ||
        (mimeType === "image/png" && fileExtension !== "png") ||
        (mimeType === "image/webp" && fileExtension !== "webp")
      ) {
        return NextResponse.json(
          {
            error: true,
            message: "Ekstensi file tidak sesuai dengan isi file",
            status: 400,
          },
          { status: 400 }
        );
      }
      const fileName = `soal_${id}_${Date.now()}.${fileExtension}`;
      const filePath = path.join(
        process.cwd(),
        "public",
        "image-soal",
        fileName
      );

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Gunakan promises version dari fs.writeFile
      await fs.writeFile(filePath, buffer);

      imagePath = `/image-soal/${fileName}`;
      updateData.gambar = imagePath;
    }

    try {
      updateSoalSchema.parse(updateData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.format() }, { status: 400 });
      }
      throw error;
    }

    const updatedSoal = await prisma.$transaction(async (tx) => {
      // Update soal
      await tx.soal.update({
        where: { id: id },
        data: {
          soal: updateData.soal,
          mataPelajaranId: updateData.mataPelajaranId,
          ...(updateData.gambar && { gambar: updateData.gambar }),
        },
      });

      // Cari jawaban existing
      const existingJawaban = await tx.jawaban.findMany({
        where: { soalId: id },
      });

      // Proses update/create/delete jawaban
      for (const jawaban of updateData.Jawaban) {
        // Cek apakah jawaban sudah ada
        const existingJawabanItem = existingJawaban.find(
          (existing) => existing.id === jawaban.id
        );

        if (existingJawabanItem) {
          // Update jawaban yang sudah ada
          await tx.jawaban.update({
            where: { id: jawaban.id },
            data: {
              jawaban: jawaban.jawaban,
              benar: jawaban.benar,
            },
          });
        } else {
          // Buat jawaban baru jika tidak ada
          await tx.jawaban.create({
            data: {
              jawaban: jawaban.jawaban,
              benar: jawaban.benar,
              soal: { connect: { id } },
            },
          });
        }
      }

      // Hapus jawaban yang tidak ada di update
      const updatedJawabanIds = updateData.Jawaban.map((j) => j.id).filter(
        (id): id is string => !!id
      );
      await tx.jawaban.deleteMany({
        where: {
          soalId: id,
          id: { notIn: updatedJawabanIds },
        },
      });

      return tx.soal.findUnique({
        where: { id: id },
        include: {
          Jawaban: true,
          mataPelajaran: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "berhasil mengupdate data",
        data: updatedSoal,
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating soal:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Terjadi kesalahan saat mengupdate soal",
        status: 500,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const soalId = params.id;
    const session = await auth();
    const isNotRole = !(
      session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
    );
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("authjs.session-token")?.value;

    if (!sessionToken) {
      return Response.json(
        { error: true, message: "No session token found", status: 401 },
        { status: 401 }
      );
    }

    if (!session || isNotRole) {
      return Response.json(
        { error: true, message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const existingSoal = await prisma.soal.findUnique({
      where: { id: soalId },
      include: {
        Jawaban: true,
      },
    });

    if (!existingSoal) {
      return NextResponse.json(
        { error: true, message: "Soal tidak ditemukan", status: 404 },
        { status: 404 }
      );
    }

    if (existingSoal.gambar) {
      const imagePath = path.join(process.cwd(), "public", existingSoal.gambar);

      try {
        // Tambahkan logging untuk debug
        console.log("Mencoba menghapus gambar di path:", imagePath);

        if (existsSync(imagePath)) {
          await fs.unlink(imagePath);
          console.log("Gambar berhasil dihapus");
        } else {
          console.log("File gambar tidak ditemukan di:", imagePath);
        }
      } catch (error) {
        console.error("Error saat menghapus gambar:", error);
      }
    }

    await prisma.soal.delete({
      where: {
        id: soalId,
      },
      include: { Jawaban: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Berhasil menghapus Soal",
        status: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("Error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Terjadi Kesalahan saat menghapus soal",
        status: 500,
      },
      { status: 500 }
    );
  }
}
