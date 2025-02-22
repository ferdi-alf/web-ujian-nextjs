import { prisma } from "@/lib/prisma";
import { updateSoalSchema } from "@/lib/zod";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { z } from "zod";
import { promises as fs } from "fs";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const soalId = await params.id;

    const existingSoal = await prisma.soal.findUnique({
      where: { id: soalId },
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
    if (imageFile) {
      const fileExtension = imageFile.name.split(".").pop();
      const fileName = `soal_${soalId}_${Date.now()}.${fileExtension}`;
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
      // Perbaikan: simpan hasil update ke variabel yang akan digunakan
      const updatedSoalRecord = await tx.soal.update({
        where: { id: soalId },
        data: {
          soal: updateData.soal,
          mataPelajaranId: updateData.mataPelajaranId,
          ...(updateData.gambar && { gambar: updateData.gambar }),
        },
      });

      await tx.jawaban.deleteMany({
        where: { soalId },
      });

      for (const jawaban of updateData.Jawaban) {
        await tx.jawaban.create({
          data: {
            jawaban: jawaban.jawaban,
            benar: jawaban.benar,
            soalId,
          },
        });
      }

      return tx.soal.findUnique({
        where: { id: soalId },
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
      { error: "Terjadi kesalahan saat memperbarui soal" },
      { status: 500 }
    );
  }
}
