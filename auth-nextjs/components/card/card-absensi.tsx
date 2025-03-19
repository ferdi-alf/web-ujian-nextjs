import { Info } from "lucide-react";

const CardDataAbsensi = () => {
  return (
    <div className="border border-gray-800 p-2 rounded-md w-full">
      <h1 className="text-xl font-bold">Data Absensi</h1>
      <div className="flex pl-3 flex-col">
        <div className="text-base font-semibold gap-x-1 flex flex-none">
          <p>Harap baca ini </p>
          <span>
            <Info />
          </span>
        </div>
        <ul className="list-disc text-sm pl-4">
          <li className="font-medium">
            Harap periksa data{" "}
            <span className="font-normal">
              Setelah ujian selesai agar tidak ada kesalahan data
            </span>
          </li>
          <li className="font-medium">
            Data absensi akan direfresh{" "}
            <span className="font-normal">setiap hari.</span>
          </li>
          <li className="font-normal">
            Anda dapat{" "}
            <span className="font-semibold">
              Mendownload seluruh data absensi siswa
            </span>{" "}
            sekaligus
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CardDataAbsensi;
