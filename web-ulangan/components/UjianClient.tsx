/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[tingkat]/[nama-ujian]/UjianClient.tsx - Client Component
"use client";

import { useActionState, useEffect, useState } from "react";
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
import { auth } from "@/auth";
import { useSession } from "next-auth/react";
import { prisma } from "@/lib/prisma";
import { submitUjian } from "@/lib/crudUjian";
import { showErrorToast } from "./toast/ToastSuccess";
import useCheatingDetection from "./useCheatingDetection";

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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentSoalIndex, setCurrentSoalIndex] = useState(0);
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    let prevWidth = window.innerWidth;
    let prevHeight = window.innerHeight;

    const observer = new ResizeObserver(() => {
      const widthDiff = Math.abs(window.innerWidth - prevWidth);
      const heightDiff = Math.abs(window.innerHeight - prevHeight);

      if (widthDiff > 300 || heightDiff > 300) {
        console.log("Kemungkinan floating window terdeteksi!");
        setIsFloating(true);
      }

      prevWidth = window.innerWidth;
      prevHeight = window.innerHeight;
    });

    observer.observe(document.body);

    return () => observer.disconnect();
  }, []);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const totalSoal = soalData.length;
  // ini dia inti dari fitur ahahaha🔥🔥🔥
  const { isTabHidden, isBlurred, isSplitScreen, isFloatingWindow, allClear } =
    useCheatingDetection();

  const [violations, setViolations] = useState<{
    count: number;
    lastViolationType: string | null;
    timestamps: string[];
  }>({
    count: 0,
    lastViolationType: null,
    timestamps: [],
  });

  // Efek untuk melacak pelanggaran
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

  // Setel waktu mulai saat komponen dimount
  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const progressPercentage = ((currentSoalIndex + 1) / totalSoal) * 100;

  const handleAnswerSelect = (jawabanId: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [soalData[currentSoalIndex].id]: jawabanId,
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

  const currentSoal = soalData[currentSoalIndex];

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
    const unansweredSoal = soalData.find((soal) => !selectedAnswers[soal.id]);

    if (unansweredSoal) {
      showErrorToast(
        `Soal nomor ${soalData.indexOf(unansweredSoal) + 1} belum dijawab`
      );
      setCurrentSoalIndex(soalData.indexOf(unansweredSoal)); // Pindahkan ke soal yang belum dijawab
      return; // Jangan lanjutkan submit
    }

    // Jika semua soal sudah dijawab, kirimkan form
    formAction(formData);
  };

  return (
    <div className="flex flex-col gap-y-4 items-center justify-center min-h-screen p-4">
      <form
        action={async (formData) => handleFormSubmit(formData)}
        className="flex flex-col gap-y-3 w-full max-w-lg"
      >
        <input type="hidden" name="ujianId" value={ujian.id} />
        <input type="hidden" name="siswaDetailId" value={siswaId} />
        <input
          type="hidden"
          name="waktuPengerjaan"
          value={((Date.now() - (startTime ?? Date.now())) / 1000).toFixed(0)}
        />
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 h-2.5 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

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
                        checked={selectedAnswers[currentSoal.id] === jawaban.id}
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

        <button
          type="submit"
          className={`w-full ${
            currentSoalIndex === totalSoal - 1
              ? ""
              : "opacity-15 cursor-not-allowed"
          } text-white bg-gradient-to-r mt-6 shadow-md from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:focus:ring-cyan-800 font-medium rounded-lg text-sm px-6 py-2.5 text-center `}
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default UjianClient;
