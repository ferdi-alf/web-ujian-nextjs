import { Info } from "lucide-react";

const CardHasil = () => {
  return (
    <div className="border border-gray-800 p-2 rounded-md w-full">
      <h1 className="text-xl font-bold">Data Hasil Ujian</h1>
      <div className="flex pl-3 flex-col">
        <div className="text-base font-semibold gap-x-1 flex flex-none">
          <p>Harap baca petunjuk berikut:</p>
          <span>
            <Info />
          </span>
        </div>
        <ul className="list-disc text-sm pl-4">
          <li className="font-medium">
            Hasil ujian akan dikelompokkan berdasarkan{" "}
            <span className="font-normal">tingkat dan mata pelajaran.</span>
          </li>
          <li className="font-medium">
            Setiap ujian akan ditampilkan sesuai dengan{" "}
            <span className="font-normal">
              nama mata pelajaran yang diujikan.
            </span>
          </li>
          <li className="font-medium">
            Pada halaman detail, Anda dapat melihat{" "}
            <span className="font-normal">
              daftar kelas yang telah mengerjakan ujian tersebut.
            </span>
          </li>
          <li className="font-medium">
            Klik kelas untuk melihat{" "}
            <span className="font-normal">
              daftar siswa beserta nilai mereka dalam ujian tersebut.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CardHasil;
