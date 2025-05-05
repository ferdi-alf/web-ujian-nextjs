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
import FormJadwalUjian from "../fragments/form-JadwalUjian";
import { useActionState, useEffect, useState } from "react";
import { addJadwalUjian } from "@/lib/crudUjian";
import { showErrorToast, showSuccessToast } from "../toast/ToastSuccess";
import { mutate } from "swr";

const ModalJadwalUjian = () => {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addJadwalUjian, null);
  console.log("wkwk", state);
  useEffect(() => {
    console.log("current", state);
    if (state && state.success === true) {
      showSuccessToast(state.message || "Berhasil Menambahkan Jadwal dan Sesi");
      mutate("jadwalUjian");
      setOpen(false); // Menutup modal saat berhasil
    }
    if (state?.error) {
      showErrorToast(state.message || "Terjadi Kesalahan");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex w-full justify-end mb-5">
        <DialogTrigger className="p-2  font-semibold shadow-md rounded-md text-lg text-white bg-blue-500">
          Tambah Jadwal +
        </DialogTrigger>
      </div>
      <DialogContent>
        <DialogHeader className="w-11/12 bg-white">
          <DialogTitle>Tambah Data Jadwal</DialogTitle>
          <DialogDescription>Tambahkan Data Jadwal Ujian</DialogDescription>
          <form action={formAction}>
            <FormJadwalUjian state={state?.error_field} />
            <DialogFooter>
              <FormButton />
            </DialogFooter>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ModalJadwalUjian;
