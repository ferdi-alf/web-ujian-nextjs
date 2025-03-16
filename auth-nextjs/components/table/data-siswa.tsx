/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getSiswa } from "@/lib/crudSiswa";
import React, { useEffect } from "react";
import useSWR, { mutate } from "swr";
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
import { useSocket } from "@/lib/socketContext";

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
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Trigger mutate setelah komponen mount
    setTimeout(() => {
      mutate("siswa");
    }, 200);

    // Tambahkan event listener untuk visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, revalidating data...");
        mutate("siswa");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const initialData = {};
  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR("siswa", fetchSiswa, {
    revalidateOnMount: true,
    initialData: initialData,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });
  console.log(rawData);

  useEffect(() => {
    if (isConnected) {
      console.log("Socket connected, revalidating data...");
      mutate("siswa");
    }
  }, [isConnected]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (updatedData: any) => {
      console.log("Status update received:", updatedData);

      mutate(
        "siswa",
        (oldData: any) => {
          if (!oldData) return oldData;

          const updatedMap = new Map();
          updatedData.forEach((item: any) => {
            updatedMap.set(item.id, item);
          });

          return oldData.map((oldItem: any) => {
            const updatedItem = updatedMap.get(oldItem.id);
            if (updatedItem) {
              return {
                ...oldItem,
                user: {
                  ...oldItem.user,
                  status: updatedItem.user?.status || "OFFLINE",
                },
              };
            }
            return oldItem;
          });
        },
        false
      );
    };

    socket.on("statusSiswaUpdate", handleStatusUpdate);

    return () => {
      socket.off("statusSiswaUpdate", handleStatusUpdate);
    };
  }, [socket]);

  const {
    X,
    XI,
    XII,
    siswaPerKelasX,
    siswaPerKelasXI,
    siswaPerKelasXII,
    statusSiswaPerX,
    statusSiswaPerXI,
    statusSiswaPerXII,
    statusSiswaPerKelasX,
    statusSiswaPerKelasXI,
    statusSiswaPerKelasXII,
  } = React.useMemo(() => {
    if (!rawData)
      return {
        X: [],
        XI: [],
        XII: [],
        siswaPerKelasX: {},
        siswaPerKelasXI: {},
        siswaPerKelasXII: {},
        statusSiswaPerX: {},
        statusSiswaPerXI: {},
        statusSiswaPerXII: {},
        statusSiswaPerKelasX: {},
        statusSiswaPerKelasXI: {},
        statusSiswaPerKelasXII: {},
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
            status: siswa.user.status,
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

    const X = formattedData.filter((siswa) => siswa.kelasId?.tingkat === "X");
    const XI = formattedData.filter((siswa) => siswa.kelasId?.tingkat === "XI");
    const XII = formattedData.filter(
      (siswa) => siswa.kelasId?.tingkat === "XII"
    );

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

    const hitungStatusSiswaPerTingkat = (siswaList: any[]) => {
      return siswaList.reduce((acc: Record<string, number>, siswa) => {
        const status = siswa.userId?.status || "OFFLINE";

        if (!acc["ONLINE"]) acc["ONLINE"] = 0;
        if (!acc["UJIAN"]) acc["UJIAN"] = 0;
        if (!acc["SELESAI_UJIAN"]) acc["SELESAI_UJIAN"] = 0;
        if (!acc["OFFLINE"]) acc["OFFLINE"] = 0;

        // Increment status
        acc[status] = (acc[status] || 0) + 1;

        return acc;
      }, {});
    };

    const hitungStatusSiswaPerKelas = (siswaList: any[]) => {
      return siswaList.reduce(
        (acc: Record<string, Record<string, number>>, siswa) => {
          const jurusan = siswa.kelasId?.jurusan;
          const tingkat = siswa.kelasId?.tingkat;
          const status = siswa.userId?.status || "OFFLINE";

          if (jurusan && tingkat) {
            const key = `${tingkat} - ${jurusan}`;

            if (!acc[key]) {
              acc[key] = { ONLINE: 0, UJIAN: 0, SELESAI_UJIAN: 0, OFFLINE: 0 };
            }
            acc[key][status] = (acc[key][status] || 0) + 1;
          }

          return acc;
        },
        {}
      );
    };

    return {
      X,
      XI,
      XII,
      siswaPerKelasX: hitungSiswaPerKelas(X),
      siswaPerKelasXI: hitungSiswaPerKelas(XI),
      siswaPerKelasXII: hitungSiswaPerKelas(XII),
      statusSiswaPerX: hitungStatusSiswaPerTingkat(X),
      statusSiswaPerXI: hitungStatusSiswaPerTingkat(XI),
      statusSiswaPerXII: hitungStatusSiswaPerTingkat(XII),
      statusSiswaPerKelasX: hitungStatusSiswaPerKelas(X),
      statusSiswaPerKelasXI: hitungStatusSiswaPerKelas(XI),
      statusSiswaPerKelasXII: hitungStatusSiswaPerKelas(XII),
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
      {isConnected ? (
        <div className="mb-2 inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-sm border border-green-400">
          <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
          Realtime status aktif
        </div>
      ) : (
        <div className="mb-2 inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-sm border border-red-400">
          <span className="w-2 h-2 mr-1 bg-red-500 rounded-full"></span>
          Realtime status tidak aktif
        </div>
      )}
      <SiswaTable
        title="Data Kelas X"
        siswa={X} // ✅ Perbaikan: Kirim siswa X
        statusSiswaPerTingkat={statusSiswaPerX}
        siswaPerKelas={siswaPerKelasX}
        statusSiswaPerKelas={statusSiswaPerKelasX}
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
        statusSiswaPerTingkat={statusSiswaPerXI}
        statusSiswaPerKelas={statusSiswaPerKelasXI}
        rowPerPage={rowsPerPageXI}
        setRowsPerPage={setRowsPerPageXI}
      />
      <SiswaTable
        title="Data Kelas XII"
        siswa={XII} // ✅ Perbaikan: Kirim siswa XII
        siswaPerKelas={siswaPerKelasXII}
        page={pagePerXII}
        setPage={setPagePerXII}
        statusSiswaPerTingkat={statusSiswaPerXII}
        statusSiswaPerKelas={statusSiswaPerKelasXII}
        rowPerPage={rowsPerPageXII}
        setRowsPerPage={setRowsPerPageXII}
      />
    </Box>
  );
};

interface SiswaTableProps {
  title: string;
  siswa: any[];
  siswaPerKelas: Record<string, number>;
  statusSiswaPerTingkat: Record<string, number>;
  statusSiswaPerKelas: Record<string, Record<string, number>>;
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
  statusSiswaPerTingkat,
  statusSiswaPerKelas,
  siswaPerKelas,
  rowPerPage,
  setRowsPerPage,
}: SiswaTableProps) {
  const kelasList = Object.keys(siswaPerKelas);
  console.log("perkelas", statusSiswaPerTingkat);

  return (
    <Paper>
      <TableContainer>
        <Toolbar className="flex justify-between">
          <Typography sx={{ flex: "1 1 100%" }} variant="h6">
            {title}
          </Typography>
          <div className="flex flex-nowrap gap-2">
            <span className="bg-green-100 truncate text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm border-green-400">
              {statusSiswaPerTingkat.ONLINE || 0} ONLINE
            </span>
            {" - "}
            <span className="bg-yellow-100 truncate text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm border border-yellow-300">
              {statusSiswaPerTingkat.UJIAN || 0} ujian
            </span>
            {" - "}
            <span className="bg-purple-100 truncate text-purple-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm border border-purple-400">
              {statusSiswaPerTingkat.SELESAI_UJIAN || 0} Selesai
            </span>
          </div>
        </Toolbar>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No</TableCell>
              <TableCell>KELAS</TableCell>
              <TableCell>TOTAL</TableCell>
              <TableCell>STATUS</TableCell>
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
                    <TableCell className="flex flex-nowrap gap-2">
                      <span className="bg-yellow-100 truncate text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm border border-yellow-300">
                        {statusSiswaPerKelas[kelas]?.UJIAN || 0} ujian
                      </span>
                      <span className="bg-purple-100 truncate text-purple-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm border border-purple-400">
                        {statusSiswaPerKelas[kelas]?.SELESAI_UJIAN || 0} selesai
                      </span>
                    </TableCell>
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
