/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest, { params }: any) {
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
    const id = params.id;

    const cariJadwal = await prisma.jadwal.findUnique({
      where: { id },
    });

    if (!cariJadwal) {
      return NextResponse.json(
        {
          error: true,
          error_message: "Jadwal tidak ditemukan",
          status: 404,
        },
        { status: 404 }
      );
    }

    await prisma.jadwal.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil menghapus jadwal ${dayjs(cariJadwal.tanggal)
          .locale("id")
          .format("D MMMM YYYY")} tingkat ${cariJadwal.tingkat}`,
        status: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("error", error);
  }
}
