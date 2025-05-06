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
import { startTransition, useActionState, useEffect, useState } from "react";
import { mutate } from "swr";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import { Autocomplete, TextField, Chip } from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { addUjianToSesi } from "@/lib/crudUjian";

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
  const [state, formAction] = useActionState(addUjianToSesi, null);
  const [data, setData] = useState<MataPelajaran[]>([]);
  const [selectedMapel, setSelectedMapel] = useState<MataPelajaran[]>([]);
  const [open, setOpen] = useState(false);
  console.log(state);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/matapelajaran/${idJadwal}`, {
          method: "GET",
        });
        const result = await res.json();
        console.log("Fetched data:", result);

        if (!res.ok) throw new Error(result.error || "Failed to fetch");
        setData(result);
      } catch (error) {
        console.error("Fetch error:", error);
        showErrorToast("Gagal mengambil data mata pelajaran.");
      }
    };
    if (idJadwal) fetchData();
  }, [idJadwal]);

  useEffect(() => {
    if (state?.success) {
      mutate("jadwalUjian");
      setOpen(false);
      setSelectedMapel([]);
    }
  }, [state]);

  useEffect(() => {
    if (state?.success) {
      showSuccessToast(state.message);
    } else if (state?.error) {
      showErrorToast(state.message || "Terjadi kesalahan");
    }
  }, [state]);

  const handleSubmit = (event: any) => {
    event.preventDefault();

    startTransition(() => {
      formAction(new FormData(event.target));
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex w-full justify-end mb-5">
        <DialogTrigger className="p-2 shadow-md rounded-md text-lg text-white bg-blue-500">
          Tambah Ujian +
        </DialogTrigger>
      </div>
      <DialogContent className="w-11/12 bg-white">
        <DialogHeader>
          <DialogTitle>Tambah ujian</DialogTitle>
          <DialogDescription>
            Tambahkan Ujian ke daftar sesi tanggal{" "}
            {dayjs(tanggal).locale("id").format("D MMMM YYYY")}
          </DialogDescription>
          <p className="font-semibold my-2">Tambahkan 1 atau lebih ujian</p>
          <form onSubmit={handleSubmit}>
            <Autocomplete
              multiple
              disablePortal
              id="mata-pelajaran-autocomplete"
              options={data}
              value={selectedMapel}
              onChange={(event, newValue) => {
                setSelectedMapel(newValue);
                console.log("Selected values:", newValue);
              }}
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

            {selectedMapel.length > 0 && (
              <div className="mt-5">
                <h3 className="text-lg font-medium mb-2">
                  Mata Pelajaran Terpilih:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMapel.map((mapel) => {
                    return (
                      <Chip
                        key={mapel.id}
                        label={`${mapel.tingkat} - ${mapel.pelajaran}`}
                        color="primary"
                        onDelete={() => {
                          setSelectedMapel(
                            selectedMapel.filter((item) => item.id !== mapel.id)
                          );
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {selectedMapel.map((mapel, index) => (
              <input
                key={index}
                type="hidden"
                name="mataPelajaranIds"
                value={mapel.id}
              />
            ))}

            <input type="hidden" name="idJadwal" value={idJadwal} />

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
