import { Users } from "lucide-react";
import Card from "../fragments/card";

const CardAdmin = () => {
  return (
    <>
      <Card
        title="Total Siswa"
        icon={Users}
        data="300"
        description="Total data siswa"
      />
      <Card
        title="Total Sudah Login"
        icon={Users}
        data="300"
        description="Total Siswa Sudah Login"
      />
      <Card
        title="Total Belum Login"
        icon={Users}
        data="300"
        description="Total data siswa belum login"
      />
      <Card
        title="Total Selesai Ujian"
        icon={Users}
        data="300"
        description="Total data siswa Selesai Ujian"
      />
    </>
  );
};

export default CardAdmin;
