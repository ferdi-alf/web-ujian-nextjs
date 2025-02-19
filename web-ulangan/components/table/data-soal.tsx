/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { getSoal } from "@/lib/crudSoal";
import useSWR from "swr"; // Impor yang benar
import TableLoading from "../skeleton/Table-loading";
import { showErrorToast } from "../toast/ToastSuccess";
import React from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Toolbar,
  Typography,
} from "@mui/material";
import FrameDataSoal from "../dialog/FrameDataSoal";

const fetchData = async () => {
  try {
    const data = await getSoal();
    return data;
  } catch (error) {
    console.log("Error:", error);
    throw new Error("Failed to fetch data");
  }
};

const TableDataSoal = () => {
  const [pagePerX, setPagePerX] = React.useState(0);
  const [rowsPerPageX, setRowsPerPageX] = React.useState(5);
  const [pagePerXI, setPagePerXI] = React.useState(0);
  const [rowsPerPageXI, setRowsPerPageXI] = React.useState(5);
  const [pagePerXII, setPagePerXII] = React.useState(0);
  const [rowsPerPageXII, setRowsPerPageXII] = React.useState(5);

  const { data: rawData, error, isLoading } = useSWR("soal", fetchData);
  console.log(rawData);

  const { X, XI, XII, soalPerKelasX, soalPerKelasXI, soalPerKelasXII } =
    React.useMemo(() => {
      if (!rawData)
        return {
          X: [],
          XI: [],
          XII: [],
          soalPerKelasX: {},
          soalPerKelasXI: {},
          soalPerKelasXII: {},
        };

      // Filter mata pelajaran berdasarkan tingkat terlebih dahulu
      const X = rawData.filter((pelajaran) => pelajaran.tingkat === "X");
      const XI = rawData.filter((pelajaran) => pelajaran.tingkat === "XI");
      const XII = rawData.filter((pelajaran) => pelajaran.tingkat === "XII");

      // Fungsi untuk menghitung jumlah soal per mata pelajaran
      const hitungSoalPerPelajaran = (mataPelajaranList: any[]) => {
        return mataPelajaranList.reduce(
          (acc: Record<string, number>, mataPelajaran) => {
            const pelajaran = mataPelajaran.pelajaran;
            const tingkat = mataPelajaran.tingkat;
            const key = `${tingkat} - ${pelajaran}`;

            // Hitung jumlah soal dalam array soal
            const jumlahSoal = mataPelajaran.soal?.length || 0;
            acc[key] = jumlahSoal;

            return acc;
          },
          {}
        );
      };

      return {
        X,
        XI,
        XII,
        soalPerKelasX: hitungSoalPerPelajaran(X),
        soalPerKelasXI: hitungSoalPerPelajaran(XI),
        soalPerKelasXII: hitungSoalPerPelajaran(XII),
      };
    }, [rawData]);

  if (isLoading) {
    return <TableLoading />;
  }

  if (error) {
    showErrorToast("Error Loading data....");
    return <div>Error Loading data....</div>;
  }

  return (
    <Box sx={{ width: "100%" }}>
      <PelajaranTable
        title="Data Soal X"
        soal={X}
        soalPerTingkat={soalPerKelasX}
        page={pagePerX}
        setPage={setPagePerX}
        rowPerPage={rowsPerPageX}
        setRowsPerPage={setRowsPerPageX}
      />
      <PelajaranTable
        title="Data Soal XI"
        soal={XI}
        soalPerTingkat={soalPerKelasXI}
        page={pagePerXI}
        setPage={setPagePerXI}
        rowPerPage={rowsPerPageXI}
        setRowsPerPage={setRowsPerPageXI}
      />
      <PelajaranTable
        title="Data Soal XI"
        soal={XII}
        soalPerTingkat={soalPerKelasXII}
        page={pagePerXII}
        setPage={setPagePerXII}
        rowPerPage={rowsPerPageXII}
        setRowsPerPage={setRowsPerPageXII}
      />
    </Box>
  );
};

interface SoalTableProps {
  title: string;
  soal: any[];
  soalPerTingkat: Record<string, number>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  rowPerPage: number;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
}

function PelajaranTable({
  title,
  soal,
  page,
  setPage,
  soalPerTingkat,
  rowPerPage,
  setRowsPerPage,
}: SoalTableProps) {
  const SoalList = Object.keys(soalPerTingkat);

  return (
    <Paper>
      <TableContainer>
        <Toolbar>
          <Typography sx={{ flex: "1 1 100%" }} variant="h6">
            {title}
          </Typography>
        </Toolbar>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No</TableCell>
              <TableCell>KELAS</TableCell>
              <TableCell>TOTAL</TableCell>
              <TableCell>ACTIONS</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {SoalList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Belum ada data untuk table ini
                </TableCell>
              </TableRow>
            ) : (
              SoalList.slice(
                page * rowPerPage,
                page * rowPerPage + rowPerPage
              ).map((pelajaran, index) => (
                <TableRow hover key={pelajaran}>
                  <TableCell>{page * rowPerPage + index + 1}</TableCell>
                  <TableCell>{pelajaran}</TableCell>
                  <TableCell>
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm  border border-indigo-400">
                      {soalPerTingkat[pelajaran]} total soal
                    </span>
                  </TableCell>
                  <TableCell>
                    <FrameDataSoal
                      tingkat={pelajaran.split(" - ")[0]}
                      pelajaran={pelajaran.split(" - ")[1]}
                      soalList={soal}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 20]}
        component="div"
        className="mb-5"
        count={SoalList.length}
        rowsPerPage={rowPerPage}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );
}

export default TableDataSoal;
