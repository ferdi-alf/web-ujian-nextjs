-- DropForeignKey
ALTER TABLE "hasil" DROP CONSTRAINT "hasil_siswaDetailId_fkey";

-- DropForeignKey
ALTER TABLE "jawaban_siswa" DROP CONSTRAINT "jawaban_siswa_siswaDetailId_fkey";

-- DropForeignKey
ALTER TABLE "jawaban_siswa" DROP CONSTRAINT "jawaban_siswa_ujianId_fkey";

-- AddForeignKey
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jawaban_siswa" ADD CONSTRAINT "jawaban_siswa_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jawaban_siswa" ADD CONSTRAINT "jawaban_siswa_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
