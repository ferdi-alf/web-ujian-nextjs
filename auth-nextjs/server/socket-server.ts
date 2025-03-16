/* eslint-disable @typescript-eslint/no-explicit-any */
// server/socket-server.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

interface StatusMap {
  [key: string]: string;
}

async function getCurrentStatusSiswa() {
  try {
    // Dapatkan siswa dengan status usernya
    const data = await prisma.siswaDetail.findMany({
      select: {
        id: true,
        name: true,
        nis: true,
        kelas: {
          select: {
            tingkat: true,
            jurusan: true,
          },
        },
        user: {
          select: {
            status: true,
          },
        },
      },
    });

    return data;
  } catch (error) {
    console.error("Error fetching status:", error);
    return [];
  }
}

async function getStatusCount() {
  try {
    // Dapatkan jumlah siswa berdasarkan status
    const ujianCount = await prisma.user.count({
      where: {
        status: "UJIAN",
      },
    });

    const selesaiUjianCount = await prisma.user.count({
      where: {
        status: "SELESAI_UJIAN",
      },
    });

    return {
      UJIAN: ujianCount,
      SELESAI_UJIAN: selesaiUjianCount,
    };
  } catch (error) {
    console.error("Error getting status count:", error);
    return { UJIAN: 0, SELESAI_UJIAN: 0 };
  }
}

let lastStatusData: StatusMap = {};

let isPolling = false;
const POLL_INTERVAL = 2000; // 2 detik

async function startPolling() {
  if (isPolling) return;
  isPolling = true;

  try {
    await checkStatusChanges();
  } finally {
    isPolling = false;
    setTimeout(startPolling, POLL_INTERVAL);
  }
}

// Mulai polling
startPolling();

async function checkStatusChanges(): Promise<void> {
  try {
    const currentStatus = await getCurrentStatusSiswa();
    const statusCount = await getStatusCount();

    const currentStatusMap: StatusMap = {};
    currentStatus.forEach(
      (student: { user: { status: string }; id: string | number }) => {
        const status = student.user?.status || "OFFLINE";
        currentStatusMap[student.id] = status;
      }
    );

    let hasChanges = false;
    for (const id in currentStatusMap) {
      if (!lastStatusData[id] || lastStatusData[id] !== currentStatusMap[id]) {
        hasChanges = true;
        break;
      }
    }

    if (hasChanges) {
      console.log("Status changes detected, broadcasting...");
      io.emit("statusSiswaUpdate", currentStatus);
      io.emit("statusCountUpdate", statusCount); // Emit the current count
      lastStatusData = currentStatusMap;
    }
  } catch (error) {
    console.error("Error checking status changes:", error);
  }

  // Lakukan polling setiap 3 detik
  setTimeout(checkStatusChanges, 3000);
}

checkStatusChanges();

// Saat klien baru terhubung
io.on("connection", (socket: any) => {
  console.log("Client connected:", socket.id);

  // Kirim data status terkini ke klien baru
  getCurrentStatusSiswa().then((data) => {
    socket.emit("statusSiswaUpdate", data);
  });

  getStatusCount().then((statusCount) => {
    socket.emit("statusCountUpdate", statusCount);
  });

  socket.on("requestStatusCount", async () => {
    try {
      const statusCount = await getStatusCount();
      socket.emit("statusCountUpdate", statusCount);
    } catch (error) {
      console.error("Error fetching status counts:", error);
      socket.emit("statusCountUpdate", { UJIAN: 0, SELESAI_UJIAN: 0 });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Mulai server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

// Tangani shutdown dengan benar
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit();
});
