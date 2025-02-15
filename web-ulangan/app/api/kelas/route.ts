import { AddKelaSchema } from "@/lib/zod";
import { PrismaClient, Tingkat } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteKelas } from "@/lib/crudKelas";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get cookies correctly
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("next-auth.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "No session token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validateFields = AddKelaSchema.safeParse(body);

    if (!validateFields.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          error: validateFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { tingkat, jurusan } = validateFields.data;
    const jurusanUpper = jurusan.toUpperCase();
    const EnumTingkat = tingkat as Tingkat;

    // Check for existing class
    const existingKelas = await prisma.kelas.findFirst({
      where: {
        tingkat: EnumTingkat,
        jurusan: jurusanUpper,
      },
    });

    if (existingKelas) {
      return NextResponse.json(
        {
          message: `Kelas ${tingkat} ${jurusanUpper} sudah ada di database`,
        },
        { status: 409 } // Using 409 Conflict for duplicate resource
      );
    }

    const newKelas = await prisma.kelas.create({
      data: {
        tingkat: EnumTingkat,
        jurusan: jurusanUpper,
      },
    });
    revalidatePath("/kelas");
    return NextResponse.json(
      {
        success: true,
        data: newKelas,
      },

      { status: 201 }
    );
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

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    const ids = data.ids;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    await deleteKelas(ids);

    return NextResponse.json(
      { message: "Kelas successfully deleted" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
