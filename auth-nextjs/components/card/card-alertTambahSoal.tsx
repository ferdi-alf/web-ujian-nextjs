import { Info } from "lucide-react";

const AlertTambahSoal = () => {
  return (
    <div className="border border-gray-800 p-2 rounded-md w-full">
      <h1 className="text-xl font-bold">Tambah Data Soal</h1>
      <div className="flex pl-3 flex-col">
        <div className="text-base font-semibold gap-x-1 flex flex-none">
          <p>Harap baca ini sebelum menambah data</p>
          <span>
            <Info />
          </span>
        </div>
        <ul className="list-disc text-sm pl-4">
          <li className="font-medium">
            Pastikan Anda telah memilih tingkat dan mengisi nama mata pelajaran{" "}
            <span className="font-normal"> sebelum memasukkan data soal.</span>
          </li>
          <li className="font-medium">
            Tingkat menentukan ujian{" "}
            <span className="font-normal">
              ditunjukan untuk siswa tingkat berapa nantinya
            </span>
          </li>
          <li className="font-medium">
            Ketika sudah mengisi jawaban field{" "}
            <span className="font-normal">
              harap pilih input jawaban untuk menandai jawaban yang benar
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

export default AlertTambahSoal;
