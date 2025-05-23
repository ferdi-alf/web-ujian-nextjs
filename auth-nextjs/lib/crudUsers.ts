"use server";
import { auth } from "@/auth";
import {
  AddUserSchema,
  UpdateUsersSchema,
  UpdatProfileSchema,
} from "@/lib/zod";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const AddUser = async (prevState: unknown, formData: FormData) => {
  try {
    const validateFields = AddUserSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
      };
    }

    const { username, role, jurusan, password } = validateFields.data;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("authjs.session-token");

    const response = await fetch(`${apiUrl}/api/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `authjs.session-token=${sessionCookie?.value}`,
      },
      body: JSON.stringify({ username, role, jurusan, password }),
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Gagal menambahkan data");
    }

    revalidateTag("users");

    return {
      success: true,
      data: responseData.data,
      message: "Berhasil menambahkan users",
    };
  } catch (error) {
    console.error("Error in AddUser:", error);
    return {
      error: {
        server: (error as Error).message || "Terjadi kesalahan pada server",
      },
    };
  }
};

export const getUsers = async () => {
  const session = await auth();

  // Cek apakah user memiliki role yang sesuai
  const notRole = !(
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
  );

  if (!session || notRole) {
    redirect("/dashboard");
  }

  try {
    // Ambil user dengan role "ADMIN" atau "PROKTOR"
    const admin = await prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "PROKTOR"],
        },
      },
      include: {
        proktorDetail: true,
      },
    });

    return admin;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const deleteUsers = async (ids: string[]) => {
  const session = await auth();
  const notRole = !(
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN"
  );

  if (!session || notRole) {
    throw new Error("Unauthoaized");
  }

  try {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    revalidateTag("users");
    return {
      success: true,
      message: "Berhasil menghapus data Users",
    };
  } catch (error) {
    console.log("Error deleting Users:", error);
    throw new Error("Failed to delete Users");
  }
};

export const updateUsers = async (prevState: unknown, formData: FormData) => {
  const apiUrl = process.env.NEXT_URL_API_URL || "http://localhost:3000";
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("authjs.session-token");
  try {
    const validateFields = UpdateUsersSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
      };
    }

    const { id, username, role, jurusan, password } = validateFields.data;

    const bodyData = {
      id,
      username,
      role,
      ...(jurusan && { jurusan }),
      ...(password && { password }),
    };

    const response = await fetch(`${apiUrl}/api/user/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `authjs.session-token=${sessionCookie?.value}`,
      },
      body: JSON.stringify(bodyData),
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Gagal mengupdate data");
    }

    revalidateTag("users");

    return {
      success: true,
      data: responseData.data,
      message: "Berhasil mengupdate data",
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

export const updateProfile = async (prevState: unknown, formData: FormData) => {
  try {
    const file = formData.get("image") as File;
    if (file && file.size === 0) {
      formData.delete("image");
    }

    const session = await auth();
    const idUser = session?.user?.id;

    // Ambil semua data dari FormData
    const name = formData.get("name") as string;
    const oldPassword = formData.get("oldPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Buat objek data untuk validasi
    const validationData = {
      id: idUser,
      username: name,
      ...(oldPassword && { oldPassword: oldPassword }),
      ...(newPassword && { newPassword: newPassword }),
      ...(confirmPassword && { confirmPassword: confirmPassword }),
    };

    const validateFields = UpdatProfileSchema.safeParse(validationData);

    if (!validateFields.success) {
      return {
        error: validateFields.error.flatten().fieldErrors,
      };
    }

    console.log("Validated data:", validateFields.data);

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("authjs.session-token");
    const apiUrl = process.env.NEXT_URL_API_URL || "http://localhost:3000";

    // Kirim data ke API
    const response = await fetch(`${apiUrl}/api/update-profile/${idUser}`, {
      method: "PUT",
      headers: {
        Cookie: `authjs.session-token=${sessionCookie?.value}`,
      },
      body: formData,
      credentials: "include",
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (responseData.error && typeof responseData.error === "object") {
        return {
          error: responseData.error,
        };
      }
      throw new Error(responseData.message || "Gagal mengupdate data");
    }

    return {
      success: true,
      data: responseData.data,
      message: "Berhasil Mengupdate Data",
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
