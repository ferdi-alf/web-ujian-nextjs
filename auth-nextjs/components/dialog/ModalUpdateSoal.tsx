import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PencilIcon } from "lucide-react";
import FormUpdateSoal from "../fragments/form-updateSoal";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="p-2 flex flex-nowrap items-center gap-x-1 shadow-md rounded-md text-sm font-bold text-white bg-blue-500">
        <PencilIcon />
      </DialogTrigger>
      <DialogContent className=" h-[95%] overflow-x-auto bg-white">
        <DialogHeader>
          <DialogTitle>Edit Data Soal</DialogTitle>
          <FormUpdateSoal soal={soal} onSuccess={() => setOpen(false)} />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ModalUpdateSoal;
