/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { getSoal } from "@/lib/crudSoal";
import useSWR, { mutate } from "swr"; // Impor yang benar
import TableLoading from "../skeleton/Table-loading";
import { showErrorToast, showSuccessToast } from "../toast/ToastSuccess";
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
import { Trash2Icon } from "lucide-react";
import Swal from "sweetalert2";

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

  const {
    X,
    XI,
    XII,
    soalPerKelasX,
    soalPerKelasXI,
    soalPerKelasXII,
    idMataPelajaran,
  } = React.useMemo(() => {
    if (!rawData)
      return {
        X: [],
        XI: [],
        XII: [],
        soalPerKelasX: {},
        soalPerKelasXI: {},
        soalPerKelasXII: {},
        idMataPelajaran: {}, // Add this line
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
    const getMataPelajaranId = (mataPelajaranList: any[]) => {
      return mataPelajaranList.reduce(
        (acc: Record<string, string>, mataPelajaran) => {
          const pelajaran = mataPelajaran.pelajaran;
          const tingkat = mataPelajaran.tingkat;
          const key = `${tingkat} - ${pelajaran}`;

          acc[key] = mataPelajaran.id;
          return acc;
        },
        {}
      );
    };
    // Gabungkan semua data mata pelajaran untuk ID
    const allMataPelajaran = [...X, ...XI, ...XII];

    return {
      X,
      XI,
      XII,
      soalPerKelasX: hitungSoalPerPelajaran(X),
      soalPerKelasXI: hitungSoalPerPelajaran(XI),
      soalPerKelasXII: hitungSoalPerPelajaran(XII),
      idMataPelajaran: getMataPelajaranId(allMataPelajaran),
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
        idMataPelajaran={idMataPelajaran} // Tambahkan ini
      />
      <PelajaranTable
        title="Data Soal XI"
        soal={XI}
        soalPerTingkat={soalPerKelasXI}
        page={pagePerXI}
        setPage={setPagePerXI}
        rowPerPage={rowsPerPageXI}
        setRowsPerPage={setRowsPerPageXI}
        idMataPelajaran={idMataPelajaran} // Tambahkan ini
      />
      <PelajaranTable
        title="Data Soal XI"
        soal={XII}
        soalPerTingkat={soalPerKelasXII}
        page={pagePerXII}
        setPage={setPagePerXII}
        rowPerPage={rowsPerPageXII}
        setRowsPerPage={setRowsPerPageXII}
        idMataPelajaran={idMataPelajaran} // Tambahkan ini
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
  idMataPelajaran: Record<string, string>;
}

function PelajaranTable({
  title,
  soal,
  page,
  setPage,
  soalPerTingkat,
  rowPerPage,
  setRowsPerPage,
  idMataPelajaran,
}: SoalTableProps) {
  const SoalList = Object.keys(soalPerTingkat);

  const handleDeleteMataPelajaran = async (
    id: string,
    total: number,
    mataPelajaran: string
  ) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Apakah kamu yakin",
      text: `Jika kamu menghapus ${mataPelajaran}, maka seluruh total ${total} data soal akan terhapus dari ${mataPelajaran}`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/matapelajaran/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) {
          const errors = await response.json();
          if (errors.error) {
            showErrorToast(errors.message);
          }
          return;
        }

        const result = await response.json();
        if (result.success) {
          showSuccessToast(result.message);
          // Refresh data
          mutate("soal");
        }
      } catch (error) {
        console.error("Error:", error);
        showErrorToast("Terjadi kesalahan saat menghapus mata pelajaran");
      }
    }
  };

  return (
    <Paper className="overflow-auto mt-3">
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
                  <TableCell className="truncate">{pelajaran}</TableCell>
                  <TableCell className="truncate">
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm  border border-indigo-400">
                      {soalPerTingkat[pelajaran]} total soal
                    </span>
                  </TableCell>
                  <TableCell
                    sx={{ display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <FrameDataSoal
                      tingkat={pelajaran.split(" - ")[0]}
                      pelajaran={pelajaran.split(" - ")[1]}
                      soalList={soal}
                    />
                    <button
                      onClick={() =>
                        handleDeleteMataPelajaran(
                          idMataPelajaran[pelajaran],
                          soalPerTingkat[pelajaran],
                          pelajaran
                        )
                      }
                      type="button"
                      className="p-2 hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-indigo-500 bg-gray-100 rounded-sm"
                    >
                      <Trash2Icon />
                    </button>
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
