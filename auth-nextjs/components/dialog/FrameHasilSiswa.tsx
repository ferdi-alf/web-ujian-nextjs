import { MoveLeft } from "lucide-react";
import { useMemo, useState } from "react";
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
} from "@mui/material";

import { useSearchParams } from "next/navigation";

interface FrameDataSiswaProps {
  tingkat: string;
  jurusan: string;
  siswa: {
    id: string;
    name: string;
    nilai: string;
    nis: string;
    benar: string;
    waktuPengerjaan: string;
    totalKecurangan: number;
  }[];
}

const convertToMinutes = (time: string | number) => {
  const seconds = Number(time); // Mengubah string ke number
  if (isNaN(seconds)) return "Invalid time"; // Jika bukan angka, beri fallback

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // Format agar selalu 2 digit (contoh: 05:09)
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

const FrameHasilSiswa = ({ tingkat, jurusan, siswa }: FrameDataSiswaProps) => {
  const [frame, setFrame] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search")?.toLocaleLowerCase() ?? "";

  const filteredSiswa = useMemo(() => {
    const filtered = siswa.filter((item) => {
      if (!searchTerm) return true;

      return (
        item.name.toLowerCase().includes(searchTerm) ||
        item.nilai.toLowerCase().includes(searchTerm)
      );
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [siswa, searchTerm]);

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
        className={`fixed  top-0 z-50 right-0 h-screen overflow-auto bg-white shadow-lg transition-transform duration-300 ${
          frame ? "translate-x-0 w-full border" : "translate-x-full w-0"
        }`}
      >
        <div className="p-3 pb-10">
          <div className="w-full p-2 border-b">
            <div className=" w-full flex items-center">
              <button
                onClick={handleShowFrame}
                className="text-xl font-semibold hover:bg-gray-200 rounded-md p-2"
              >
                <MoveLeft />
              </button>
              <div className="text-center w-full">
                <h1 className="text-2xl font-semibold">
                  Data hasil kelas {tingkat} - {jurusan}
                </h1>
              </div>
            </div>
          </div>

          <div className="py-2">
            <Box sx={{ width: "100%" }}>
              <Paper className="overflow-y-auto">
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center">No</TableCell>
                        <TableCell align="center">Nama</TableCell>
                        <TableCell align="center">Nilai</TableCell>
                        <TableCell align="center">Total Kecurangan</TableCell>
                        <TableCell align="center">Kelas</TableCell>
                        <TableCell align="center">Nis</TableCell>
                        <TableCell align="center">Waktu pengerjaan</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSiswa
                        .slice()
                        .slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage
                        )
                        .map((siswa, index) => (
                          // Pastikan key ini unik untuk setiap siswa
                          <TableRow key={`siswa-${siswa.id}-${index}`}>
                            <TableCell align="center">
                              {page * rowsPerPage + index + 1}
                            </TableCell>
                            <TableCell align="center" className="truncate">
                              {siswa.name}
                            </TableCell>
                            <TableCell align="center">
                              <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm border border-green-400">
                                {siswa.nilai}
                              </span>
                            </TableCell>
                            <TableCell align="center">
                              <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-red-400 border border-red-400">
                                {siswa.totalKecurangan}
                              </span>
                            </TableCell>
                            <TableCell align="center" className="truncate">
                              {tingkat}-{jurusan}
                            </TableCell>
                            <TableCell align="center">{siswa.nis}</TableCell>
                            <TableCell align="center" className="truncate">
                              {convertToMinutes(
                                parseInt(siswa.waktuPengerjaan)
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={siswa.length || 0}
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
  );
};

export default FrameHasilSiswa;
