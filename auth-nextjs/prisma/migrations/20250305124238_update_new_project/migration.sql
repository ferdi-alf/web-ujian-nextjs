/*
  Warnings:

  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('OFFLINE', 'ONLINE', 'UJIAN', 'SELESAI_UJIAN');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SISWA', 'PROKTOR', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "Kelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "Tingkat" AS ENUM ('X', 'XI', 'XII');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'active', 'selesai');

-- CreateEnum
CREATE TYPE "TypeKecurangan" AS ENUM ('blurred', 'tabHidden', 'floatingWindow', 'splitScreen');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kelasId" TEXT,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "loginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'OFFLINE',
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'SISWA';

-- DropTable
DROP TABLE "Product";

-- CreateTable
CREATE TABLE "siswa_detail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "kelamin" "Kelamin" NOT NULL,
    "nis" TEXT NOT NULL,
    "nomor_ujian" TEXT NOT NULL,
    "ruang" TEXT NOT NULL,

    CONSTRAINT "siswa_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelas" (
    "id" TEXT NOT NULL,
    "tingkat" "Tingkat" NOT NULL,
    "jurusan" TEXT,

    CONSTRAINT "kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mata_pelajaran" (
    "id" TEXT NOT NULL,
    "tingkat" "Tingkat" NOT NULL,
    "pelajaran" TEXT NOT NULL,

    CONSTRAINT "mata_pelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soal" (
    "id" TEXT NOT NULL,
    "gambar" TEXT,
    "soal" TEXT NOT NULL,
    "mataPelajaranId" TEXT NOT NULL,

    CONSTRAINT "soal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jawaban" (
    "id" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "jawaban" TEXT NOT NULL,
    "benar" BOOLEAN NOT NULL,

    CONSTRAINT "jawaban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ujian" (
    "id" TEXT NOT NULL,
    "mataPelajaranId" TEXT NOT NULL,
    "token" TEXT,
    "waktuPengerjaan" INTEGER NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'pending',

    CONSTRAINT "ujian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil" (
    "id" TEXT NOT NULL,
    "siswaDetailId" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "waktuPengerjaan" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "benar" TEXT NOT NULL,
    "salah" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hasil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kecurangan" (
    "id" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "siswaDetailId" TEXT,
    "type" "TypeKecurangan" NOT NULL,

    CONSTRAINT "kecurangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jawaban_siswa" (
    "id" TEXT NOT NULL,
    "siswaDetailId" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "jawabanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jawaban_siswa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "siswa_detail_userId_key" ON "siswa_detail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ujian_token_key" ON "ujian"("token");

-- CreateIndex
CREATE UNIQUE INDEX "hasil_siswaDetailId_ujianId_key" ON "hasil"("siswaDetailId", "ujianId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siswa_detail" ADD CONSTRAINT "siswa_detail_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siswa_detail" ADD CONSTRAINT "siswa_detail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soal" ADD CONSTRAINT "soal_mataPelajaranId_fkey" FOREIGN KEY ("mataPelajaranId") REFERENCES "mata_pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jawaban" ADD CONSTRAINT "jawaban_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "soal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ujian" ADD CONSTRAINT "ujian_mataPelajaranId_fkey" FOREIGN KEY ("mataPelajaranId") REFERENCES "mata_pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecurangan" ADD CONSTRAINT "kecurangan_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecurangan" ADD CONSTRAINT "kecurangan_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jawaban_siswa" ADD CONSTRAINT "jawaban_siswa_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jawaban_siswa" ADD CONSTRAINT "jawaban_siswa_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
