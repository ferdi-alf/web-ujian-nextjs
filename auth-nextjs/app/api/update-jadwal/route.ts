/* eslint-disable @typescript-eslint/no-explicit-any */
// api/update-jadwal/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { payloadSchema } from "@/lib/zod";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  const body = await request.json();

  console.log("Data yang diterima:", JSON.stringify(body, null, 2));

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
    const parseResult = payloadSchema.safeParse(body);

    if (!parseResult.success) {
      console.log(
        "Validasi gagal:",
        JSON.stringify(parseResult.error.errors, null, 2)
      );
      return NextResponse.json(
        {
          error: true,
          message: "Validasi gagal",
          errors_field: parseResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    console.log("Data setelah validasi:", JSON.stringify(data, null, 2));

    function hitungDurasiMenit(
      start: string | null,
      end: string | null
    ): number | null {
      if (start === null || end === null) {
        return null;
      }

      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);

      return endH * 60 + endM - (startH * 60 + startM);
    }

    for (const sesi of data.sesi) {
      console.log(`Processing sesi ID: ${sesi.id}`);

      await prisma.sesi.update({
        where: { id: sesi.id },
        data: {
          jamMulai: sesi.jamMulai,
          jamSelesai: sesi.jamSelesai,
        },
      });

      for (const ujian of sesi.ujian) {
        if (!ujian.id) continue;

        console.log(`Processing ujian ID: ${ujian.id}`);

        const updateData: any = {
          sesiId: sesi.id,
        };

        if (ujian.jamMulai !== null) {
          updateData.jamMulai = ujian.jamMulai;
        }

        if (ujian.jamSelesai !== null) {
          updateData.jamSelesai = ujian.jamSelesai;
        }

        if (ujian.jamMulai !== null && ujian.jamSelesai !== null) {
          const waktuPengerjaan = hitungDurasiMenit(
            ujian.jamMulai,
            ujian.jamSelesai
          );
          if (waktuPengerjaan !== null) {
            updateData.waktuPengerjaan = waktuPengerjaan;
          }
        }

        await prisma.ujian.update({
          where: { id: ujian.id },
          data: updateData,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Data berhasil disimpan",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saat memproses data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menyimpan ke database",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
