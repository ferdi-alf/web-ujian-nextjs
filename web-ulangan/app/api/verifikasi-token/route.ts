/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    const ujian = await prisma.ujian.findUnique({
      where: { token },
      include: {
        mataPelajaran: true,
      },
    });

    if (!ujian) {
      return NextResponse.json(
        { error: true, message: "Token tidak valid", status: 400 },
        { status: 400 }
      );
    }

    // Jika token valid, kembalikan data ujian (termasuk nama ujian untuk redirect)
    return NextResponse.json(
      {
        success: true,
        data: ujian,
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: true, message: "Terjadi kesalahan pada server", status: 500 },
      { status: 500 }
    );
  }
}
