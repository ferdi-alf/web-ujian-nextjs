"use server";

import { auth } from "@/auth";
import {
  AddUjian,
  tokenSchema,
  ujianSchema,
  updateUjianSchema,
} from "@/lib/zod";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { cookies } from "next/headers";

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

export async function submitUjian(prevState: unknown, formData: FormData) {
  try {
    // Ambil data dari FormData
    const ujianId = formData.get("ujianId") as string;
    const siswaDetailId = formData.get("siswaDetailId") as string;
    const waktuPengerjaan = formData.get("waktuPengerjaan") as string;

    // Ambil jawaban siswa
    const jawabanEntries = Array.from(formData.entries()).filter(([key]) =>
      key.startsWith("soal-")
    );

    const jawaban = jawabanEntries.map(([key, value]) => ({
      soalId: key.replace("soal-", ""), // Ambil ID soal dari name="soal-123"
      jawabanId: value as string, // ID jawaban yang dipilih
    }));

    // Validasi dengan Zod
    const result = ujianSchema.safeParse({
      ujianId,
      siswaDetailId,
      waktuPengerjaan,
      jawaban,
    });

    console.log("hasil", result);

    if (!result.success) {
      return { error: result.error.format() };
    }

    // Kirim data ke API backend Golang Fiber
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/ujian/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.data),
      }
    );

    if (!response.ok) {
      throw new Error("Gagal menyimpan jawaban ke backend");
    }

    return { success: "Jawaban berhasil dikirim ke server" };
  } catch (error) {
    console.error(error);
    return { error: "Terjadi kesalahan saat mengirim jawaban" };
  }
}
