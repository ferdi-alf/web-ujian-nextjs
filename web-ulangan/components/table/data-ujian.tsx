/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
  IconButton,
  Collapse,
  Box,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import useSWR from "swr";
import { getUjian } from "@/lib/crudUjian";
import TableLoading from "@/components/skeleton/Table-loading";
import { showErrorToast } from "@/components/toast/ToastSuccess";

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
    console.log("Hay:", rawData);

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

  console.log("X:", X);

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

function Row({ row }: { row: UjianData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{row.mataPelajaran.pelajaran}</TableCell>
        <TableCell align="center">{row.token}</TableCell>
        <TableCell align="center">
          <span className="bg-gray-100 capitalize font-semibold text-gray-800 text-xs  me-2 px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-gray-400 border border-gray-500">
            {row.status}
          </span>
        </TableCell>
        <TableCell align="center">{row.waktuPengerjaan}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom>
                Detail Ujian {row.mataPelajaran.tingkat} {" - "}{" "}
                {row.mataPelajaran.pelajaran}
              </Typography>
              {/* Isi collapsible ini bisa diisi dengan informasi tambahan */}
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
