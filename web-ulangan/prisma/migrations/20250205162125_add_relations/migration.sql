/*
  Warnings:

  - You are about to drop the `SiswaDetail` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SiswaDetail" DROP CONSTRAINT "SiswaDetail_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kelasId" TEXT NOT NULL DEFAULT 'default_kelas_id';

-- DropTable
DROP TABLE "SiswaDetail";

-- CreateTable
CREATE TABLE "siswa_detail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "tanggalLahir" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "siswa_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "siswa_detail_userId_key" ON "siswa_detail"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siswa_detail" ADD CONSTRAINT "siswa_detail_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siswa_detail" ADD CONSTRAINT "siswa_detail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
