/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/ui/animated-list";
import { useEffect, useState } from "react";
import Image from "next/image";
import { mutate } from "swr";
import { useCheating } from "../CheatingContext";

interface Item {
  ujianId: string;
  siswaDetailId: string;
  type: string;
  timestamp: number;
}

interface SiswaDetail {
  id: string;
  name: string;
  nis: string;
  profileImage?: string;
  kelas: {
    tingkat: string;
    jurusan: string;
  };
}

interface UjianDetail {
  id: string;
  mataPelajaran: {
    tingkat: string;
    pelajaran: string;
  };
}

export function CardPemantau({ className }: { className?: string }) {
  const [cheatingEvents, setCheatingEvents] = useState<
    Array<
      Item & {
        siswa?: SiswaDetail;
        ujian?: UjianDetail;
        isLoading: boolean;
      }
    >
  >([]);

  const {
    setNewCheatingEvent,
    updateCheatingStats,
  }: {
    setNewCheatingEvent: (event: Item | null) => void;
    updateCheatingStats: (siswaDetail: SiswaDetail) => void;
  } = useCheating();

  const HOST = process.env.NEXT_PUBLIC_API_URL_GOLANG?.replace("http://", "");

  useEffect(() => {
    const ws = new WebSocket(`ws://${HOST}/ws/admin`);

    ws.onmessage = (event) => {
      const data: Item = JSON.parse(event.data);
      console.log("Received event:", data);

      setCheatingEvents((prev) => [...prev, { ...data, isLoading: true }]);
      setNewCheatingEvent(data);

      fetchEventDetails(data);
    };

    ws.onopen = () => console.log("WebSocket connected");
    ws.onclose = () => console.log("WebSocket disconnected");
    ws.onerror = (error) => console.error("WebSocket error:", error);

    return () => ws.close();
  }, [setNewCheatingEvent, HOST]);

  const fetchEventDetails = async (event: Item) => {
    try {
      const siswaResponse = await fetch(`/api/siswa/${event.siswaDetailId}`);
      const siswaData: SiswaDetail = await siswaResponse.json();

      const ujianResponse = await fetch(`/api/ujian/${event.ujianId}`);
      const ujianData: UjianDetail = await ujianResponse.json();

      // Update the cheating stats in the context with the student details
      updateCheatingStats(siswaData);

      setCheatingEvents((prev) =>
        prev.map((item) =>
          item.siswaDetailId === event.siswaDetailId &&
          item.timestamp === event.timestamp
            ? { ...item, siswa: siswaData, ujian: ujianData, isLoading: false }
            : item
        )
      );
    } catch (error) {
      console.error("Error fetching details:", error);

      setCheatingEvents((prev) =>
        prev.map((item) =>
          item.siswaDetailId === event.siswaDetailId &&
          item.timestamp === event.timestamp
            ? { ...item, isLoading: false }
            : item
        )
      );
    }
  };

  // Helper function to get readable violation type
  const getViolationText = (type: string) => {
    switch (type) {
      case "BLURRED":
        return "Membuka Apk Lain";
      case "TAB_CHANGE":
        return "Berpindah Tab";
      case "MULTIPLE_FACES":
        return "Terdeteksi Banyak Wajah";
      case "NO_FACE":
        return "Tidak Ada Wajah";
      case "SPLIT_SCREEN":
        return "split screen";
      case "TAB_HIDDEN":
        return "Keluar Dari Ujian";
      default:
        return type;
    }
  };

  return (
    <div className="w-full p-2 rounded-lg border bg-background md:shadow-xl">
      <div className="border-b pb-3">
        <p className="font-bold">Daftar siswa terdeteksi</p>
        <p className="font-light">Tingkat X - XII</p>
      </div>
      <div
        className={cn(
          "relative flex-col h-[400px] overflow-y-auto flex p-6",
          className
        )}
      >
        <AnimatedList>
          {cheatingEvents.map((item, idx) => (
            <figure
              key={`${item.siswaDetailId}-${item.timestamp}`}
              className="relative mx-auto min-h-fit w-full cursor-pointer overflow-hidden rounded-2xl p-4 bg-white shadow-lg mb-3"
            >
              <div className="flex flex-row items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-red-500 text-white overflow-hidden">
                  <Image
                    height={50}
                    width={50}
                    className="w-full h-full object-cover bg-white"
                    src={item.siswa?.profileImage || "/avatar.png"}
                    alt={item.siswa?.name || "Siswa"}
                  />
                </div>

                {item.isLoading ? (
                  <div className="flex flex-col w-full">
                    <div className="h-5 w-1/3 bg-gray-200 animate-pulse rounded mb-2"></div>
                    <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                ) : (
                  <div className="flex flex-row w-full items-center justify-between">
                    <div className="flex flex-col overflow-hidden">
                      <figcaption className="flex flex-row items-center whitespace-pre text-lg font-medium ">
                        <span className="text-sm sm:text-lg">
                          {item.siswa?.name || item.siswaDetailId}
                        </span>
                        <span className="mx-1">·</span>
                        <span className="text-xs text-gray-500">
                          {new Date(
                            Number(item.timestamp)
                          ).toLocaleTimeString()}
                        </span>
                      </figcaption>
                      <div className="flex flex-nowrap gap-x-5 items-center">
                        {item.siswa && (
                          <div className="mt-1 flex flex-col">
                            <p className="text-sm text-gray-600">
                              Kelas: {item.siswa.kelas.tingkat}{" "}
                              {item.siswa.kelas.jurusan} - {item.siswa.nis}
                            </p>
                          </div>
                        )}
                        <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm  border border-red-400">
                          {getViolationText(item.type)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </figure>
          ))}
        </AnimatedList>
      </div>
      <div className="border-t pt-3 bg-white">
        <p className="font-bold">Data realtime pemantauan</p>
        <p className="font-light">
          Menampilkan data siswa yang terdeteksi keluar ujian
        </p>
      </div>
    </div>
  );
}
