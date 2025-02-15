import AlertDataSiswa from "@/components/card/card-alertDataSiswa";
import TableDataSiswa from "@/components/table/data-siswa";

export default function DataSiswa() {
  return (
    <div className="">
      <AlertDataSiswa />
      <div className="mt-5">
        <TableDataSiswa />
      </div>
    </div>
  );
}
