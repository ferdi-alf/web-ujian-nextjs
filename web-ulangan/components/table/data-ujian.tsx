/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useActionState, useEffect, useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  IconButton,
  Collapse,
  Box,
} from "@mui/material";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import useSWR, { mutate } from "swr";
import { deleteUjian, getUjian, updateUjian } from "@/lib/crudUjian";
import TableLoading from "@/components/skeleton/Table-loading";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import { Trash2Icon } from "lucide-react";
import { FormButton } from "../button";
import Swal from "sweetalert2";

interface UjianData {
  id: string;
  mataPelajaran: {
    id: string;
    tingkat: string;
    pelajaran: string;
  };
  token?: string;
  waktuPengerjaan: number;
  status: string;
}

interface UjianTableProps {
  title: string;
  data: UjianData[];
}

const fetchUjian = async () => {
  try {
    const data = await getUjian();
    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch data");
  }
};

const DataUjian = () => {
  const { data: rawData, error, isLoading } = useSWR("ujian", fetchUjian);
  console.log(rawData);

  const { X, XI, XII } = React.useMemo(() => {
    if (!rawData) return { X: [], XI: [], XII: [] };

    const formattedData = rawData.map((ujian: any) => ({
      id: ujian.id,
      token: ujian.token || "-",
      waktuPengerjaan: ujian.waktuPengerjaan,
      status: ujian.status,
      mataPelajaran: {
        id: ujian.mataPelajaran.id,
        tingkat: ujian.mataPelajaran.tingkat,
        pelajaran: ujian.mataPelajaran.pelajaran,
      },
    }));

    return {
      X: formattedData.filter(
        (ujian: UjianData) => ujian.mataPelajaran.tingkat === "X"
      ),
      XI: formattedData.filter(
        (ujian: UjianData) => ujian.mataPelajaran.tingkat === "XI"
      ),
      XII: formattedData.filter(
        (ujian: UjianData) => ujian.mataPelajaran.tingkat === "XII"
      ),
    };
  }, [rawData]);

  if (isLoading) {
    return <TableLoading />;
  }
  if (error) {
    showErrorToast("Gagal memuat data");
    return <div>Error loading data...</div>;
  }

  return (
    <div className="mt-2 flex flex-col gap-y-5">
      <UjianTable title="Daftar Ujian Tingkat X" data={X} />
      <UjianTable title="Daftar Ujian Tingkat XI" data={XI} />
      <UjianTable title="Daftar Ujian Tingkat XII" data={XII} />
    </div>
  );
};

const statusColors: Record<string, string> = {
  pending:
    "bg-gray-100 text-gray-800 border-gray-500 dark:bg-gray-700 dark:text-gray-400",
  active:
    "bg-green-100 text-green-800 border-green-400 dark:bg-gray-700 dark:text-green-400",
  selesai:
    "bg-purple-100 text-purple-800 border-purple-400 dark:bg-gray-700 dark:text-purple-400",
};

function Row({ row }: { row: UjianData }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [state, formAction] = useActionState(updateUjian, null);
  console.log(state);

  useEffect(() => {
    if (state?.error) {
      Object.entries(state.error).forEach(([field, messages]) => {
        // Jika messages adalah array, tampilkan semua pesan errornya
        if (Array.isArray(messages)) {
          messages.forEach((msg) => showErrorToast(`${field}: ${msg}`));
        } else {
          showErrorToast(`${field}: ${messages}`);
        }
      });
    }

    if (state?.success && state?.message) {
      showSuccessToast(state.message);
      mutate("ujian");
    }
  }, [state]);

  useEffect(() => {
    if (row.token && row.token !== "-") {
      setToken(row.token);
    } else {
      setToken("");
    }
  }, [row]);

  const generateRandomToken = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";

    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    setToken(result);
  };

  const handleDelete = async (row: UjianData) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Apakah Anda yakin?",
      text: `Jika Anda menghapus ujian ${row.mataPelajaran.tingkat} ${row.mataPelajaran.pelajaran}, semua yang berelasi dengan ujian ini termasuk data hasil ujian dan data kecurangan di ujian ini akan terhapus. Harap backup data terkait sebelum menghapus!`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      try {
        const res = await deleteUjian(row.id);

        if (res.error && res.message) {
          showErrorToast(res.message);
        }
        if (res.success && res.message) {
          showSuccessToast(res.message);
          mutate("ujian");
        }
      } catch (error) {
        console.log(error);
        showErrorToast("Gagal menghapus data");
      }
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell className="truncate">
          {row.mataPelajaran.tingkat}
          {" - "}
          {row.mataPelajaran.pelajaran}
        </TableCell>
        <TableCell align="center">{row.token}</TableCell>
        <TableCell align="center">
          <span
            className={`capitalize font-medium text-xs me-2 px-2.5 py-0.5 rounded-sm border ${
              statusColors[row.status] ||
              "bg-gray-100 text-gray-800 border-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {row.status}
          </span>
        </TableCell>

        <TableCell align="center">{row.waktuPengerjaan} menit</TableCell>
        <TableCell align="center">
          <button
            onClick={() => handleDelete(row)}
            className="rounded bg-gray-100 p-2 hover:bg-gray-300"
          >
            <Trash2Icon />
          </button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <p className="text-base font-light">
                Detail Ujian {row.mataPelajaran.tingkat} {" - "}{" "}
                {row.mataPelajaran.pelajaran}
              </p>
              <form action={formAction} className="w-full mt-5">
                <input type="hidden" name="id" value={row.id} />
                <div className="grid grid-cols-2 gap-2 ">
                  <div className="w-full">
                    <p className="font-medium ">Status Ujian </p>
                    <Select defaultValue={row.status} name="status">
                      <SelectTrigger>
                        <SelectValue placeholder="Set status ujian" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Status ujian</SelectLabel>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="selesai">Selesai</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {/* {errors?.waktuPengerjaan && (
                      <p className="text-red-500 text-start text-sm mt-1">
                        {errors.waktuPengerjaan[0]}
                      </p>
                    )} */}
                  </div>
                  <div className="w-full">
                    <p className="font-medium ">Waktu pengerjaan </p>
                    <Select
                      defaultValue={row.waktuPengerjaan.toString()}
                      name="waktuPengerjaan"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih waktu pengerjaan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Waktu pengerjaan</SelectLabel>
                          <SelectItem value="30">30 menit</SelectItem>
                          <SelectItem value="60">60 menit</SelectItem>
                          <SelectItem value="120">120 menit</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {/* {errors?.waktuPengerjaan && (
                      <p className="text-red-500 text-start text-sm mt-1">
                        {errors.waktuPengerjaan[0]}
                      </p>
                    )} */}
                  </div>
                </div>

                <div className=" mt-2 ">
                  <label className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">
                    Token
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="Masukan token ujian"
                    />
                    <button
                      onClick={generateRandomToken}
                      type="button"
                      className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                    >
                      Buat otomatis
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-md">
                    <FormButton />
                  </div>
                </div>
              </form>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function UjianTable({ title, data }: UjianTableProps) {
  return (
    <TableContainer component={Paper}>
      <Toolbar>
        <h6 className="text-lg font-medium">{title}</h6>
      </Toolbar>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Pelajaran</TableCell>
            <TableCell align="center">Token</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="center">Waktu Pengerjaan</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DataUjian;
