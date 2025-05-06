"use client";
import { BookAIcon, BookCheck, NotebookText, Users } from "lucide-react";
import Card from "../fragments/card";
import {
  getTotalSiswa,
  getTotalUjianActive,
  getTotalSoal,
  getTotalKelas,
} from "@/lib/countCard";
import { useEffect, useState } from "react";
import { useSocket } from "@/lib/socketContext";

const CardAdmin = () => {
  const [totalSiswa, setTotalSiswa] = useState("Loading...");
  const [totalUjianActive, setTotalUjianActive] = useState("Loading...");
  const [totalSiswaUjian, setTotalSiswaUjian] = useState("Loading...");
  const [totalSiswaSelesaiUjian, setTotalSiswaSelesaiUjian] =
    useState("Loading...");
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const siswa = await getTotalSiswa();
        const ujian = await getTotalUjianActive();
        const siswaUjian = await getTotalSoal();
        const siswaSelesai = await getTotalKelas();

        setTotalSiswa(siswa.toString());
        setTotalUjianActive(ujian.toString());
        setTotalSiswaUjian(siswaUjian.toString() || "");
        setTotalSiswaSelesaiUjian(siswaSelesai.toString() || "");
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleStatusCount = (statusCounts: {
      UJIAN: number;
      SELESAI_UJIAN: number;
    }) => {
      console.log("Status count update:", statusCounts);
      if (typeof statusCounts.UJIAN === "number") {
        setTotalSiswaUjian(statusCounts.UJIAN.toString());
      }
      if (typeof statusCounts.SELESAI_UJIAN === "number") {
        setTotalSiswaSelesaiUjian(statusCounts.SELESAI_UJIAN.toString());
      }
    };

    socket.on("statusCountUpdate", handleStatusCount);

    if (isConnected) {
      console.log("Socket connected, requesting status counts");
      socket.emit("requestStatusCount");
    }

    return () => {
      socket.off("statusCountUpdate", handleStatusCount);
    };
  }, [socket, isConnected]);

  return (
    <>
      <Card
        title="Total Siswa"
        icon={Users}
        data={totalSiswa}
        description="Total Data Siswa"
      />
      <Card
        title="Total Ujian Active"
        icon={BookAIcon}
        data={totalUjianActive}
        description="Total Ujian Active"
      />
      <Card
        title="Total Sedang Ujian"
        icon={NotebookText}
        data={totalSiswaUjian}
        description={isConnected ? "Real-time Data" : "Menunggu koneksi..."}
      />
      <Card
        title="Total Selesai Ujian"
        icon={BookCheck}
        data={totalSiswaSelesaiUjian}
        description={isConnected ? "Real-time Data" : "Menunggu koneksi..."}
      />
    </>
  );
};

export default CardAdmin;
