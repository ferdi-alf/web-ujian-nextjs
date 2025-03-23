/*
  Warnings:

  - You are about to drop the `BiodataSeklah` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "BiodataSeklah";

-- CreateTable
CREATE TABLE "biodata_sekolah" (
    "id" TEXT NOT NULL,
    "namaSekolah" TEXT,
    "kepalaSekolah" TEXT,
    "NipKepalaSekolah" TEXT,
    "alamat" TEXT,

    CONSTRAINT "biodata_sekolah_pkey" PRIMARY KEY ("id")
);
