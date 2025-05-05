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
import { useActionState, useEffect, useState } from "react";
import { AddUser } from "@/lib/crudUsers";
import { mutate } from "swr";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import { Autocomplete, TextField } from "@mui/material";

type MataPelajaran = {
  id: string;
  pelajaran: string;
  tingkat: string;
};
const ModalAddUjianToSesi = ({
  tanggal,
  idJadwal,
}: {
  tanggal: string;
  idJadwal: string;
}) => {
  const [state, formAction] = useActionState(AddUser, null);
  const [data, setData] = useState<MataPelajaran[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/matapelajaran/${idJadwal}`, {
          method: "GET",
        });
        const result = await res.json();

        if (!res.ok) throw new Error(result.error || "Failed to fetch");
        setData(result);
      } catch (error) {
        console.error("Fetch error:", error);
        showErrorToast("Gagal mengambil data mata pelajaran.");
      }
    };
    if (idJadwal) fetchData();
  }, [idJadwal]);
  console.log("pesan", data);

  useEffect(() => {
    if (state?.success) {
      mutate("users");
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
        <DialogTrigger className="p-2  shadow-md rounded-md text-lg text-white bg-blue-500">
          Tambah Ujian +
        </DialogTrigger>
      </div>
      <DialogContent className="w-11/12 bg-white">
        <DialogHeader>
          <DialogTitle>Tambah ujian</DialogTitle>
          <DialogDescription>
            Tambahkan Ujian ke daftar sesi tanggal{" "}
            {new Date(tanggal).toLocaleDateString("id-ID")}
          </DialogDescription>
          <form action={""}>
            <Autocomplete
              multiple
              id="mata-pelajaran-autocomplete"
              options={data}
              getOptionLabel={(option) =>
                `${option.tingkat} - ${option.pelajaran}`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterSelectedOptions
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Pilih Mata Pelajaran"
                  placeholder="Mata Pelajaran"
                />
              )}
            />
            <DialogFooter className="mt-10">
              <FormButton />
            </DialogFooter>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ModalAddUjianToSesi;
