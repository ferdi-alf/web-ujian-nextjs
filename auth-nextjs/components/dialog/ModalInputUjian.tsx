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

import FormInputUjian from "../fragments/form-ujian";
import { Typography } from "@mui/material";
import Swal from "sweetalert2";

const ModalInputUjian = () => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const HOST = process.env.NEXT_PUBLIC_API_URL_GOLANG;
    if (!HOST) {
      throw new Error("NEXT_PUBLIC_API_URL_GOLANG not defined");
    }

    Swal.fire({
      title: "Harap Baca ini Sebelum Menambahan Ujian Susulan!",
      icon: "info",
      html: `
        <ul style="text-align: left; list-style-type: disc; margin-left: 20px; font-size: 13px;">
          <li>Jika anda menambahkan ujian susulan pada saat ada sesi aktif (bukan sesi terakhir), Ujian susulan akan berakhir bersamaan ketika sesi saat ini memasuki 5 menit sebelum sesi berikutnya .</li>
          <li>Jika saat ini adalah sesi terakhir maka ujian susulan akan berakhir ketika sesi terakhir melewati 2 jam <b>setelah jam selesai sesi terakhir</b></li>
          <li>Jika menambahkan ujian susulan saat ini tidak ada satupun sesi yang aktif, maka ujian susulan akan akan berakhir sesuai waktu pengerjaan yang telah ditetapkan</li>
          <li>Jam mulai dan Jam selesai pada ujian yang telah ditetapkan tidak akan berpengaruh apapun terhadap ujian susulan (bisa mengerjakan kapan saja)</li>
          <li>Lebih disarankan menambahkan ujian susulan pada saat sesi terakhir. <b>Karna ada jeda 2 jam sebelum sesi terakhir benar-benar berakhir</b></li>
       </ul>
      `,
      showCancelButton: true,
      confirmButtonText: "Ok, saya mengerti",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`${HOST}/api/data-ujian-terlewat`, {
            method: "POST",
          });
        } catch (error) {
          console.error("Error fetching ujian:", error);
        }
      }
    });
  };

  return (
    <Dialog>
      <div className="mt-3 w-full flex justify-end">
        <DialogTrigger className="p-2 font-medium  shadow-md rounded-md text-base text-white bg-blue-500">
          <Typography variant="button" sx={{ display: "block" }}>
            Tambah Ujian +
          </Typography>
        </DialogTrigger>
      </div>
      <DialogContent className="w-11/12 rounded-sm bg-white">
        <DialogHeader>
          <DialogTitle>Tambah Ujian</DialogTitle>
          <DialogDescription>
            Perhatian, data yang tampil disini hanyalah data ujian yang sudah
            lewat
          </DialogDescription>
          <DialogDescription>
            Menambahkan ujian hanya digunakan jika ada siswa yang tertinggal
            ujian atau ujian susulan. Lebih disarankan untuk menambahkan ujian
            susulan setelah semua sesi berakhir
          </DialogDescription>
          <form onSubmit={handleSubmit}>
            <FormInputUjian />
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
