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
