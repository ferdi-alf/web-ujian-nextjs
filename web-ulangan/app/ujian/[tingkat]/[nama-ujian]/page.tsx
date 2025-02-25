import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface UjianDetailProps {
  params: { tingkat: string; "nama-ujian": string };
}

const UjianDetail = async ({ params }: UjianDetailProps) => {
  const { tingkat, "nama-ujian": namaUjian } = params;

  // Cari ujian berdasarkan tingkat & nama pelajaran
  const ujian = await prisma.ujian.findFirst({
    include: {
      mataPelajaran: true,
    },
  });

  // Jika ujian tidak ditemukan, tampilkan halaman 404
  if (!ujian) {
    notFound();
  }

  return (
    <div className="w-full h-screen flex justify-center  items-center">
      <div className="p-6 max-w-xl mx-auto  bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold">
          Ujian {ujian.mataPelajaran.pelajaran}
        </h1>
        <p>
          <strong>Tingkat:</strong> {ujian.mataPelajaran.tingkat}
        </p>
        <p>
          <strong>Waktu Pengerjaan:</strong> {ujian.waktuPengerjaan} menit
        </p>
        {/* <button
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() =>
          (window.location.href = `/ujian/${tingkat}/${namaUjian}/mulai`)
        }
      >
        Mulai Ujian
      </button> */}
      </div>
    </div>
  );
};

export default UjianDetail;
