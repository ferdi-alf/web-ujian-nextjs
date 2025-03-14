-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_kelasId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "jurusan" TEXT;
