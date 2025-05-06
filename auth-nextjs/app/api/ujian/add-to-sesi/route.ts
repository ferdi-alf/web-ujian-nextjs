import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
    const body = await request.json(); // ✅ GANTI INI
    const mataPelajaranIds = body.mataPelajaranIds as string[];
    const idJadwal = body.idJadwal as string;

    console.log("Array:", Array.isArray(mataPelajaranIds));
    console.log("idJadwal:", idJadwal);

    const sesiList = await prisma.sesi.findMany({
      where: { jadwalId: idJadwal },
      select: { id: true },
    });

    const ujianToInsert = [];

    for (const sesi of sesiList) {
      for (const mapelId of mataPelajaranIds) {
        ujianToInsert.push({
          sesiId: sesi.id,
          mataPelajaranId: mapelId,
        });
      }
    }

    await prisma.ujian.createMany({
      data: ujianToInsert,
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      message: "Berhasil menambahkan ujian",
    });
  } catch (error) {
    console.error("Error menambahkan Ujian:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Error menambahkan ujian",
        status: 500,
      },
      {
        status: 500,
      }
    );
  }
}
