-- CreateTable
CREATE TABLE "hasil" (
    "id" TEXT NOT NULL,
    "siswaDetailId" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "waktuPengerjaan" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "benar" TEXT NOT NULL,
    "salah" TEXT NOT NULL,

    CONSTRAINT "hasil_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_siswaDetailId_fkey" FOREIGN KEY ("siswaDetailId") REFERENCES "siswa_detail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "ujian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
