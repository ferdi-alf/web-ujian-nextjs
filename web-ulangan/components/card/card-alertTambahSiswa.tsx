import { Info } from "lucide-react";

const CardAlert = () => {
  return (
    <div className="border border-gray-800 p-2 rounded-md w-full">
      <h1 className="text-xl font-bold">Tambah Data Siswa</h1>
      <div className="flex pl-3 flex-col">
        <div className="text-base font-semibold gap-x-1 flex flex-none">
          <p>Harap baca ini sebelum menambah data</p>
          <span>
            <Info />
          </span>
        </div>
        <ul className="list-disc text-sm pl-4">
          <li className="font-medium">
            Harap pilih kelas{" "}
            <span className="font-normal">siswa sebelum memasukkan data.</span>
          </li>
          <li className="font-medium">
            Kelas digunakan untuk mengelompokkan siswa dalam satu kelas,{" "}
            <span className="font-normal">
              sehingga data tersimpan dengan benar.
            </span>
          </li>
          <li className="font-normal">
            Anda dapat{" "}
            <span className="font-semibold">memasukkan data secara manual</span>{" "}
            atau <span className="font-semibold">mengunggah file Excel</span>{" "}
            untuk input yang lebih cepat.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CardAlert;
