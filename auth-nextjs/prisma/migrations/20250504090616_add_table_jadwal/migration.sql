-- AlterTable
ALTER TABLE "ujian" ADD COLUMN     "sesiId" TEXT;

-- CreateTable
CREATE TABLE "jadwal" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "tingkat" "Tingkat" NOT NULL,

    CONSTRAINT "jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesi" (
    "id" TEXT NOT NULL,
    "sesi" INTEGER NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "jadwalId" TEXT NOT NULL,

    CONSTRAINT "sesi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "jadwal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ujian" ADD CONSTRAINT "ujian_sesiId_fkey" FOREIGN KEY ("sesiId") REFERENCES "sesi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
