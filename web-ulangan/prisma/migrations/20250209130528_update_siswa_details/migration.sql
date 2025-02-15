/*
  Warnings:

  - You are about to drop the column `tanggalLahir` on the `siswa_detail` table. All the data in the column will be lost.
  - Added the required column `kelamin` to the `siswa_detail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nis` to the `siswa_detail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomor_ujian` to the `siswa_detail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ruang` to the `siswa_detail` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Kelamin" AS ENUM ('L', 'P');

-- AlterTable
ALTER TABLE "siswa_detail" DROP COLUMN "tanggalLahir",
ADD COLUMN     "kelamin" "Kelamin" NOT NULL,
ADD COLUMN     "nis" TEXT NOT NULL,
ADD COLUMN     "nomor_ujian" TEXT NOT NULL,
ADD COLUMN     "ruang" TEXT NOT NULL;
