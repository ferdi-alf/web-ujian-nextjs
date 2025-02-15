"use server";

import { revalidateTag } from "next/cache";
import { AddKelaSchema } from "@/lib/zod";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const AddKelas = async (prevState: unknown, formData: FormData) => {
  try {
    const validateFields = AddKelaSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
      };
    }

    const { tingkat, jurusan } = validateFields.data;
    const jurusanUpper = jurusan.toUpperCase();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // Get cookies correctly
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("next-auth.session-token");

    const response = await fetch(`${apiUrl}/api/kelas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `next-auth.session-token=${sessionCookie?.value}`,
      },
      body: JSON.stringify({ tingkat, jurusan: jurusanUpper }),
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Gagal menambahkan data");
    }

    revalidateTag("kelas");

    return {
      success: true,
      data: responseData.data,
      message: `Berhasil menambahkan ${tingkat} ${jurusanUpper}`,
    };
  } catch (error) {
    console.error("Error in AddKelas:", error);
    return {
      error: {
        server: (error as Error).message || "Terjadi kesalahan pada server",
      },
    };
  }
};

export const getKelas = async () => {
  const session = await auth();

  const notRole = !(
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
  );

  if (!session || notRole) {
    redirect("/dashboard");
  }

  try {
    const kelas = await prisma.kelas.findMany();
    return kelas;
  } catch (error) {
    console.error(error);
    return []; // Return an empty array if there's an error
  }
};

export const deleteKelas = async (ids: string[]) => {
  const session = await auth();

  // Check user role
  const notRole = !(
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
  );

  if (!session || notRole) {
    throw new Error("Unauthorized");
  }

  try {
    // Use Prisma to delete multiple records
    await prisma.kelas.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    revalidateTag("kelas");
    return { success: true, message: "Kelas berhasil dihapus" };
  } catch (error) {
    console.error("Error deleting kelas:", error);
    throw new Error("Failed to delete kelas");
  }
};
