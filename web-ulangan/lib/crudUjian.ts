/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/auth";
import {
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
    const validateFields = AddUjian.safeParse(
      Object.fromEntries(formData.entries())
    );
    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
      };
    }

    const { mataPelajaran, waktuPengerjaan, token } = validateFields.data;
    const url = process.env.NEXT_PUBLIC_API_URL;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("authjs.session-token")?.value;

    const response = await fetch(`${url}/api/ujian`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tambahkan token ke header jika backend membutuhkannya
        ...(sessionToken && { Authorization: `Bearer ${sessionToken}` }),
      },
      body: JSON.stringify({ mataPelajaran, waktuPengerjaan, token }),
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
    console.error("Error in add ujian:", error);
    return {
      error: {
        general: [(error as Error).message || "Terjadi kesalahan pada server"],
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

    const { id, status, waktuPengerjaan, token } = validateFields.data;
    console.log("Hasil Validasi:", validateFields.data);

    const url = process.env.NEXT_PUBLIC_API_URL;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("authjs.session-token")?.value;

    const response = await fetch(`${url}/api/ujian/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken && { Authorization: `Bearer ${sessionToken}` }),
      },
      body: JSON.stringify({ id, status, waktuPengerjaan, token }),
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
        error: {
          server: "Token tidak boleh kosong!",
        },
      };
    }

    const { token } = validateFields.data;
    const api = process.env.NEXT_PUBLIC_API_URL;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("authjs.session-token");

    const response = await fetch(`${api}/api/verifikasi-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `authjs.session-token=${sessionCookie?.value}`,
      },
      body: JSON.stringify({ token }),
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      return {
        error: {
          server: responseData.message || "Token tidak valid!",
        },
      };
    }

    return {
      success: true,
      data: responseData.data,
    };
  } catch (error) {
    return {
      error: {
        server: (error as Error).message || "Terjadi kesalahan pada server",
      },
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
    revalidatePath("/ujian");

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
