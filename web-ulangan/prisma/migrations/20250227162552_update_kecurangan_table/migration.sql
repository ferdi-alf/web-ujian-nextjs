/*
  Warnings:

  - You are about to drop the `Kecurangan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Kecurangan" DROP CONSTRAINT "Kecurangan_siswaDetailId_fkey";

-- DropForeignKey
ALTER TABLE "Kecurangan" DROP CONSTRAINT "Kecurangan_siswaDetailId_ujianId_fkey";

-- DropForeignKey
ALTER TABLE "Kecurangan" DROP CONSTRAINT "Kecurangan_ujianId_fkey";

-- DropTable
DROP TABLE "Kecurangan";

-- CreateTable
CREATE TABLE "kecurangan" (
    "id" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "siswaDetailId" TEXT,
    "type" "TypeKecurangan" NOT NULL,

    CONSTRAINT "kecurangan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "kecurangan" ADD CONSTRAINT "kecurangan_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecurangan" ADD CONSTRAINT "kecurangan_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecurangan" ADD CONSTRAINT "kecurangan_siswaDetailId_ujianId_fkey" FOREIGN KEY ("siswaDetailId", "ujianId") REFERENCES "hasil"("siswaDetailId", "ujianId") ON DELETE RESTRICT ON UPDATE CASCADE;
