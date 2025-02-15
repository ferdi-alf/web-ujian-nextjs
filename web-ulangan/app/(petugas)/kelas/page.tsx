import { auth } from "@/auth";
import ModalInputKelas from "@/components/dialog/ModalInputKelas";
import DataKelas from "@/components/table/data-kelas";

const Kelas = async () => {
  const session = await auth();
  console.log("session", session);
  return (
    <div className="w-full flex justify-center flex-col items-center">
      <div className="">
        <p></p>
      </div>
      <ModalInputKelas />
      <DataKelas />
    </div>
  );
};

export default Kelas;
