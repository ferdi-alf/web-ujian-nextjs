import { prisma } from "@/lib/prisma";

export async function getTotalSiswa() {
  try {
    const totalSiswa = await prisma.user.count({
      where: {
        role: "SISWA",
      },
    });

    return totalSiswa;
  } catch (error) {
    console.error("Error mengambil total siswa:", error);
    return 0; // Mengembalikan 0 jika terjadi error
  }
}

export async function getTotalUjianActive() {
  try {
    const totalSiswa = await prisma.ujian.count({
      where: {
        status: "active",
      },
    });

    return totalSiswa;
  } catch (error) {
    console.error("Error mengambil total siswa:", error);
    return 0; // Mengembalikan 0 jika terjadi error
  }
}

export async function getTotalSoal() {
  try {
    const totalSoal = await prisma.mataPelajaran.count();
    return totalSoal;
  } catch (error) {
    console.error("Error mengammbil total soal", error);
    return 0;
  }
}

export async function getTotalKelas() {
  try {
    const totalKelas = await prisma.kelas.count();
    return totalKelas;
  } catch (error) {
    console.error("Error mengambil total kelas", error);
    return 0;
  }
}
