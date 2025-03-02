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

-- AddForeignKey
ALTER TABLE "jawaban_siswa" ADD CONSTRAINT "jawaban_siswa_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jawaban_siswa" ADD CONSTRAINT "jawaban_siswa_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
