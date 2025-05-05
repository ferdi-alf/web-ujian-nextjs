import ModalJadwalUjian from "./dialog/ModalJadwalUjian";
import DataJadwal from "./table/data-jadwalUjian";

const JadwalUjianComponent = () => {
  return (
    <div>
      <div className="w-full justify-end items-center">
        <ModalJadwalUjian />
      </div>
      <DataJadwal />
    </div>
  );
};

export default JadwalUjianComponent;
