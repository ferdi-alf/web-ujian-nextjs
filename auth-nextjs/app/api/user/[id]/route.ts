/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { UpdateUsersSchema } from "@/lib/zod";
import { hash } from "bcrypt-ts";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: any) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("authjs.session-token")?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { message: "No session token found" },
      { status: 401 }
    );
  }
  try {
    const id = await params?.id;
    if (!id) {
      return NextResponse.json(
        { message: "ID tidak ditemukan" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validateFields = UpdateUsersSchema.safeParse(body);
    console.log("Received data:", body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { username, role, jurusan, password } = validateFields.data;

    const updateData: any = {
      username,
      role,
    };

    if (role === "ADMIN") {
      updateData.jurusan = null;
    } else if (jurusan) {
      const upperJurusan = jurusan ? jurusan.toUpperCase() : undefined;

      const existingKelas = await prisma.kelas.findFirst({
        where: {
          jurusan: {
            contains: upperJurusan,
            mode: "insensitive",
          },
        },
      });
      if (!existingKelas) {
        return NextResponse.json(
          {
            message: "Jurusan tidak ditemukan",
            error: {
              jurusan: "Jurusan tidak valid",
            },
          },
          { status: 404 }
        );
      }

      updateData.jurusan = jurusan;
    }

    // Cek password jika ada dan bukan string kosong
    if (password && password.length > 0) {
      updateData.password = await hash(password, 10);
    }

    const updateUser = await prisma.user.update({
      where: {
        id: id,
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
