import { Info } from "lucide-react";

const AlertUjian = () => {
  return (
    <div className="border border-gray-800 p-2 rounded-md w-full">
      <h1 className="text-xl font-bold">Daftar Ujian</h1>
      <div className="flex pl-3 flex-col">
        <div className="text-base font-semibold gap-x-1 flex flex-none">
          <p>Harap baca ini </p>
          <span>
            <Info />
          </span>
        </div>
        <ul className="list-disc text-sm pl-4">
          <li className="font-medium">
            Daftar Ujian akan di kelompokkan,{" "}
            <span className="font-normal">
              berdasarkan tingkat X XI XII dan ini bersifat realtime.
            </span>
          </li>
          <li className="font-medium">
            Soal-soal ujian didapatkan dari jadwal ujian{" "}
            <span className="font-normal">yang sudah ditetapkan.</span>
          </li>
          <li className="font-medium">
            Jika sudah menambahkan jadwal ujian, data ujian akan otomatis masuk
            1 jam sebelum ujian dimulai{" "}
          </li>
          <li className="font-normal">
            Harap jangan mengubah status ujian. Status Ujian akan otomatis
            berubah status Pending, Aktif atau Selesai secara Realtime{" "}
            <span className="font-medium">
              sesuai dengan jam yang telah ditentukan pada ujian.
            </span>{" "}
            Dilakukan hanya jika ada siswa yang ketinggalan ujian
          </li>
          <li className="font-normal">
            Harap untuk tidak menambahkan ujian secara manual pada{" "}
            <span className="font-medium">&quot;Tambah Ujian +.&quot; </span>{" "}
            Dilakukan hanya jika ada siswa yang ketinggalan ujian
          </li>
          <li className="font-normal">
            Perlu anda ketahui{" "}
            <span className="font-semibold">token bersifat unik</span> atau{" "}
            <span className="font-semibold">
              Setiap ujian tokennya berbeda atau tidak sama dan minimal 5
              karakter
            </span>{" "}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AlertUjian;
