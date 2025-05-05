"use client";
import {
  Box,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Tooltip,
} from "@mui/material";
import useSWR from "swr";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TableLoading from "../skeleton/Table-loading";
import { useEffect, useState } from "react";
import { PencilIcon, TrashIcon, XIcon } from "lucide-react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { FormButton } from "../button";
import ModalAddUjianToSesi from "../dialog/ModalAddUjianToSesi";

export interface JadwalData {
  id: string;
  tanggal: string;
  tingkat: "X" | "XI" | "XII";
  jumlahUjian: number;
  sesi: {
    id: string;
    sesi: number;
    jamMulai?: string | null;
    jamSelesai?: string | null;
    ujian: {
      id?: string | null;
      jamMulai?: string | null;
      jamSelesai?: string | null;
      mataPelajaran: string;
    }[];
  }[];
}

interface JadwalUjianProps {
  title: string;
  data: JadwalData[];
}

type GetJadwalUjianResponse = {
  X: JadwalData[];
  XI: JadwalData[];
  XII: JadwalData[];
};

const DataJadwal = () => {
  const {
    data: rawData,
    isLoading,
    error,
  } = useSWR<GetJadwalUjianResponse>("jadwalUjian", async () => {
    const res = await fetch("/api/jadwal-ujian", { method: "GET" });
    if (!res.ok) throw new Error("Gagal Mengambil Data Jadwal Ujian");
    return res.json();
  });

  console.log("data", rawData);

  if (isLoading) {
    return <TableLoading />;
  }

  if (error) {
    return <p>Error</p>;
  }

  return (
    <div className="mt-2 gap-3 flex flex-col">
      <JadwalTable
        title="Daftar Jadwal Ujian Tingkat X"
        data={rawData?.X || []}
      />
      <JadwalTable
        title="Daftar Jadwal Ujian Tingkat XI"
        data={rawData?.XI || []}
      />
      <JadwalTable
        title="Daftar Jadwal Ujian Tingkat XII"
        data={rawData?.XII || []}
      />
    </div>
  );
};

function UjianTable({
  sesi,
  tanggal,
  idJadwal,
}: {
  sesi: JadwalData["sesi"];
  tanggal: string;
  idJadwal: string;
}) {
  const semuaMapel = Array.from(
    new Set(sesi.flatMap((s) => s.ujian.map((u) => u.mataPelajaran)))
  );

  return (
    <div className="flex  justify-end">
      <ModalAddUjianToSesi tanggal={tanggal} idJadwal={idJadwal} />
      <div className="w-11/12 ">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mata Pelajaran</TableCell>
              {sesi.map((s) => (
                <TableCell key={s.id}>Sesi {s.sesi}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {semuaMapel.map((mapel) => (
              <TableRow key={mapel}>
                <TableCell>{mapel}</TableCell>
                {sesi.map((s) => {
                  const ujian = s.ujian.find((u) => u.mataPelajaran === mapel);
                  return (
                    <TableCell key={s.id}>
                      {ujian ? `${ujian.jamMulai} - ${ujian.jamSelesai}` : "-"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Row({ row }: { row: JadwalData }) {
  const [open, setOpen] = useState(false);
  const [editMode, SetEditMode] = useState(false);
  const [sesiTimes, setSesiTimes] = useState<{
    [sesiId: string]: {
      jamMulai: Dayjs | null;
      jamSelesai: Dayjs | null;
    };
  }>({});
  console.log(row.id);

  useEffect(() => {
    const intialTimes: {
      [sessiId: string]: {
        jamMulai: Dayjs | null;
        jamSelesai: Dayjs | null;
      };
    } = {};

    row.sesi.forEach((sesiRow) => {
      intialTimes[sesiRow.id] = {
        jamMulai: sesiRow.jamMulai ? dayjs(sesiRow.jamMulai, "HH:mm") : null,
        jamSelesai: sesiRow.jamMulai
          ? dayjs(sesiRow.jamSelesai, "HH:mm")
          : null,
      };
    });

    setSesiTimes(intialTimes);
  }, [row.sesi]);

  const handleClickEditMode = () => SetEditMode((prev) => !prev);

  const handleStartTimeChange = (sesiId: string, newValue: Dayjs | null) => {
    setSesiTimes((prev) => ({
      ...prev,
      [sesiId]: { ...prev[sesiId], jamMulai: newValue },
    }));
  };

  const handleEndTimChange = (sesiId: string, newValue: Dayjs | null) => {
    setSesiTimes((prev) => ({
      ...prev,
      [sesiId]: { ...prev[sesiId], jamSelesai: newValue },
    }));
  };

  const handleSavedChange = async () => {
    try {
      const updatedSesi = row.sesi.map((sesi) => ({
        id: sesi.id,
        jamMulai: sesiTimes[sesi.id]?.jamMulai?.format("HH:MM") || null,
        jamSelesai: sesiTimes[sesi.id]?.jamSelesai?.format("HH:MM") || null,
      }));
    } catch (error) {
      console.error("Error", error);
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
        <TableCell align="center">
          {new Date(row.tanggal).toLocaleDateString("id-ID")}
        </TableCell>
        <TableCell align="center">{row.jumlahUjian}</TableCell>
        <TableCell align="center">
          <button className="rounded bg-gray-100 p-2 hover:bg-gray-300">
            <TrashIcon />
          </button>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={6} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <div className="flex justify-between items-center">
                <p className="text-base font-light">
                  Detail Jadwal ujian Tanggal{" "}
                  {new Date(row.tanggal).toLocaleDateString("id-ID")}
                </p>
                <Tooltip onClick={handleClickEditMode} title="Edit Mode" arrow>
                  <button
                    className={`rounded ring-0 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100 p-2 hover:bg-gray-300`}
                  >
                    {editMode ? <XIcon /> : <PencilIcon />}
                  </button>
                </Tooltip>
              </div>
              <form action={""}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">Sesi</TableCell>
                      <TableCell align="center">Jam Mulai</TableCell>
                      <TableCell align="center">Jam Selesai</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {row.sesi.map((sesiRow) => (
                      <TableRow key={sesiRow.id}>
                        <TableCell align="center">
                          Sesi {sesiRow.sesi}
                        </TableCell>
                        <TableCell align="center">
                          {!sesiRow.jamMulai || editMode ? (
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                              <MobileTimePicker
                                label="Pilih Jam"
                                value={sesiTimes[sesiRow.id]?.jamMulai}
                                onChange={(newValue) =>
                                  handleStartTimeChange(sesiRow.id, newValue)
                                }
                                ampm={false}
                              />
                            </LocalizationProvider>
                          ) : (
                            sesiRow.jamMulai
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {!sesiRow.jamSelesai || editMode ? (
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                              <MobileTimePicker
                                label="Pilih Jam"
                                value={sesiTimes[sesiRow.id]?.jamSelesai}
                                onChange={(newValue) => {
                                  handleEndTimChange(sesiRow.id, newValue);
                                }}
                                ampm={false}
                              />
                            </LocalizationProvider>
                          ) : (
                            sesiRow.jamSelesai
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <UjianTable
                  sesi={row.sesi}
                  tanggal={row.tanggal}
                  idJadwal={row.id}
                />
                {editMode && (
                  <div className="w-full flex justify-end">
                    <div className="max-w-md">
                      <FormButton />
                    </div>
                  </div>
                )}
              </form>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function JadwalTable({ title, data }: JadwalUjianProps) {
  return (
    <TableContainer component={Paper}>
      <Toolbar>
        <h6 className="text-lg font-medium">{title}</h6>
      </Toolbar>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell align="center">Tanggal</TableCell>
            <TableCell align="center">Jumlah Ujian</TableCell>
            <TableCell align="center">Action</TableCell>
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

export default DataJadwal;
