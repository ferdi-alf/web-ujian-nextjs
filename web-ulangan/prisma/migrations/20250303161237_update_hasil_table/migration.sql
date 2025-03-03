-- DropForeignKey
ALTER TABLE "hasil" DROP CONSTRAINT "hasil_ujianId_fkey";

-- AddForeignKey
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
