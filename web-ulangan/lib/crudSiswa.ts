"use server";
import { AddSiswaSchema, UpdateSiswaSchema } from "@/lib/zod";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

export const AddSiswa = async (prevState: unknown, formData: FormData) => {
  try {
    const kelasId = formData.get("kelasId")?.toString();
    if (!kelasId) {
      return {
        error: {
          kelasId: ["Kelas harus dipilih"],
        },
        message: "Pilih kelas terlebih dahulu",
      };
    }

    const entries = Array.from(formData.entries());
    const nameEntries = entries.filter(([key]) => key.startsWith("name"));

    if (nameEntries.length === 0) {
      return {
        error: {
          message: "Minimal harus ada 1 data siswa",
        },
      };
    }

    const siswaData = nameEntries.map((_, index) => ({
      name: formData.get(`name${index}`)?.toString() || "",
      nis: formData.get(`nis${index}`)?.toString() || "",
      ruang: formData.get(`ruang${index}`)?.toString() || "",
      kelamin: formData.get(`kelamin${index}`)?.toString() || "",
      nomorUjian: formData.get(`nomorUjian${index}`)?.toString() || "",
      password: formData.get(`password${index}`)?.toString() || "",
    }));

    // Validasi field
    const siswaErrors = siswaData.map((studentData) => {
      const error: { [key: string]: string } = {};
      if (!studentData.name) error.name = "Nama harus diisi";
      if (!studentData.nis) error.nis = "NIS/NISN harus diisi";
      if (!studentData.ruang) error.ruang = "Ruang harus diisi";
      if (!studentData.kelamin) error.kelamin = "Jenis kelamin harus dipilih";
      if (!studentData.nomorUjian) error.nomorUjian = "Nomor ujian harus diisi";
      if (!studentData.password) error.password = "Password harus diisi";
      return Object.keys(error).length > 0 ? error : null;
    });

    if (siswaErrors.some((err) => err !== null)) {
      return {
        error: {
          message: "Ada data yang belum diisi",
          siswaData: siswaErrors,
        },
      };
    }

    const dataToValidate = { kelasId, siswaData };
    const validateFields = AddSiswaSchema.safeParse(dataToValidate);

    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
        message: "Validasi data gagal",
      };
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("next-auth.session-token");

    const response = await fetch(`${apiUrl}/api/siswa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `next-auth.session-token=${sessionCookie?.value}`,
      },
      body: JSON.stringify(validateFields.data),
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Gagal menambahkan data");
    }

    revalidateTag("siswa");

    return {
      success: true,
      data: responseData.data,
      message: "Berhasil menambahkan data siswa",
    };
  } catch (error) {
    return {
      error: {
        server: (error as Error).message || "Terjadi kesalahan pada server",
      },
    };
  }
};

export const getSiswa = async () => {
  const session = await auth();

  const notRole = !(
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
  );

  if (!session || notRole) {
    redirect("/");
  }

  try {
    const siswa = await prisma.siswaDetail.findMany({
      include: {
        kelas: {
          select: {
            id: true,
            tingkat: true,
            jurusan: true,
          },
        },
        user: {
          select: {
            id: true,
            role: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return siswa;
  } catch (error) {
    console.error("Error fetching siswa:", error);
    return [];
  }
};

export const updateSiswa = async (prevState: unknown, formData: FormData) => {
  try {
    const file = formData.get("image") as File;
    if (file && file.size === 0) {
      formData.delete("image");
    }

    const validateFields = UpdateSiswaSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
      };
    }

    const { id } = validateFields.data;
    const apiUrl = process.env.NEXT_URL_API_URL || "http://localhost:3000";
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("next-auth.session-token");

    const response = await fetch(`${apiUrl}/api/siswa/${id}`, {
      method: "PUT",
      headers: {
        Cookie: `next-auth.session-token=${sessionCookie?.value}`,
      },
      body: formData, // Send formData directly
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (responseData.error && typeof responseData.error === "object") {
        return {
          error: responseData.error,
        };
      }
      throw new Error(responseData.message || "Gagal mengupdate data siswa");
    }

    revalidateTag("siswa");

    return {
      success: true,
      data: responseData.data,
      message: "Berhasil mengupdate data siswa",
    };
  } catch (error) {
    console.error("Error saat update:", error);
    return {
      error: {
        server: (error as Error).message || "Terjadi kesalahan pada server",
      },
    };
  }
};

export const deleteSiswa = async (ids: string[]) => {
  const session = await auth();
  const notRole = !(
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
  );

  if (!session || notRole) {
    throw new Error("Unauthoaized");
  }

  try {
    const siswaDetails = await prisma.siswaDetail.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        userId: true,
      },
    });

    const userIds = siswaDetails.map((detail) => detail.userId);

    await prisma.$transaction([
      prisma.siswaDetail.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      }),

      prisma.user.deleteMany({
        where: {
          id: {
            in: userIds,
          },
        },
      }),
    ]);

    return {
      success: true,
      message: "Berhasil menghapus data siswa",
    };
  } catch (error) {
    console.log("Error deleting Siswa:", error);
    throw new Error("Failed to delete siswa");
  }
};
