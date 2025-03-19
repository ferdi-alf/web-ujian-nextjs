"use client";

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
import FrameDataAbsen from "../dialog/FrameDataAbsen";

interface Student {
  id: string;
  nama: string;
  keterangan: string;
}

interface ClassData {
  kelas: string;
  tanggal: string;
  hari: string;
  siswa: Student[];
}

interface ApiResponse {
  X: ClassData[];
  XI: ClassData[];
  XII: ClassData[];
}

const fetchData = async () => {
  try {
    const res = await fetch("/api/data-kehadiran", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

const DataKehadiran = () => {
  const { data, error, isLoading } = useSWR<ApiResponse>(
    "data-kehadiran",
    fetchData
  );
  const [pagePerX, setPagePerX] = React.useState(0);
  const [rowsPerPageX, setRowsPerPageX] = React.useState(5);
  const [pagePerXI, setPagePerXI] = React.useState(0);
  const [rowsPerPageXI, setRowsPerPageXI] = React.useState(5);
  const [pagePerXII, setPagePerXII] = React.useState(0);
  const [rowsPerPageXII, setRowsPerPageXII] = React.useState(5);
  console.log("data", data?.X);

  if (isLoading) return <TableLoading />;
  if (error) return <p>Error loading data: {error.message}</p>;
  if (!data) return <p>No data available</p>;

  return (
    <Box sx={{ marginTop: 4 }}>
      <TableKehadiran
        title="Kelas X"
        data={data.X}
        page={pagePerX}
        setPage={setPagePerX}
        rowsPerPage={rowsPerPageX}
        setRowsPerPage={setRowsPerPageX}
      />

      <TableKehadiran
        title="Kelas XI"
        data={data.XI}
        page={pagePerXI}
        setPage={setPagePerXI}
        rowsPerPage={rowsPerPageXI}
        setRowsPerPage={setRowsPerPageXI}
      />

      <TableKehadiran
        title="Kelas XII"
        data={data.XII}
        page={pagePerXII}
        setPage={setPagePerXII}
        rowsPerPage={rowsPerPageXII}
        setRowsPerPage={setRowsPerPageXII}
      />
    </Box>
  );
};

interface TableDataKehadiranProps {
  title: string;
  data: ClassData[];
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  rowsPerPage: number;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
}

function TableKehadiran({
  title,
  data,
  page,
  setPage,
  rowsPerPage,
  setRowsPerPage,
}: TableDataKehadiranProps) {
  const allStudents = data.flatMap((kelas) => kelas.siswa);
  console.log("All students:", allStudents);
  return (
    <Paper sx={{ mb: 3 }}>
      <TableContainer>
        <Toolbar>
          <Typography variant="h6">{title}</Typography>
        </Toolbar>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No</TableCell>
              <TableCell>Kelas</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Hari</TableCell>
              <TableCell>Jumlah Siswa</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((kelas, index) => (
                <TableRow key={kelas.kelas}>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{kelas.kelas}</TableCell>
                  <TableCell>{kelas.tanggal}</TableCell>
                  <TableCell>{kelas.hari}</TableCell>
                  <TableCell>{kelas.siswa.length}</TableCell>
                  <TableCell>
                    <FrameDataAbsen
                      siswa={kelas.siswa}
                      hari={kelas.hari}
                      tanggal={kelas.tanggal}
                      kelas={kelas.kelas}
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 20]}
        component="div"
        className="mb-5"
        count={data.length}
        rowsPerPage={rowsPerPage}
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

export default DataKehadiran;
