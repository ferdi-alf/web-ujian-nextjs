/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { FormButton } from "../button";
import { useActionState, useEffect } from "react";
import { mutate } from "swr";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import FormInputUjian from "../fragments/form-ujian";
import { addUjian } from "@/lib/crudUjian";

const ModalInputUjian = () => {
  const [state, formAction] = useActionState(addUjian, null);
  console.log("state:", state);

  useEffect(() => {
    if (state?.error) {
      showErrorToast((state as any).error.general);
    } else if (state?.success && state?.message) {
      showSuccessToast((state as any).message);
      mutate("ujian");
    }
  }, [state]);
  return (
    <Dialog>
      <div className="mt-3 w-full flex justify-end">
        <DialogTrigger className="p-2 font-medium  shadow-md rounded-md text-base text-white bg-blue-500">
          Tambah Ujian +
        </DialogTrigger>
      </div>
      <DialogContent className="w-11/12 rounded-sm bg-white">
        <DialogHeader>
          <DialogTitle>Tambah Ujian</DialogTitle>
          <DialogDescription>Tambahkan ujian</DialogDescription>
          <form action={formAction}>
            <FormInputUjian errors={state?.error} />
            <DialogFooter>
              <FormButton />
            </DialogFooter>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ModalInputUjian;
