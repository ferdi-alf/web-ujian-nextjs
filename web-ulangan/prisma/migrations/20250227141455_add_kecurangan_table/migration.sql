/*
  Warnings:

  - A unique constraint covering the columns `[siswaDetailId,ujianId]` on the table `hasil` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TypeKecurangan" AS ENUM ('blurred', 'tabHidden', 'floatingWindow', 'splitScreen');

-- CreateTable
CREATE TABLE "Kecurangan" (
    "id" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "siswaDetailId" TEXT,
    "type" "TypeKecurangan" NOT NULL,

    CONSTRAINT "Kecurangan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hasil_siswaDetailId_ujianId_key" ON "hasil"("siswaDetailId", "ujianId");

-- AddForeignKey
ALTER TABLE "Kecurangan" ADD CONSTRAINT "Kecurangan_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kecurangan" ADD CONSTRAINT "Kecurangan_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kecurangan" ADD CONSTRAINT "Kecurangan_siswaDetailId_ujianId_fkey" FOREIGN KEY ("siswaDetailId", "ujianId") REFERENCES "hasil"("siswaDetailId", "ujianId") ON DELETE RESTRICT ON UPDATE CASCADE;
