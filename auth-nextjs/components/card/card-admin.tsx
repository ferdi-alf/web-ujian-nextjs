import { BookAIcon, NotebookText, School, Users } from "lucide-react";
import Card from "../fragments/card";
import {
  getTotalKelas,
  getTotalSiswa,
  getTotalSoal,
  getTotalUjianActive,
} from "@/lib/countCard";

const CardAdmin = async () => {
  const totalSiswa = await getTotalSiswa();
  const totalUjianActive = await getTotalUjianActive();
  const totalSoal = await getTotalSoal();
  const totalKelas = await getTotalKelas();
  return (
    <>
      <Card
        title="Total Siswa"
        icon={Users}
        data={totalSiswa.toString()}
        description="Total Data Siswa"
      />
      <Card
        title="Total Ujian Active"
        icon={BookAIcon}
        data={totalUjianActive.toString()}
        description="Total Ujian Active"
      />
      <Card
        title="Total Soal"
        icon={NotebookText}
        data={totalSoal.toString()}
        description="Total Data Soal Ujian"
      />
      <Card
        title="Total Kelas"
        icon={School}
        data={totalKelas.toString()}
        description="Total Data Kelas"
      />
    </>
  );
};

export default CardAdmin;
