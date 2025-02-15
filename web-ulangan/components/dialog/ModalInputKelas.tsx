"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FormKelas from "@/components/fragments/form-kelas";
import { FormButton } from "../button";
import { useActionState, useEffect } from "react";
import { AddKelas } from "@/lib/crudKelas";
import { mutate } from "swr";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";

const ModalInputKelas = () => {
  const [state, formAction] = useActionState(AddKelas, null);

  useEffect(() => {
    if (state?.success) {
      mutate("kelas");
    }
  }, [state]);

  useEffect(() => {
    if (state?.success) {
      showSuccessToast(state.message);
    } else if (state?.error) {
      const errorMessage =
        "server" in state.error ? state.error.server : "Unknown error";

      showErrorToast(errorMessage);
    }
  }, [state]);

  return (
    <Dialog>
      <div className="flex w-full justify-end mb-5">
        <DialogTrigger className="p-2 font-semibold shadow-md rounded-md text-lg text-white bg-blue-500">
          Tambah Kelas +
        </DialogTrigger>
      </div>
      <DialogContent className="w-11/12">
        <DialogHeader>
          <DialogTitle>Tambah Data Kelas</DialogTitle>
          <DialogDescription>Tambahkan daftar kelas yang ada</DialogDescription>
          <form action={formAction}>
            <FormKelas state={state} />
            <DialogFooter className="mt-10">
              <FormButton />
            </DialogFooter>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ModalInputKelas;
