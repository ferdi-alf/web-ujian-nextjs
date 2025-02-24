"use server";

import { auth } from "@/auth";
import { AddUjian } from "@/lib/zod";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

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
    const response = await fetch(`${url}/api/ujian`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
