/* eslint-disable @typescript-eslint/no-unused-vars */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    const session = await auth();
    const idUser = session?.user?.id;

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

    const ujian = await prisma.ujian.findUnique({
      where: { token },
      include: {
        mataPelajaran: {
          include: {
            soal: {
              include: {
                Jawaban: true,
              },
            },
          },
        },
      },
    });

    if (!ujian) {
      return NextResponse.json(
        { error: true, message: "Token tidak valid", status: 400 },
        { status: 400 }
      );
    }

    if (ujian.status === "pending") {
      return NextResponse.json(
        { error: true, message: "Ujian belum active", status: 400 },
        { status: 400 }
      );
    }

    if (ujian.status === "selesai") {
      return NextResponse.json(
        { error: true, message: "Ujian sudah selesai", status: 400 },
        { status: 400 }
      );
    }

    const siswaDetail = await prisma.siswaDetail.findUnique({
      where: {
        userId: idUser,
      },
      include: {
        hasil: true,
        kelas: true,
      },
    });

    if (!siswaDetail) {
      return NextResponse.json(
        { error: true, message: "Siswa detail tidak ditemukan", status: 404 },
        { status: 404 }
      );
    }

    const sudahMengerjakan = siswaDetail.hasil.some(
      (hasil) => hasil.ujianId === ujian.id
    );

    if (sudahMengerjakan) {
      return NextResponse.json(
        {
          error: true,
          message: "Anda sudah mengerjakan ujian ini",
          status: 403,
        },
        { status: 403 }
      );
    }

    if (siswaDetail.kelas.tingkat !== ujian.mataPelajaran.tingkat) {
      return NextResponse.json(
        {
          error: true,
          message: "Ujian ini tidak diperuntukkan untuk tingkat Anda",
          status: 403,
        },
        { status: 403 }
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
