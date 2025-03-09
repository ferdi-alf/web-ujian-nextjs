import { Info } from "lucide-react";

const AlertDataSiswa = () => {
  return (
    <div className="border border-gray-800 p-2 rounded-md w-full">
      <h1 className="text-xl font-bold">Data Siswa</h1>
      <div className="flex pl-3 flex-col">
        <div className="text-base font-semibold gap-x-1 flex flex-none">
          <p>Harap baca ini </p>
          <span>
            <Info />
          </span>
        </div>
        <ul className="list-disc text-sm pl-4">
          <li className="font-medium">
            Setiap data siswa{" "}
            <span className="font-normal">akan dikelompokan sesuai kelas.</span>
          </li>
          <li className="font-medium">
            Kelas akan di kelompokkan,{" "}
            <span className="font-normal">sesuai tingkat X XI XII.</span>
          </li>
          <li className="font-normal">
            Anda dapat{" "}
            <span className="font-semibold">melihat authentikasi siswa</span>{" "}
            dengan <span className="font-semibold"> menekan Details</span> di
            table siswa
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AlertDataSiswa;
