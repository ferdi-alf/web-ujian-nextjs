import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { siswaDetailId, ujianId } = req.query;

  if (!siswaDetailId || !ujianId) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    // Ambil detail siswa
    const siswa = await prisma.siswaDetail.findUnique({
      where: { id: String(siswaDetailId) },
      include: { kelas: true },
    });

    // Ambil detail ujian
    const ujian = await prisma.ujian.findUnique({
      where: { id: String(ujianId) },
      include: { mataPelajaran: true },
    });

    if (!siswa || !ujian) {
      return res.status(404).json({ message: "Data not found" });
    }

    res.json({
      namaSiswa: siswa.name,
      tingkatSiswa: siswa.kelas?.tingkat || "N/A",
      jurusanSiswa: siswa.kelas?.jurusan || "N/A",
      tingkatUjian: ujian.mataPelajaran?.tingkat || "N/A",
      mataPelajaran: ujian.mataPelajaran?.pelajaran || "N/A",
    });
  } catch (error) {
    console.error("Error fetching cheating details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
