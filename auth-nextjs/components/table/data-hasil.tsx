/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

import useSWR from "swr";
import TableLoading from "@/components/skeleton/Table-loading";

import DrawerKelas from "../DrawerKelas";
import DownloadResultsButton from "../DownloadHasil";

const fetchData = async () => {
  try {
    const data = await fetch("/api/get-hasil", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const responseData = await data.json();
    return responseData;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch data");
  }
};

const TableHasil = () => {
  const [pagePerX, setPagePerX] = React.useState(0);
  const [rowsPerPageX, setRowsPerPageX] = React.useState(5);
  const [pagePerXI, setPagePerXI] = React.useState(0);
  const [rowsPerPageXI, setRowsPerPageXI] = React.useState(5);
  const [pagePerXII, setPagePerXII] = React.useState(0);
  const [rowsPerPageXII, setRowsPerPageXII] = React.useState(5);

  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR("/api/get-hasil", fetchData);
  console.log("wkwk", rawData);

  const { X, XI, XII } = React.useMemo(() => {
    if (!rawData || !rawData.data) {
      return { X: [], XI: [], XII: [] };
    }

    const formattedData = rawData.data.flatMap((ujian: any) =>
      ujian.kelas.map((kelas: any) => ({
        id: ujian.id,
        tingkat: kelas.tingkat,
        pelajaran: ujian.pelajaran,
        kelas: ujian.kelas || [],
      }))
    );

    const X = formattedData.filter(
      (ujian: { tingkat: string }) => ujian.tingkat === "X"
    );
    const XI = formattedData.filter(
      (ujian: { tingkat: string }) => ujian.tingkat === "XI"
    );
    const XII = formattedData.filter(
      (ujian: { tingkat: string }) => ujian.tingkat === "XII"
    );

    return { X, XI, XII };
  }, [rawData]);

  if (isLoading)
    return (
      <div>
        <TableLoading />
      </div>
    );
  if (error) return <div>Error loading data</div>;

  return (
    <Box sx={{ width: "100%", marginTop: "25px" }}>
      <div className="w-full flex justify-end">
        <DownloadResultsButton />
      </div>
      <HasilTable
        title="Hasil Tingkat X"
        kelas={X}
        page={pagePerX}
        setPage={setPagePerX}
        rowsPerPage={rowsPerPageX}
        setRowsPerPage={setRowsPerPageX}
      />
      <HasilTable
        title="Hasil Tingkat XI"
        kelas={XI}
        page={pagePerXI}
        setPage={setPagePerXI}
        rowsPerPage={rowsPerPageXI}
        setRowsPerPage={setRowsPerPageXI}
      />
      <HasilTable
        title="Hasil Tingkat XII"
        kelas={XII}
        page={pagePerXII}
        setPage={setPagePerXII}
        rowsPerPage={rowsPerPageXII}
        setRowsPerPage={setRowsPerPageXII}
      />
    </Box>
  );
};

interface HasilTableProps {
  title: string;
  kelas: any[];
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  rowsPerPage: number;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
}

function HasilTable({
  title,
  kelas,
  page,
  setPage,
  rowsPerPage,
  setRowsPerPage,
}: HasilTableProps) {
  const UjianList = kelas;
  console.log("lass", UjianList);
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
              <TableCell align="center">No</TableCell>
              <TableCell align="center">Ujian</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {UjianList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Belum ada data untuk table ini
                </TableCell>
              </TableRow>
            ) : (
              UjianList.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage
              ).map((ujian, index) => (
                <TableRow hover key={index}>
                  <TableCell align="center">
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell align="center">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm  border border-blue-400">
                      {ujian.tingkat} - {ujian.pelajaran}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <DrawerKelas ujian={ujian} />
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
        count={UjianList.length}
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

export default TableHasil;
