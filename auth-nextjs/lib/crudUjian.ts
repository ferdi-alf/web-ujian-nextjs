/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/auth";
import {
  addJadwalUjianSchema,
  AddUjian,
  submitUjianSchema,
  tokenSchema,
  updateUjianSchema,
} from "@/lib/zod";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const addUjian = async (prevState: unknown, formData: FormData) => {
  try {
    // Cek autentikasi
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "ADMIN" && session.user?.role !== "SUPERADMIN")
    ) {
      return {
        error: { general: ["Unauthorized"] },
      };
    }

    // Validasi fields
    const validateFields = AddUjian.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
      };
    }

    const { mataPelajaran, waktuPengerjaan, token } = validateFields.data;

    // Cek mata pelajaran
    const checkMataPelajaran = await prisma.mataPelajaran.findUnique({
      where: { id: mataPelajaran },
    });

    if (!checkMataPelajaran) {
      return {
        error: {
          general: [
            `Mata pelajaran dengan ID ${mataPelajaran} tidak ditemukan`,
          ],
        },
      };
    }

    // Cek apakah ujian sudah ada
    const findPelajaran = await prisma.ujian.findFirst({
      where: {
        mataPelajaranId: mataPelajaran,
      },
    });

    if (findPelajaran) {
      return {
        error: {
          general: [
            `Data ujian dengan mata pelajaran ${checkMataPelajaran.pelajaran} tingkat ${checkMataPelajaran.tingkat} sudah ada`,
          ],
        },
      };
    }

    // Validasi waktu pengerjaan
    const parsedWaktuPengerjaan = parseInt(waktuPengerjaan);
    if (isNaN(parsedWaktuPengerjaan) || parsedWaktuPengerjaan <= 0) {
      return {
        error: {
          general: ["Waktu pengerjaan harus berupa angka positif"],
        },
      };
    }

    // Buat ujian baru
    const newData = await prisma.ujian.create({
      data: {
        mataPelajaranId: mataPelajaran,
        waktuPengerjaan: parsedWaktuPengerjaan,
        token: token || null,
      },
    });

    // Revalidate path
    revalidatePath("/ujian");

    return {
      success: true,
      data: newData,
      message: `Ujian untuk mata pelajaran ${checkMataPelajaran.pelajaran} tingkat ${checkMataPelajaran.tingkat} berhasil ditambahkan`,
    };
  } catch (error) {
    console.error("Error in add ujian:", error);
    return {
      error: {
        general: [
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server",
        ],
      },
    };
  }
};

export const getUjian = async () => {
  const session = await auth();
  const notRole = !(
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
  );

  if (!session || notRole) {
    redirect("/");
  }

  try {
    const data = await prisma.ujian.findMany({
      include: {
        mataPelajaran: {
          select: {
            id: true,
            tingkat: true,
            pelajaran: true,
          },
        },
      },
    });

    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};

export const updateUjian = async (prevState: unknown, formData: FormData) => {
  try {
    const validateFields = updateUjianSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
      };
    }

    const { id, status, waktuPengerjaan, jamMulai, jamSelesai, token } =
      validateFields.data;
    console.log("Hasil Validasi:", validateFields.data);

    const url = process.env.NEXT_PUBLIC_API_URL;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("authjs.session-token");

    console.log(
      "wkmw:",
      id,
      status,
      waktuPengerjaan,
      jamMulai,
      jamSelesai,
      token
    );

    const response = await fetch(`${url}/api/ujian/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `authjs.session-token=${sessionToken?.value}`,
      },
      body: JSON.stringify({
        id,
        status,
        waktuPengerjaan,
        jamMulai,
        jamSelesai,
        token,
      }),
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Gagal menambahkan data");
    }

    return {
      success: true,
      data: responseData.data,
      message: responseData.message,
    };
  } catch (error) {
    console.error("Error update data:", error);
    return {
      error: {
        general: [(error as Error).message || "Terjadi kesalahan pada server"],
      },
    };
  }
};

export const deleteUjian = async (id: string) => {
  const session = await auth();
  const notRole = !(
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
  );

  if (!session || notRole) {
    return { error: true, message: "Unauthorized", status: 401 };
  }

  try {
    const existingUjian = await prisma.ujian.findUnique({
      where: { id: id },
      include: { mataPelajaran: true },
    });

    if (!existingUjian) {
      return { error: true, message: "Ujian tidak ditemukan", status: 404 };
    }

    if (existingUjian.status === "active") {
      return {
        error: true,
        message: `Tidak bisa menghapus ujian ${existingUjian.mataPelajaran.pelajaran} tingkat ${existingUjian.mataPelajaran.tingkat}. Ujian sedang active`,
        status: 400,
      };
    }

    const deletedUjian = await prisma.ujian.delete({ where: { id: id } });

    return {
      success: true,
      data: deletedUjian,
      message: `Berhasil menghapus ujian ${existingUjian.mataPelajaran.pelajaran} tingkat ${existingUjian.mataPelajaran.tingkat}.`,
    };
  } catch (error) {
    console.log("Error deleting ujian:", error);
    return { error: true, message: "Gagal menghapus ujian", status: 500 };
  }
};

export const toUjian = async (prevState: unknown, formdata: FormData) => {
  try {
    const validateFields = tokenSchema.safeParse({
      token: formdata.get("token"),
    });

    if (!validateFields.success) {
      return {
        error: true,
        message: "Token tidak boleh kosong!",
        status: 400,
      };
    }

    const session = await auth();
    const idUser = session?.user?.id;

    const { token } = validateFields.data;

    // ✅ 1. Cek apakah token ujian valid terlebih dahulu
    const ujian = await prisma.ujian.findUnique({
      where: { token },
      include: {
        mataPelajaran: {
          include: {
            soal: {
              include: {
                Jawaban: true,
              },
            },
          },
        },
      },
    });

    if (!ujian) {
      return {
        error: true,
        message: "Token ga valid 😞",
        status: 400,
      };
    }

    if (ujian.status === "pending") {
      return {
        error: true,
        message: "Ujiannya belum active 😴",
        status: 400,
      };
    }

    if (ujian.status === "selesai") {
      return {
        error: true,
        message: "Ujiannya udah selesai woi 😅",
        status: 400,
      };
    }

    // ✅ 2. Cek apakah siswa ada di database
    const siswaDetail = await prisma.siswaDetail.findUnique({
      where: {
        userId: idUser,
      },
      include: {
        hasil: true,
        kelas: true,
      },
    });

    if (!siswaDetail) {
      return {
        error: true,
        message: "Siswa detail tidak ditemukan",
        status: 404,
      };
    }

    // ✅ 3. Cek apakah siswa sudah mengerjakan ujian ini → DIPINDAH KE SINI
    const sudahMengerjakan = siswaDetail.hasil.some(
      (hasil) => hasil.ujianId === ujian.id
    );

    if (sudahMengerjakan) {
      return {
        error: true,
        message: "Kamu udah ngerjain ujian ini 😒",
        status: 403,
      };
    }

    // ✅ 4. Cek apakah tingkat siswa sesuai dengan tingkat ujian
    if (siswaDetail.kelas.tingkat !== ujian.mataPelajaran.tingkat) {
      return {
        error: true,
        message: "Ujian ini tidak diperuntukkan untuk tingkat kamu 😁",
        status: 403,
      };
    }

    // Jika token valid dan semua syarat terpenuhi, kembalikan data ujian
    return {
      success: true,
      data: ujian,
      status: 200,
    };
  } catch (error) {
    return {
      error: true,
      message: (error as Error).message || "Terjadi kesalahan pada server",
      status: 500,
    };
  }
};

export async function submitUjian(
  prevState: unknown,
  formData: FormData,
  submitData?: any
) {
  try {
    let ujianId,
      siswaDetailId,
      waktuMulai,
      waktuSelesai,
      selectedAnswers,
      waktuPengerjaan;

    if (submitData) {
      ujianId = submitData.ujianId;
      siswaDetailId = submitData.siswaDetailId;
      selectedAnswers = submitData.selectedAnswers;
      waktuMulai = submitData.waktuMulai;
      waktuSelesai = submitData.waktuSelesai;
      waktuPengerjaan = submitData.waktuPengerjaan;
    } else {
      ujianId = formData.get("ujianId") as string;
      siswaDetailId = formData.get("siswaDetailId") as string;
      waktuMulai = formData.get("waktuMulai") as string;
      waktuSelesai = formData.get("waktuSelesai") as string;

      const selectedAnswersString = formData.get("selectedAnswers") as string;
      selectedAnswers = selectedAnswersString
        ? JSON.parse(selectedAnswersString)
        : null;

      waktuPengerjaan = Math.floor(
        (parseInt(waktuSelesai) - parseInt(waktuMulai)) / 1000
      );
    }

    if (!selectedAnswers || Object.keys(selectedAnswers).length === 0) {
      return { success: false, message: "Tidak ada jawaban yang dipilih" };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validateFields = submitUjianSchema.parse({ ujianId, siswaDetailId });

    const requestData = {
      ujianId,
      siswaDetailId,
      answers: selectedAnswers,
      waktuPengerjaan,
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL_GOLANG;
    const response = await fetch(`${API_URL}/api/ujian/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Gagal mengirim jawaban",
      };
    }

    const data = await response.json();

    return { success: true, hasilId: data.hasilId }; // Return hasilId agar bisa digunakan di client
  } catch (error) {
    console.error("Error submitting exam:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Validasi gagal",
        errors: error.errors,
      };
    }
    return {
      success: false,
      message: "Terjadi kesalahan saat mengirim jawaban",
    };
  }
}

export const addJadwalUjian = async (
  prevState: unknown,
  formData: FormData
) => {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "ADMIN" && session.user?.role !== "SUPERADMIN")
    ) {
      return {
        error: true,
        message: "Unauthorized",
        status: 403,
      };
    }
    console.log("session pertama:", session, session.user.role);

    const validateFields = addJadwalUjianSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validateFields.success) {
      return {
        error: true,
        error_field: validateFields.error.flatten().fieldErrors,
      };
    }
    const { tingkat, jumlahSesi, tanggal } = validateFields.data;
    const url = process.env.NEXT_PUBLIC_API_URL;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("authjs.session-token");
    console.log("cookie:", cookieStore);
    console.log("session Cookie:", sessionCookie);

    const response = await fetch(`${url}/api/jadwal-ujian`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `authjs.session-token=${sessionCookie?.value}`,
      },
      body: JSON.stringify({
        tingkat,
        jumlahSesi,
        tanggal,
      }),
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: responseData.message || "Gagal menambahkan data ujian",
        status: response.status,
      };
    } else if (responseData) {
      return {
        success: true,
        message: responseData.message,
      };
    }
  } catch (error) {
    console.log(error);
  }
};
