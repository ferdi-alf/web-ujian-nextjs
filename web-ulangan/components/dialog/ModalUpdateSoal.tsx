import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PencilIcon } from "lucide-react";
import FormUpdateSoal from "../fragments/form-updateSoal";

interface JawabanType {
  id: string;
  soalId: string;
  jawaban: string;
  benar: boolean;
}

interface SoalType {
  id: string;
  soal: string;
  gambar?: string | null;
  mataPelajaranId: string;
  Jawaban: JawabanType[];
}
const ModalUpdateSoal = ({ soal }: { soal: SoalType }) => {
  const handleFormSubmit = async (updatedSoal: SoalType) => {
    try {
      // Your API update logic here
      console.log("Submitting updated soal:", updatedSoal);
      // Implementasi logika API update di sini
    } catch (error) {
      console.error("Error updating soal:", error);
    }
  };
  return (
    <Dialog>
      <DialogTrigger className="p-2 flex flex-nowrap items-center gap-x-1 shadow-md rounded-md text-sm font-bold text-white bg-blue-500">
        <PencilIcon />
      </DialogTrigger>
      <DialogContent className=" h-[95%] overflow-x-auto">
        <DialogHeader>
          <DialogTitle>Edit Data Soal</DialogTitle>
          <FormUpdateSoal soal={soal} onSubmit={handleFormSubmit} />
        </DialogHeader>
        <DialogFooter>{/* <FormButton /> */}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalUpdateSoal;
