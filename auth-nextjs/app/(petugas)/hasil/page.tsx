import CardHasil from "@/components/card/card-hasil";
import TableHasil from "@/components/table/data-hasil";

const Hasil = () => {
  return (
    <div className="w-full relative flex justify-center flex-col ">
      <CardHasil />
      <TableHasil />
    </div>
  );
};

export default Hasil;
