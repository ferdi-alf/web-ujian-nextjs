// app/[tingkat]/[nama-ujian]/page.tsx - Server Component
import { auth } from "@/auth";
import UjianClient from "@/components/UjianClient";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const HalamanUjian = async ({
  params,
}: {
  params: { tingkat: string; "nama-ujian": string };
}) => {
  console.log("params:", params);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(
      `${apiUrl}/api/ujian?tingkat=${params.tingkat}&pelajaran=${params["nama-ujian"]}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) throw new Error("Gagal mengambil data ujian");

    const data = await res.json();

    const ujian = data?.ujian;
    const soal = data?.soal;

    console.log("Data Ujian:", ujian);
    console.log("Data Soal:", soal);

    if (!ujian) return notFound();

    const session = await auth();

    const siswaDetail = session?.user?.id
      ? await prisma.siswaDetail.findUnique({
          where: {
            userId: session.user.id,
          },
          include: {
            user: true,
            kelas: true,
          },
        })
      : null;

    // Pass the fetched data to the client component
    return (
      <UjianClient ujian={ujian} soalData={soal} siswaId={siswaDetail?.id} />
    );
  } catch (error) {
    console.error("Error fetching ujian:", error);
    return notFound();
  }
};

export default HalamanUjian;
