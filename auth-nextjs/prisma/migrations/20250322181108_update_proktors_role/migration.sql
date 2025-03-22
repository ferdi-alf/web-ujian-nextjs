/*
  Warnings:

  - You are about to drop the column `jurusan` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "jurusan";

-- CreateTable
CREATE TABLE "proktor_detail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jurusan" TEXT,
    "Nip" TEXT,
    "name" TEXT,

    CONSTRAINT "proktor_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proktor_detail_userId_key" ON "proktor_detail"("userId");

-- AddForeignKey
ALTER TABLE "proktor_detail" ADD CONSTRAINT "proktor_detail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
