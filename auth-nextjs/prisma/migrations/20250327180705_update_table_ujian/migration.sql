-- AlterTable
ALTER TABLE "ujian" ALTER COLUMN "jamMulai" DROP DEFAULT,
ALTER COLUMN "jamMulai" SET DATA TYPE TIME,
ALTER COLUMN "jamSelesai" DROP DEFAULT,
ALTER COLUMN "jamSelesai" SET DATA TYPE TIME;
