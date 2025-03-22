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
    const upperJurusan = jurusan ? jurusan.toUpperCase() : undefined;

    // Check if the user exists and get current role
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { proktorDetail: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validate jurusan if provided
    if (upperJurusan) {
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
    }

    // Handle ADMIN role (cannot have jurusan)
    if (role === "ADMIN" && upperJurusan) {
      return NextResponse.json(
        {
          error: true,
          message:
            "Admin tidak boleh memiliki jurusan. Jurusan hanya dimiliki Proktor",
          status: 400,
        },
        { status: 400 }
      );
    }

    // Prepare user update data
    const userUpdateData: any = { username, role };

    if (password && password.length > 0) {
      userUpdateData.password = await hash(password, 10);
    }

    // Use transaction to handle both user and proktorDetail updates
    const result = await prisma.$transaction(async (tx) => {
      // Update user data
      const updatedUser = await tx.user.update({
        where: { id },
        data: userUpdateData,
      });

      // Handle proktorDetail based on role
      if (role === "PROKTOR") {
        // Check if proktorDetail exists
        if (existingUser.proktorDetail) {
          // Update existing proktorDetail
          await tx.proktorDetail.update({
            where: { userId: id },
            data: {
              jurusan: upperJurusan || existingUser.proktorDetail.jurusan,
            },
          });
        } else {
          // Create new proktorDetail
          await tx.proktorDetail.create({
            data: {
              userId: id,
              jurusan: upperJurusan || null,
            },
          });
        }
      }

      return updatedUser;
    });

    revalidatePath("/users");

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/user/[id]:", error);
    return NextResponse.json(
      {
        message: "Terjadi Kesalahan pada server",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
