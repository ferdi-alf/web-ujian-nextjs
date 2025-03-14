import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { AddUserSchema } from "@/lib/zod";
import { hash } from "bcrypt-ts";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({
      status: 401,
    });
  }

  const userId = session.user?.id;

  try {
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
    const sessionToken = cookieStore.get("authjs.session-token")?.value;

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

    const { username, role, jurusan, password } = validateFields.data;
    console.log("Data yang diterima:", validateFields.data);
    const hashedPassword = await hash(password, 10);
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

    console.log("Data yang dikirim ke Prisma:", {
      username,
      role,
      jurusan: upperJurusan,
      password: hashedPassword,
    });

    const newUsers = await prisma.user.create({
      data: {
        username,
        role,
        jurusan: upperJurusan,
        password: hashedPassword,
      },
    });

    if (!newUsers) {
      throw new Error("Gagal menambahkan user ke database");
    }
    return NextResponse.json({ succes: true, data: newUsers }, { status: 201 });
  } catch (error) {
    console.error("Error in /api/user:", error);
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
