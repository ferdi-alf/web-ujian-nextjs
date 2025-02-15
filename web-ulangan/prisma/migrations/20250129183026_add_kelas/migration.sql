-- CreateEnum
CREATE TYPE "Tingkat" AS ENUM ('X', 'XI', 'XII');

-- CreateTable
CREATE TABLE "kelas" (
    "id" TEXT NOT NULL,
    "tingkat" "Tingkat" NOT NULL,
    "jurusan" TEXT,

    CONSTRAINT "kelas_pkey" PRIMARY KEY ("id")
);
