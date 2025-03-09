"use server";

import { revalidateTag } from "next/cache";
import { AddKelaSchema } from "@/lib/zod";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Tingkat } from "@prisma/client";

export const AddKelas = async (prevState: unknown, formData: FormData) => {
  try {
    // Cek autentikasi
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "ADMIN" && session.user?.role !== "SUPERADMIN")
    ) {
      return {
        error: { server: "Unauthorized" },
      };
    }

    // Validasi input
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

    // Cek kelas yang sudah ada
    const existingKelas = await prisma.kelas.findFirst({
      where: {
        tingkat: tingkat as Tingkat,
        jurusan: jurusanUpper,
      },
    });

    // Jika kelas sudah ada, kembalikan error
    if (existingKelas) {
      return {
        error: {
          server: `Kelas ${tingkat} ${jurusanUpper} sudah ada di database`,
        },
      };
    }

    // Buat kelas baru
    const newKelas = await prisma.kelas.create({
      data: {
        tingkat: tingkat as Tingkat,
        jurusan: jurusanUpper,
      },
    });

    // Revalidate data
    revalidateTag("kelas");

    return {
      success: true,
      data: newKelas,
      message: `Berhasil menambahkan ${tingkat} ${jurusanUpper}`,
    };
  } catch (error) {
    console.error("Error in AddKelas:", error);
    return {
      error: {
        server:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server",
      },
    };
  }
};

// export const AddKelas = async (prevState: unknown, formData: FormData) => {
//   try {
//     const validateFields = AddKelaSchema.safeParse(
//       Object.fromEntries(formData.entries())
//     );

//     if (!validateFields.success) {
//       return {
//         error: validateFields.error.flatten().fieldErrors,
//       };
//     }

//     const { tingkat, jurusan } = validateFields.data;
//     const jurusanUpper = jurusan.toUpperCase();
//     const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

//     const response = await fetch(`${apiUrl}/api/kelas`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         tingkat,
//         jurusan: jurusanUpper,
//       }),
//     });

//     // Periksa respons sebelum parsing JSON
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error("Error response:", errorText);
//       throw new Error(errorText || "Gagal menambahkan data");
//     }

//     const responseData = await response.json();
//     console.log("response", response);
//     console.log("responseData", responseData);

//     return {
//       success: true,
//       data: responseData.data,
//       message: `Berhasil menambahkan ${tingkat} ${jurusanUpper}`,
//     };
//   } catch (error) {
//     console.error("Error in AddKelas:", error);
//     return {
//       error: {
//         server:
//           error instanceof Error
//             ? error.message
//             : "Terjadi kesalahan pada server",
//       },
//     };
//   }
// };

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
