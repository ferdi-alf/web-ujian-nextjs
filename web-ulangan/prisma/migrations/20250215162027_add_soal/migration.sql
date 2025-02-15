-- CreateTable
CREATE TABLE "mata_pelajaran" (
    "id" TEXT NOT NULL,
    "tingkat" "Tingkat" NOT NULL,
    "pelajaran" TEXT NOT NULL,

    CONSTRAINT "mata_pelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soal" (
    "id" TEXT NOT NULL,
    "gambar" TEXT,
    "soal" TEXT NOT NULL,
    "mataPelajaranId" TEXT NOT NULL,

    CONSTRAINT "soal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jawaban" (
    "id" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "jawaban" TEXT NOT NULL,
    "benar" BOOLEAN NOT NULL,

    CONSTRAINT "jawaban_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "soal" ADD CONSTRAINT "soal_mataPelajaranId_fkey" FOREIGN KEY ("mataPelajaranId") REFERENCES "mata_pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jawaban" ADD CONSTRAINT "jawaban_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "soal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
