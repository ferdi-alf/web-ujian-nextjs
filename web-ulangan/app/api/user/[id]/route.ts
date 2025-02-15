/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { UpdateUsersSchema } from "@/lib/zod";
import { hash } from "bcrypt-ts";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("next-auth.session-token")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { message: "No session token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validateFields = UpdateUsersSchema.safeParse(body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { username, role, kelasId, password } = validateFields.data;

    // Buat updateData terlebih dahulu
    const updateData: any = {
      username,
      role,
    };

    // Cek kelasId jika ada
    if (role === "ADMIN") {
      updateData.kelasId = null; // Set kelasId to null to remove the relation
    } else if (kelasId) {
      // Only check and update kelasId if role is not ADMIN
      const existingKelas = await prisma.kelas.findFirst({
        where: {
          id: kelasId,
        },
      });

      if (!existingKelas) {
        return NextResponse.json(
          {
            message: "Kelas tidak ditemukan",
            error: {
              kelasId: "ID kelas tidak valid",
            },
          },
          { status: 404 }
        );
      }

      updateData.kelasId = kelasId;
    }

    // Cek password jika ada dan bukan string kosong
    if (password && password.length > 0) {
      updateData.password = await hash(password, 10);
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
