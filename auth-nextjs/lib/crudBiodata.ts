"use server";

import { cookies } from "next/headers";
import { AddBiodataSchema } from "./zod";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

export const AddBiodata = async (prevState: unknown, formData: FormData) => {
  try {
    const validateFields = AddBiodataSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validateFields.success) {
      return {
        error: validateFields.error?.flatten().fieldErrors,
      };
    }

    const { id, namaSekolah, kepalaSekolah, nipKepalaSekolah, alamatSekolah } =
      validateFields.data;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("authjs.session-token");

    const method = id ? "PUT" : "POST"; // Jika ada ID, gunakan PUT untuk update

    const response = await fetch(`${apiUrl}/api/biodata-sekolah`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Cookie: `authjs.session-token=${sessionCookie?.value}`,
      },
      body: JSON.stringify({
        id,
        namaSekolah,
        kepalaSekolah,
        nipKepalaSekolah,
        alamatSekolah,
      }),
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Gagal memperbarui data");
    }

    return {
      succes: true,
      data: responseData.data,
      message: responseData.message,
    };
  } catch (error) {
    console.log(error);
  }
};

export const getBiodata = async () => {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  try {
    const biodata = await prisma.biodataSekolah.findFirst(); // Ambil data pertama jika ada

    return biodata || {}; // Jika tidak ada, kembalikan objek kosong
  } catch (error) {
    console.error("Error fetching biodata:", error);
    return [];
  }
};
