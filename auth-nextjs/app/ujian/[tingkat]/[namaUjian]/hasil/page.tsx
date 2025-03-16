"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useRouter, useSearchParams } from "next/navigation";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface HasilUjianType {
  id: string;
  siswaDetailId: string;
  ujianId: string;
  mataPelajaran: string;
  tingkat: string;
  waktuPengerjaan: number;
  nilai: number;
  benar: number;
  salah: number;
  totalKecurangan: number;
  kecurangan?: {
    totalCount: number;
    byType: {
      type: string;
      count: number;
    }[];
  };
  createdAt: number;
}

const HasilUjianClient = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasilId = searchParams.get("hasil");
  const [hasil, setHasil] = useState<HasilUjianType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(
    "Sabar lagi ambil data hasil kamu"
  );
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const timeouts = [
      setTimeout(() => setProgress(53), 900),
      setTimeout(() => setMessage("Ntar dikit lagi"), 1000),
      setTimeout(() => setProgress(75), 1300),
      setTimeout(() => setMessage("Hayo deg-degan pasti 😁"), 2300),
      setTimeout(() => setProgress(100), 5000),
      setTimeout(() => {
        setMessage(null);
        setShowResult(true);
      }, 6000),
    ];

    return () => timeouts.forEach(clearTimeout);
  }, []);

  console.log("hasilId", hasilId);

  useEffect(() => {
    const fetchHasil = async () => {
      if (!hasilId) {
        setError("ID hasil tidak ditemukan");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL_GOLANG}/api/hasil/${hasilId}`
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data hasil");
        }

        const data = await response.json();
        setHasil(data);
      } catch (err) {
        setError("Terjadi kesalahan saat mengambil data hasil");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHasil();
  }, [hasilId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !hasil) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-500">Error</h2>
              <p className="mt-2">{error || "Data hasil tidak ditemukan"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format waktu pengerjaan (dari detik ke menit:detik)
  const formatWaktu = (detik: number) => {
    const menit = Math.floor(detik / 60);
    const sisaDetik = detik % 60;
    return `${menit}:${sisaDetik.toString().padStart(2, "0")}`;
  };

  const totalSoal = hasil.benar + hasil.salah;

  return (
    <div className="flex flex-col justify-center items-center  p-4 mt-12">
      <Card className="w-full mt-8 bg-white/40 inset-0 backdrop-blur-lg shadow-lg rounded-2xl  max-w-lg">
        <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-t-lg">
          <CardTitle className="text-center">
            Hasil Ujian {hasil.mataPelajaran} tingkat {hasil.tingkat}
          </CardTitle>
        </CardHeader>
        <CardContent className="">
          <div className="w-full max-w-md mx-auto text-center px-3">
            <DotLottieReact
              src="https://lottie.host/67b97ff7-a3d8-4f15-b98a-fead9a267e7f/Y3Nn8w6Uc8.lottie"
              loop={false}
              autoplay
            />
            <div className="w-full bg-gray-200 rounded-full  h-6 relative overflow-hidden">
              <div
                className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-1 leading-none rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              >
                {progress}%
              </div>
            </div>

            {message && (
              <p className="mt-3 text-gray-500 text-sm font-semibold font-serif">
                {message}
              </p>
            )}

            {showResult && (
              <div className="text-center mt-2">
                <h1 className="text-4xl font-bold text-blue-600">
                  {hasil.nilai}
                </h1>
                <p className="text-gray-500 mt-1">Nilai Akhir</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-around mb-2">
                <span className="font-medium">Jawaban Benar</span>
                <span className="font-medium">
                  {showResult ? (
                    `${hasil.benar} - ${totalSoal}`
                  ) : (
                    <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-blue-400"></div>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">Jawaban Benar</p>
                {showResult ? (
                  <p className="text-xl font-semibold text-green-500">
                    {hasil.benar}
                  </p>
                ) : (
                  <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-blue-400"></div>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">Jawaban Salah</p>
                {showResult ? (
                  <p className="text-xl font-semibold text-red-500">
                    {hasil.salah}
                  </p>
                ) : (
                  <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-blue-400"></div>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">Waktu Pengerjaan</p>
                {showResult ? (
                  <p className="text-xl font-semibold">
                    {formatWaktu(hasil.waktuPengerjaan)}
                  </p>
                ) : (
                  <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-blue-400"></div>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500"> Total Kecurangan kamu</p>
                {showResult ? (
                  <p className="text-xl font-semibold text-orange-500">
                    {hasil.totalKecurangan}
                  </p>
                ) : (
                  <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-blue-400"></div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <button
        onClick={() => router.push("/ujian")}
        className="bg-gradient-to-r max-w-lg w-full mt-3 p-3 from-cyan-500 to-blue-500 hover:to-blue-700 font-semibold text-white rounded"
      >
        Lanjut
      </button>
    </div>
  );
};

export default HasilUjianClient;
