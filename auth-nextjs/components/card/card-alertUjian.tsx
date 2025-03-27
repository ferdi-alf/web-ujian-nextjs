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
            <span className="font-normal">berdasarkan tingkat X XI XII.</span>
          </li>
          <li className="font-medium">
            Soal-soal ujian didapatkan dari matara pelajaran,{" "}
            <span className="font-normal">yang telah di tambahkan.</span>
          </li>
          <li className="font-medium">
            Saat menambahkan daftar ujian{" "}
            <span className="font-normal">
              token boleh di kosongkan terlebih dahulu dan anda bisa
              menambahkannya dengan menekan panah kebawah pada setaip baris
              table
            </span>
          </li>
          <li className="font-normal">
            Perlu anda ketahui{" "}
            <span className="font-semibold">token bersifat unik</span> atau{" "}
            <span className="font-semibold">
              Setiap ujian tokennya berbeda dan tidak sama
            </span>{" "}
          </li>
          <li className="font-medium">Token harus minimal 5 karakter </li>
        </ul>
      </div>
    </div>
  );
};

export default AlertUjian;
