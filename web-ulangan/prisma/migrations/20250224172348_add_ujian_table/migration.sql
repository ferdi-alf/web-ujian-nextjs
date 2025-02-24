-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'active', 'selesai');

-- CreateTable
CREATE TABLE "ujian" (
    "id" TEXT NOT NULL,
    "mataPelajaranId" TEXT NOT NULL,
    "token" TEXT,
    "waktuPengerjaan" INTEGER NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'pending',

    CONSTRAINT "ujian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ujian_token_key" ON "ujian"("token");

-- AddForeignKey
ALTER TABLE "ujian" ADD CONSTRAINT "ujian_mataPelajaranId_fkey" FOREIGN KEY ("mataPelajaranId") REFERENCES "mata_pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
