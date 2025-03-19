"use client";

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
import { MoveLeft } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface SiswaData {
  id: string;
  keterangan: string;
  nama: string;
}

interface FrameDataProps {
  kelas: string;
  hari: string;
  tanggal: string;
  siswa: SiswaData[];
}

const statusColors: Record<string, string> = {
  "Tidak Hadir": "bg-gray-100 text-gray-800 border-gray-500",
  Hadir: "bg-green-100 text-green-800 border-green-400 ",
};

const FrameDataAbsen = ({ kelas, hari, tanggal, siswa }: FrameDataProps) => {
  const [frame, setFrame] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleShowFrame = () => {
    setFrame((prev) => !prev);
  };
  return (
    <div className="">
      <button
        onClick={handleShowFrame}
        type="button"
        className="p-2 rounded-md bg-blue-500 text-white"
      >
        View Data
      </button>
      <div
        className={`fixed top-0 z-30 right-0 h-screen overflow-auto bg-white shadow-lg transition-transform duration-300 ${
          frame ? "translate-x-0 w-full border" : "translate-x-full w-0"
        }`}
      >
        <div className="md:pl-64 pl-0 h-screen bg-white">
          <div className="p-3">
            <div className="w-full p-2 border-b">
              <div className="md:w-[60%]  w-full flex items-center justify-between">
                <button
                  onClick={handleShowFrame}
                  className="text-xl font-semibold hover:bg-gray-200 rounded-md p-2"
                >
                  <MoveLeft />
                </button>
                <h1 className="text-2xl  font-semibold">Data Absen {kelas}</h1>
              </div>
            </div>

            <div className="p-2">
              <Box sx={{ width: "100%" }}>
                <Paper>
                  <Toolbar>
                    <div className="w-full flex items-center justify-between">
                      <Typography variant="h6">{kelas}</Typography>
                      <Typography variant="h6">
                        {hari} - {tanggal}
                      </Typography>
                    </div>
                  </Toolbar>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>No</TableCell>
                          <TableCell>Avatar</TableCell>
                          <TableCell>Nama</TableCell>
                          <TableCell>Keterangan</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {siswa
                          .slice(
                            page * rowsPerPage,
                            page * rowsPerPage + rowsPerPage
                          )
                          .map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {page * rowsPerPage + index + 1}
                              </TableCell>
                              <TableCell>
                                <Image
                                  className="rounded-full h-12 w-12 border"
                                  height={50}
                                  width={50}
                                  alt="avatar"
                                  src={"/avatar.png"}
                                />
                              </TableCell>
                              <TableCell>{item.nama}</TableCell>
                              <TableCell>
                                <span
                                  className={`capitalize font-medium text-xs me-2 px-2.5 py-0.5 rounded-sm border ${
                                    statusColors[item.keterangan] ||
                                    "bg-gray-100 text-gray-800 border-gray-500 "
                                  }`}
                                >
                                  {item.keterangan}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={siswa.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                  />
                </Paper>
              </Box>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameDataAbsen;
