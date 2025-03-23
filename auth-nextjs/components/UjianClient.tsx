/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[tingkat]/[nama-ujian]/UjianClient.tsx - Client Component
"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { submitUjian } from "@/lib/crudUjian";
import { showErrorToast } from "./toast/ToastSuccess";
import useCheatingDetection from "./useCheatingDetection";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

interface JawabanType {
  id: string;
  soalId: string;
  jawaban: string;
  benar: boolean;
}

interface SoalType {
  id: string;
  soal: string;
  gambar: string | null;
  mataPelajaranId: string;
  Jawaban: JawabanType[];
}

interface UjianClientProps {
  ujian: any;
  soalData: SoalType[];
  siswaId: any;
}

const UjianClient = ({ ujian, soalData, siswaId }: UjianClientProps) => {
  const [state, formAction] = useActionState(submitUjian, null);
  const { pending } = useFormStatus();
  console.log(state);
  const totalDetikAwal = ujian.waktuPengerjaan * 60; // Konversi menit ke detik
  const [sisaWaktu, setSisaWaktu] = useState(totalDetikAwal);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentSoalIndex, setCurrentSoalIndex] = useState(0);
  const router = useRouter();

  // State untuk soal yang sudah diacak
  const [randomizedSoal, setRandomizedSoal] = useState<SoalType[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});

  // State untuk tracking soal asli ke soal teracak (untuk keperluan penilaian)
  const [soalMapping, setSoalMapping] = useState<Record<string, string>>({});

  // ini dia inti dari fitur ahahaha🔥🔥🔥
  const { isTabHidden, isBlurred, isSplitScreen, isFloatingWindow, allClear } =
    useCheatingDetection({ ujianId: ujian.id, siswaDetailId: siswaId });

  const [violations, setViolations] = useState<{
    count: number;
    lastViolationType: string | null;
    timestamps: string[];
  }>({
    count: 0,
    lastViolationType: null,
    timestamps: [],
  });

  // Fungsi untuk mengacak array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fungsi untuk membuat seed random berdasarkan ID siswa
  const getRandomSeed = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

  // Mengacak soal saat komponen dimuat
  useEffect(() => {
    const siswaIdSeed = getRandomSeed(siswaId);

    // Cek apakah ada data acakan tersimpan di localStorage
    const savedRandomization = localStorage.getItem(
      `randomizedSoal_${ujian.id}_${siswaId}`
    );
    const savedMapping = localStorage.getItem(
      `soalMapping_${ujian.id}_${siswaId}`
    );
    const savedAnswers = localStorage.getItem(
      `selectedAnswers_${ujian.id}_${siswaId}`
    );

    if (savedRandomization && savedMapping) {
      // Gunakan data yang sudah tersimpan
      setRandomizedSoal(JSON.parse(savedRandomization));
      setSoalMapping(JSON.parse(savedMapping));

      if (savedAnswers) {
        setSelectedAnswers(JSON.parse(savedAnswers));
      }
    } else {
      // Buat pengacakan baru
      // Clone dan acak soal
      const shuffledSoal = shuffleArray([...soalData]);
      const mapping: Record<string, string> = {};

      // Acak juga pilihan jawaban untuk tiap soal
      const randomizedSoalWithShuffledAnswers = shuffledSoal.map((soal) => {
        mapping[soal.id] = soal.id; // Simpan mapping ID asli ke ID teracak

        // Clone dan acak jawaban
        const shuffledJawaban = shuffleArray([...soal.Jawaban]);

        return {
          ...soal,
          Jawaban: shuffledJawaban,
        };
      });

      setRandomizedSoal(randomizedSoalWithShuffledAnswers);
      setSoalMapping(mapping);

      // Simpan hasil pengacakan ke localStorage
      localStorage.setItem(
        `randomizedSoal_${ujian.id}_${siswaId}`,
        JSON.stringify(randomizedSoalWithShuffledAnswers)
      );
      localStorage.setItem(
        `soalMapping_${ujian.id}_${siswaId}`,
        JSON.stringify(mapping)
      );
    }
  }, [soalData, siswaId, ujian.id]);

  useEffect(() => {
    if (state?.success && state.hasilId) {
      // Bersihkan localStorage hanya jika ujian berhasil diselesaikan
      localStorage.removeItem("waktuMulaiUjian");
      localStorage.removeItem(`randomizedSoal_${ujian.id}_${siswaId}`);
      localStorage.removeItem(`soalMapping_${ujian.id}_${siswaId}`);
      localStorage.removeItem(`selectedAnswers_${ujian.id}_${siswaId}`);

      router.push(
        `/ujian/${ujian.mataPelajaran.tingkat}/${ujian.mataPelajaran.pelajaran}/hasil?hasil=${state.hasilId}`
      );
    }
  }, [state?.success, state?.hasilId, router, ujian, siswaId]);

  useEffect(() => {
    let violationType: string | null = null;

    if (isTabHidden) violationType = "tab_hidden";
    else if (isBlurred) violationType = "focus_lost";
    else if (isSplitScreen) violationType = "split_screen";
    else if (isFloatingWindow) violationType = "floating_window";

    if (violationType) {
      setViolations((prev) => ({
        count: prev.count + 1,
        lastViolationType: violationType,
        timestamps: [...prev.timestamps, new Date().toISOString()],
      }));
    }
  }, [isTabHidden, isBlurred, isSplitScreen, isFloatingWindow]);

  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    // Cek apakah ada waktu mulai di localStorage
    const waktuMulai = localStorage.getItem("waktuMulaiUjian");

    if (waktuMulai) {
      const selisihDetik = Math.floor(
        (Date.now() - parseInt(waktuMulai)) / 1000
      );
      const waktuTersisa = totalDetikAwal - selisihDetik;
      setSisaWaktu(waktuTersisa > 0 ? waktuTersisa : 0);
    } else {
      // Simpan waktu mulai baru jika belum ada
      localStorage.setItem("waktuMulaiUjian", Date.now().toString());
    }
  }, []);

  useEffect(() => {
    if (sisaWaktu <= 0) return; // Hentikan jika sudah 0 detik

    const timer = setInterval(() => {
      setSisaWaktu((prevWaktu) => prevWaktu - 1);
    }, 1000);

    return () => clearInterval(timer); // Cleanup saat unmount
  }, [sisaWaktu]);

  // Simpan jawaban ke localStorage setiap kali berubah
  useEffect(() => {
    if (Object.keys(selectedAnswers).length > 0) {
      localStorage.setItem(
        `selectedAnswers_${ujian.id}_${siswaId}`,
        JSON.stringify(selectedAnswers)
      );
    }
  }, [selectedAnswers, ujian.id, siswaId]);

  const menit = Math.floor(sisaWaktu / 60);
  const detik = sisaWaktu % 60;

  const totalSoal = randomizedSoal.length;
  const progressPercentage =
    totalSoal > 0 ? ((currentSoalIndex + 1) / totalSoal) * 100 : 0;

  const handleAnswerSelect = (jawabanId: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [randomizedSoal[currentSoalIndex].id]: jawabanId,
    });
  };

  const handleNextSoal = () => {
    if (currentSoalIndex < totalSoal - 1) {
      setCurrentSoalIndex(currentSoalIndex + 1);
    }
  };

  const handlePrevSoal = () => {
    if (currentSoalIndex > 0) {
      setCurrentSoalIndex(currentSoalIndex - 1);
    }
  };

  const handleJumpToSoal = (index: number) => {
    if (index >= 0 && index < totalSoal) {
      setCurrentSoalIndex(index);
    }
  };

  const currentSoal = randomizedSoal[currentSoalIndex];

  const generatePaginationItems = () => {
    const items = [];

    let startPage = Math.max(0, currentSoalIndex - 1);
    let endPage = Math.min(totalSoal - 1, currentSoalIndex + 1);

    if (endPage - startPage < 2 && totalSoal > 2) {
      if (startPage === 0) {
        endPage = Math.min(2, totalSoal - 1);
      } else if (endPage === totalSoal - 1) {
        startPage = Math.max(totalSoal - 3, 0);
      }
    }

    if (startPage > 0) {
      items.push(
        <PaginationItem key="page-first" className="hidden sm:block">
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleJumpToSoal(0);
            }}
            className={
              currentSoalIndex === 0
                ? "text-white hover:text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 font-medium rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 text-center mx-1"
                : "text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 mx-1"
            }
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (startPage > 1) {
        items.push(
          <PaginationItem key="ellipsis-start" className="hidden sm:block">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={`page-${i}`}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleJumpToSoal(i);
            }}
            isActive={currentSoalIndex === i}
            className={
              currentSoalIndex === i
                ? "text-white hover:text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 font-medium rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 text-center mx-1"
                : "text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 mx-1"
            }
          >
            {i + 1}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalSoal - 2) {
      items.push(
        <PaginationItem key="ellipsis-end" className="hidden sm:block">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    if (endPage < totalSoal - 1) {
      items.push(
        <PaginationItem key="page-last" className="hidden sm:block">
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleJumpToSoal(totalSoal - 1);
            }}
            className={
              currentSoalIndex === totalSoal - 1
                ? "text-white hover:text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 font-medium rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 text-center mx-1"
                : "text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 mx-1"
            }
          >
            {totalSoal}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  const handleFormSubmit = (formData: FormData) => {
    // Cek apakah ada soal yang belum dijawab
    const unansweredSoal = randomizedSoal.find(
      (soal) => !selectedAnswers[soal.id]
    );

    if (unansweredSoal) {
      showErrorToast(
        `Soal nomor ${randomizedSoal.indexOf(unansweredSoal) + 1} belum dijawab`
      );
      setCurrentSoalIndex(randomizedSoal.indexOf(unansweredSoal)); // Pindahkan ke soal yang belum dijawab
      return; // Jangan lanjutkan submit
    }

    console.log("Final answers before submit:", selectedAnswers);

    const waktuMulai = localStorage.getItem("waktuMulaiUjian");
    const waktuSelesai = Date.now();

    // Buat FormData baru
    const newFormData = new FormData();
    newFormData.append("ujianId", formData.get("ujianId") as string);
    newFormData.append(
      "siswaDetailId",
      formData.get("siswaDetailId") as string
    );
    newFormData.append("waktuMulai", waktuMulai || "0");
    newFormData.append("waktuSelesai", waktuSelesai.toString());

    // Tambahkan selectedAnswers sebagai JSON string
    newFormData.append("selectedAnswers", JSON.stringify(selectedAnswers));

    // Tambahkan soalMapping untuk referensi saat penilaian
    newFormData.append("soalMapping", JSON.stringify(soalMapping));

    // Panggil formAction dengan FormData yang sudah lengkap
    formAction(newFormData);
  };

  if (randomizedSoal.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Menyiapkan ujian...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4 items-center justify-center min-h-screen p-4">
      <form
        action={async (formData) => handleFormSubmit(formData)}
        className="flex flex-col gap-y-3 w-full max-w-lg"
      >
        <input type="hidden" name="ujianId" value={ujian.id} />
        <input type="hidden" name="siswaDetailId" value={siswaId} />
        <div className="absolute left-0 top-24 font-medium p-3 rounded-tr-xl rounded-br-xl bg-white shadow-lg">
          <div className="ml-3">{`${menit}:${detik
            .toString()
            .padStart(2, "0")}`}</div>
        </div>

        <input
          type="hidden"
          name="selectedAnswers"
          value={JSON.stringify(selectedAnswers)}
        />

        <input
          type="hidden"
          name="soalMapping"
          value={JSON.stringify(soalMapping)}
        />

        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 h-2.5 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {currentSoal && (
          <div className="bg-white shadow-md rounded p-4">
            <div className="flex flex-nowrap gap-2">
              <p className="text-start">{currentSoalIndex + 1}. </p>
              <div className="flex flex-col w-full">
                {currentSoal.gambar && (
                  <div className="mb-3 relative w-full h-48">
                    <Image
                      src={currentSoal.gambar}
                      alt="Gambar Soal"
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                )}

                <p className="font-medium text-base text-gray-800">
                  {currentSoal.soal}
                </p>

                <div className="mt-4 space-y-4">
                  {currentSoal.Jawaban &&
                    currentSoal.Jawaban.map((jawaban, idx) => (
                      <div
                        key={jawaban.id}
                        className="flex flex-nowrap items-start gap-2"
                      >
                        <input
                          type="radio"
                          id={jawaban.id}
                          name={`soal-${currentSoal.id}`}
                          value={jawaban.id}
                          checked={
                            selectedAnswers[currentSoal.id] === jawaban.id
                          }
                          onChange={() => handleAnswerSelect(jawaban.id)}
                          className="mt-1"
                        />
                        <label
                          htmlFor={jawaban.id}
                          className="text-sm cursor-pointer"
                        >
                          {jawaban.jawaban}
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <Pagination>
            <PaginationContent className="flex justify-center">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePrevSoal();
                  }}
                  className={`text-white hover:text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 font-medium rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 text-center mx-1 ${
                    currentSoalIndex === 0
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }`}
                />
              </PaginationItem>

              {generatePaginationItems()}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNextSoal();
                  }}
                  className={`text-white hover:text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 font-medium rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 text-center mx-1 ${
                    currentSoalIndex === totalSoal - 1
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        {pending ? (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            {/* Loading spinner */}
            <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
          </div>
        ) : null}
        {currentSoalIndex === totalSoal - 1 && (
          <button
            type="submit"
            className="w-full text-white bg-gradient-to-r mt-6 shadow-md from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
          >
            {pending ? "Loading..." : "Kirim Jawaban"}
          </button>
        )}
      </form>

      {/* Indicator untuk soal yang sudah dijawab */}
      {/* <div className="w-full max-w-lg mt-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {randomizedSoal.map((soal, idx) => (
            <button
              key={soal.id}
              onClick={() => handleJumpToSoal(idx)}
              className={`w-8 h-8 text-xs rounded-full ${
                selectedAnswers[soal.id]
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700"
              } ${currentSoalIndex === idx ? "ring-2 ring-blue-500" : ""}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div> */}
    </div>
  );
};

export default UjianClient;
