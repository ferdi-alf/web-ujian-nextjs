import { Info } from "lucide-react";

const AlertDataSoal = () => {
  return (
    <div className="border border-gray-800 p-2 rounded-md w-full">
      <h1 className="text-xl font-bold">Data Soal</h1>
      <div className="flex pl-3 flex-col">
        <div className="text-base font-semibold gap-x-1 flex flex-none">
          <p>Harap baca ini </p>
          <span>
            <Info />
          </span>
        </div>
        <ul className="list-disc text-sm pl-4">
          <li className="font-medium">
            Setiap data soal{" "}
            <span className="font-normal">
              akan dikelompokan sesuai Tingkat.
            </span>
          </li>
          <li className="font-medium">
            Soal akan di kelompokkan,{" "}
            <span className="font-normal">sesuai tingkat X XI XII.</span>
          </li>
          <li className="font-medium">
            Jika ingin menambahkan soal pada mata pelajaran tertentu,{" "}
            <span className="font-normal">
              pergi ke tambah-soal dengan memasukan tingkat dan mata pelajaran
              yang sama dengan yang anda ingin tambahkan
            </span>
          </li>
          <li className="font-normal">
            Anda dapat{" "}
            <span className="font-semibold">melihat detail soal</span> dengan{" "}
            <span className="font-semibold"> menekan Details</span> di table
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AlertDataSoal;
