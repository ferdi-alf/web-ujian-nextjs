/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("authjs.session-token");

  if (!sessionToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const hasil = await prisma.hasil.findMany({
      include: {
        siswaDetail: {
          include: {
            kelas: true,
            kecurangan: true,
          },
        },
        ujian: {
          include: {
            mataPelajaran: true,
          },
        },
      },
    });

    const groupedData = hasil.reduce((acc: any[], item) => {
      const ujianId = item.ujian.id;
      const tingkat = item.ujian.mataPelajaran.tingkat;
      const pelajaran = item.ujian.mataPelajaran.pelajaran;
      const kelasId = item.siswaDetail.kelas.id;
      const jurusan = item.siswaDetail.kelas.jurusan;

      let ujianObj = acc.find((u) => u.id === ujianId);
      if (!ujianObj) {
        ujianObj = {
          id: ujianId,
          tingkat,
          pelajaran,
          kelas: [],
        };
        acc.push(ujianObj);
      }

      let kelasObj = ujianObj.kelas.find(
        (k: { id: string }) => k.id === kelasId
      );
      if (!kelasObj) {
        kelasObj = {
          id: kelasId,
          tingkat,
          jurusan,
          siswa: [],
        };
        ujianObj.kelas.push(kelasObj);
      }

      const totalKecurangan = item.siswaDetail.kecurangan.filter(
        (k) => k.ujianId === item.ujian.id
      ).length;

      kelasObj.siswa.push({
        id: item.siswaDetail.id,
        name: item.siswaDetail.name,
        nis: item.siswaDetail.nis,
        nomor_ujian: item.siswaDetail.nomor_ujian,
        ruang: item.siswaDetail.ruang,
        nilai: item.nilai,
        benar: item.benar,
        salah: item.salah,
        waktuPengerjaan: item.waktuPengerjaan,
        totalKecurangan,
      });

      return acc;
    }, []);

    return NextResponse.json(
      {
        success: true,
        status: 200,
        data: groupedData,
        message:
          "Berhasil mengelompokkan data ujian berdasarkan kelas dan siswa.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: true, message: "Terjadi kesalahan di server", status: 500 },
      { status: 500 }
    );
  }
}
