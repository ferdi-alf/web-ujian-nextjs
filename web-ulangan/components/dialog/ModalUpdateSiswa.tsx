import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SquarePen } from "lucide-react";
import { FormButton } from "@/components/button";
import FormUpdateSiswa from "@/components/fragments/form-updateSiswa";
import { useActionState } from "react";
import { useEffect, useState } from "react";
import { updateSiswa } from "@/lib/crudSiswa";
import { showErrorToast, showSuccessToast } from "../toast/ToastSuccess";
import { mutate } from "swr";

interface ModalSiswaProps {
  siswa: {
    id: string;
    name: string;
    ruang: string;
    kelamin: string;
    nis: string;
    nomor_ujian: string;
    userId: {
      id: string;
      username: string;
      image: string;
    };
  };
}

const ModalUpdateSiswa = ({ siswa }: ModalSiswaProps) => {
  const [state, formAction] = useActionState(updateSiswa, null);
  console.log(state);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleModalClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  // Buat wrapper untuk formAction
  const handleSubmit = async (formData: FormData) => {
    // Ambil file dari input
    const fileInput = document.querySelector(
      "#dropzone-file"
    ) as HTMLInputElement;
    const file = fileInput?.files?.[0];

    // Jika ada file baru, tambahkan ke FormData
    if (file) {
      // Hapus data image yang lama jika ada
      formData.delete("image");
      // Tambahkan file baru
      formData.append("image", file);
    }

    // Kirim ke server menggunakan formAction
    return formAction(formData);
  };

  useEffect(() => {
    if (state?.success) {
      showSuccessToast(state.message);
      mutate("siswa");
      setErrors({});
    } else if (state?.error) {
      if (typeof state.error === "object" && state.error !== null) {
        setErrors(state.error as Record<string, string[]>);
        const firstError = Object.values(state.error)[0] as string[];
        if (firstError && firstError[0]) {
          showErrorToast(firstError[0]);
        }
      } else {
        const errorMessage =
          "server" in state.error ? state.error.server : "Unknown error";
        showErrorToast(errorMessage);
      }
    }
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger
        onClick={handleModalClick}
        className="p-2 flex flex-nowrap items-center gap-x-1 shadow-md rounded-md text-sm font-bold text-white bg-blue-500"
      >
        <SquarePen className="text-xs " />
        <p>Details</p>
      </DialogTrigger>
      <DialogContent className="w-11/12">
        <DialogHeader>
          <DialogTitle>Edit Data Siswa</DialogTitle>
          <form action={handleSubmit}>
            <FormUpdateSiswa siswa={siswa} errors={errors} />
            <DialogFooter className="mt-2">
              <FormButton />
            </DialogFooter>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ModalUpdateSiswa;
