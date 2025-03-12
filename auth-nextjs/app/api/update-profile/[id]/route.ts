/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { UpdatProfileSchema } from "@/lib/zod";
import { compareSync, hash } from "bcrypt-ts";
import { writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("authjs.session-token")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "No session token found" },
        { status: 401 }
      );
    }

    const { id } = await params;
    // Handle FormData, bukan JSON
    const formData = await request.formData();

    // Ekstrak data dari FormData
    const username = formData.get("name") as string;
    const oldPassword = formData.get("oldPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validasi data
    const validateFields = UpdatProfileSchema.safeParse({
      id,
      username,
      ...(newPassword && { newPassword }),
      ...(oldPassword && { oldPassword }),
      ...(confirmPassword && { confirmPassword }),
    });

    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.log("Validated data:", validateFields.data);

    // Buat updateData terlebih dahulu
    const updateData: any = {
      username,
    };

    let imageUrl: string | undefined;
    const file = formData.get("image") as File;
    if (file && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), "public");
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${uniqueSuffix}-${file.name}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);
        imageUrl = `/${filename}`;

        // Tambahkan URL gambar ke data update
        updateData.image = imageUrl;
      } catch (error) {
        return NextResponse.json(
          { message: "Error saving image", error },
          { status: 500 }
        );
      }
    }

    // Cek kelasId jika ada

    // Cek password jika ada dan bukan string kosong
    if (newPassword && newPassword.length > 0) {
      // Verifikasi old password jika disediakan
      if (oldPassword) {
        // Ambil user dari database untuk memeriksa password
        const currentUser = await prisma.user.findUnique({
          where: {
            id: params.id,
          },
          select: {
            password: true,
          },
        });

        if (!currentUser) {
          return NextResponse.json(
            { message: "User tidak ditemukan" },
            { status: 404 }
          );
        }

        // Verifikasi password lama
        const isOldPasswordValid = await compareSync(
          oldPassword,
          currentUser.password as string
        );

        if (!isOldPasswordValid) {
          return NextResponse.json(
            {
              message: "Password lama tidak sesuai",
              error: {
                oldPassword: ["Password lama tidak sesuai"],
              },
            },
            { status: 400 }
          );
        }
      } else {
        // Jika newPassword disediakan tetapi oldPassword tidak
        return NextResponse.json(
          {
            message: "Password lama diperlukan untuk mengubah password",
            error: {
              oldPassword: ["Password lama harus diisi"],
            },
          },
          { status: 400 }
        );
      }

      // Verifikasi confirmPassword
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          {
            message: "Konfirmasi password tidak sesuai",
            error: {
              confirmPassword: [
                "Konfirmasi password tidak sesuai dengan password baru",
              ],
            },
          },
          { status: 400 }
        );
      }

      // Hash password baru
      updateData.password = await hash(newPassword, 10);
    }

    const updateUser = await prisma.user.update({
      where: {
        id: params.id,
      },
      data: updateData,
    });

    revalidatePath("/users");

    return NextResponse.json(
      { success: true, data: updateUser },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/user/[id]:", error);
    return NextResponse.json(
      {
        message: "Terjadi Kesalahan pada server",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
