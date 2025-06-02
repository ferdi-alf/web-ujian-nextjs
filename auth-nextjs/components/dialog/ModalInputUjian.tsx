"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import FormInputUjian, { AutocompleteOption } from "../fragments/form-ujian";
import { Button, Typography } from "@mui/material";
import Swal from "sweetalert2";
import { useState } from "react";

const ModalInputUjian = () => {
  const [selectedUjian, setSelectedUjian] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  console.log("selectedUjian", selectedUjian);

  const handleUjianSelected = (ujian: AutocompleteOption[]) => {
    setSelectedUjian(ujian);
  };

  const handleSubmitUjianSusulan = async (
    selectedUjian: AutocompleteOption[]
  ) => {
    const HOST = process.env.NEXT_PUBLIC_API_URL_GOLANG;
    if (!HOST) {
      throw new Error("NEXT_PUBLIC_API_URL_GOLANG not defined");
    }

    // Prepare payload for backend
    const payload = {
      ujianIds: selectedUjian.map((ujian) => ({
        ujianId: ujian.ujianId,
        sesiId: ujian.sesiId,
        tingkat: ujian.tingkat.replace("Kelas ", ""), // Remove 'Kelas ' prefix
        pelajaran: ujian.pelajaran,
        sesi: ujian.sesi,
      })),
    };

    try {
      console.log("Submitting ujian susulan:", payload);
      const response = await fetch(`${HOST}/api/data-ujian-terlewat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("Ujian susulan added successfully:", result);

      // Show success message
      Swal.fire({
        title: "Berhasil!",
        text: `${selectedUjian.length} ujian susulan berhasil ditambahkan`,
        icon: "success",
        confirmButtonText: "OK",
      });

      // Close modal and reset
      setIsOpen(false);
      setSelectedUjian([]);
    } catch (error) {
      console.error("Error adding ujian susulan:", error);

      Swal.fire({
        title: "Error!",
        text:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menambahkan ujian susulan",
        icon: "error",
        confirmButtonText: "OK",
      });

      throw error; // Re-throw for FormInputUjian to handle
    }
  };

  const handleOpenModal = () => {
    Swal.fire({
      title: "Harap Baca ini Sebelum Menambahan Ujian Susulan!",
      icon: "info",
      html: `<ul style="text-align: left; list-style-type: disc; margin-left: 20px; font-size: 13px;">
        <li>Jika anda menambahkan ujian susulan pada saat ada sesi aktif (bukan sesi terakhir), Ujian susulan akan berakhir bersamaan ketika sesi saat ini memasuki 5 menit sebelum sesi berikutnya.</li>
        <li>Jika saat ini adalah sesi terakhir maka ujian susulan akan berakhir ketika sesi terakhir melewati 2 jam <b>setelah jam selesai sesi terakhir</b></li>
        <li>Jika menambahkan ujian susulan saat ini tidak ada satupun sesi yang aktif, maka ujian susulan akan akan berakhir sesuai waktu pengerjaan yang telah ditetapkan</li>
        <li>Jam mulai dan Jam selesai pada ujian yang telah ditetapkan tidak akan berpengaruh apapun terhadap ujian susulan (bisa mengerjakan kapan saja)</li>
        <li>Lebih disarankan menambahkan ujian susulan pada saat sesi terakhir. <b>Karna ada jeda 2 jam sebelum sesi terakhir benar-benar berakhir</b></li>
      </ul>`,
      showCancelButton: true,
      confirmButtonText: "Ok, saya mengerti",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsOpen(true);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="mt-3 w-full flex justify-end">
        <Button
          onClick={handleOpenModal}
          className="p-2 font-medium shadow-md rounded-md text-base text-white bg-blue-500"
        >
          <Typography variant="button" sx={{ display: "block" }}>
            Tambah Ujian +
          </Typography>
        </Button>
      </div>

      <DialogContent className="w-11/12 rounded-sm bg-white">
        <DialogHeader>
          <DialogTitle>Tambah Ujian Susulan</DialogTitle>
          <DialogDescription>
            Perhatian, data yang tampil disini hanyalah data ujian yang sudah
            lewat
          </DialogDescription>
          <DialogDescription>
            Menambahkan ujian hanya digunakan jika ada siswa yang tertinggal
            ujian atau ujian susulan. Lebih disarankan untuk menambahkan ujian
            susulan setelah semua sesi berakhir
          </DialogDescription>

          <FormInputUjian
            onUjianSelected={handleUjianSelected}
            onSubmitUjianSusulan={handleSubmitUjianSusulan}
          />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ModalInputUjian;
