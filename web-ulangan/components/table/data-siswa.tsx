/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getSiswa } from "@/lib/crudSiswa";
import React from "react";
import useSWR from "swr";
import TableLoading from "@/components/skeleton/Table-loading";
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
import FrameDataUsers from "../dialog/FrameDataUsers";
import { showErrorToast } from "../toast/ToastSuccess";

// 🚀 Ambil data siswa dari API
const fetchSiswa = async () => {
  try {
    const data = await getSiswa();
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch users");
  }
};

const TableDataSiswa = () => {
  const [pagePerX, setPagePerX] = React.useState(0);
  const [rowsPerPageX, setRowsPerPageX] = React.useState(5);
  const [pagePerXI, setPagePerXI] = React.useState(0);
  const [rowsPerPageXI, setRowsPerPageXI] = React.useState(5);
  const [pagePerXII, setPagePerXII] = React.useState(0);
  const [rowsPerPageXII, setRowsPerPageXII] = React.useState(5);

  const { data: rawData, error, isLoading } = useSWR("siswa", fetchSiswa);

  const { X, XI, XII, siswaPerKelasX, siswaPerKelasXI, siswaPerKelasXII } =
    React.useMemo(() => {
      if (!rawData)
        return {
          X: [],
          XI: [],
          XII: [],
          siswaPerKelasX: {},
          siswaPerKelasXI: {},
          siswaPerKelasXII: {},
        };

      const formattedData = rawData.map((siswa: any) => ({
        id: siswa.id,
        name: siswa.name,
        nis: siswa.nis,
        kelamin: siswa.kelamin,
        nomor_ujian: siswa.nomor_ujian,
        ruang: siswa.ruang,
        userId: siswa.user
          ? {
              id: siswa.user.id,
              username: siswa.user.username,
              role: siswa.user.role,
              image: siswa.user.image,
            }
          : undefined,
        kelasId: siswa.kelas
          ? {
              id: siswa.kelas.id,
              tingkat: siswa.kelas.tingkat,
              jurusan: siswa.kelas.jurusan,
            }
          : undefined,
      }));

      // 🔹 Filter siswa berdasarkan tingkat kelas
      const X = formattedData.filter((siswa) => siswa.kelasId?.tingkat === "X");
      const XI = formattedData.filter(
        (siswa) => siswa.kelasId?.tingkat === "XI"
      );
      const XII = formattedData.filter(
        (siswa) => siswa.kelasId?.tingkat === "XII"
      );

      // 🔹 Hitung jumlah siswa berdasarkan tingkat dan jurusan
      const hitungSiswaPerKelas = (siswaList: any[]) => {
        return siswaList.reduce((acc: Record<string, number>, siswa) => {
          const jurusan = siswa.kelasId?.jurusan;
          if (jurusan) {
            const key = `${siswa.kelasId?.tingkat} - ${jurusan}`;
            acc[key] = (acc[key] || 0) + 1;
          }
          return acc;
        }, {});
      };

      return {
        X,
        XI,
        XII,
        siswaPerKelasX: hitungSiswaPerKelas(X),
        siswaPerKelasXI: hitungSiswaPerKelas(XI),
        siswaPerKelasXII: hitungSiswaPerKelas(XII),
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
      <SiswaTable
        title="Data Kelas X"
        siswa={X} // ✅ Perbaikan: Kirim siswa X
        siswaPerKelas={siswaPerKelasX}
        page={pagePerX}
        setPage={setPagePerX}
        rowPerPage={rowsPerPageX}
        setRowsPerPage={setRowsPerPageX}
      />
      <SiswaTable
        title="Data Kelas XI"
        siswa={XI} // ✅ Perbaikan: Kirim siswa XI
        siswaPerKelas={siswaPerKelasXI}
        page={pagePerXI}
        setPage={setPagePerXI}
        rowPerPage={rowsPerPageXI}
        setRowsPerPage={setRowsPerPageXI}
      />
      <SiswaTable
        title="Data Kelas XII"
        siswa={XII} // ✅ Perbaikan: Kirim siswa XII
        siswaPerKelas={siswaPerKelasXII}
        page={pagePerXII}
        setPage={setPagePerXII}
        rowPerPage={rowsPerPageXII}
        setRowsPerPage={setRowsPerPageXII}
      />
    </Box>
  );
};

interface SiswaTableProps {
  title: string;
  siswa: any[]; // ✅ Tambahkan siswa sebagai prop
  siswaPerKelas: Record<string, number>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  rowPerPage: number;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
}

function SiswaTable({
  title,
  siswa,
  page,
  setPage,
  siswaPerKelas,
  rowPerPage,
  setRowsPerPage,
}: SiswaTableProps) {
  const kelasList = Object.keys(siswaPerKelas);

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
            {kelasList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Belum ada data untuk table ini
                </TableCell>
              </TableRow>
            ) : (
              kelasList
                .slice(page * rowPerPage, page * rowPerPage + rowPerPage)
                .map((kelas, index) => (
                  <TableRow hover key={kelas}>
                    <TableCell>{page * rowPerPage + index + 1}</TableCell>
                    <TableCell>{kelas}</TableCell>
                    <TableCell>{siswaPerKelas[kelas]} total data</TableCell>
                    <TableCell>
                      <FrameDataUsers
                        tingkat={kelas.split(" - ")[0]}
                        jurusan={kelas.split(" - ")[1]}
                        siswaList={siswa}
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
        count={kelasList.length}
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

export default TableDataSiswa;
