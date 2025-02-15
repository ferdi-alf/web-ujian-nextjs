import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { AddUserSchema } from "@/lib/zod";
import { hash } from "bcrypt-ts";
import { revalidatePath } from "next/cache";

export async function GET() {
  // Ambil session untuk mengecek apakah pengguna sudah login
  const session = await auth();

  // Jika tidak ada session, beri respons Unauthorized
  if (!session) {
    return NextResponse.json({
      status: 401,
      message: "Unauthorized",
    });
  }

  const userId = session.user?.id;

  try {
    // Jika tidak ada parameter 'id', ambil data user yang sedang login
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({
        status: 404,
        message: "User Not Found",
        data: "No user found for the logged-in session",
      });
    }

    // Kirimkan data user
    const userData = {
      username: user.username,
      role: user.role,
      image: user.image,
    };

    return NextResponse.json({
      status: 200,
      message: "Success",
      data: userData,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json({
      status: 500,
      message: "Internal Server Error",
      data: "An error occurred while fetching user data.",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("next-auth.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "No session token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validateFields = AddUserSchema.safeParse(body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
        },
        {
          status: 400,
        }
      );
    }

    const { username, role, kelasId, password } = validateFields.data;
    const hashedPassword = await hash(password, 10);

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

    const newUsers = await prisma.user.create({
      data: {
        username,
        role,
        kelasId,
        password: hashedPassword,
      },
    });
    revalidatePath("/users");
    return NextResponse.json({ succes: true, data: newUsers }, { status: 201 });
  } catch (error) {
    console.error("Error in /api/kelas:", error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan pada server",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
