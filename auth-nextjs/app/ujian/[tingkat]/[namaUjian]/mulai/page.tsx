import { auth } from "@/auth";
import UjianClient from "@/components/UjianClient";
import { prisma } from "@/lib/prisma";
import { Tingkat } from "@prisma/client";
import { notFound } from "next/navigation";

type Tparams = Promise<{ tingkat: string; namaUjian: string }>;

export default async function HalamanUjian(props: { params: Tparams }) {
  try {
    const session = await auth();

    const { tingkat, namaUjian } = await props.params;
    if (!session?.user?.id) {
      notFound();
    }

    if (session.user.id) {
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          status: "UJIAN",
        },
      });
    }

    const siswaDetail = await prisma.siswaDetail.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        user: true,
        kelas: true,
      },
    });

    if (!siswaDetail) {
      notFound();
    }

    await prisma.siswaDetail.update({
      where: {
        userId: siswaDetail?.userId,
      },
      data: {
        status: "UJIAN",
      },
    });

    const ujian = await prisma.ujian.findFirst({
      where: {
        mataPelajaran: {
          tingkat: tingkat as Tingkat,
          pelajaran: namaUjian,
        },
      },
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
      notFound();
    }

    const soalData = ujian?.mataPelajaran?.soal || [];
    return (
      <UjianClient
        ujian={ujian}
        soalData={soalData}
        siswaId={siswaDetail?.id}
      />
    );
  } catch (error) {
    console.error("Error fetching ujian:", error);
    return notFound();
  }
}
