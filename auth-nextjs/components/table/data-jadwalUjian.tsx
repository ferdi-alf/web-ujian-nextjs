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
import "dayjs/locale/id";

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
  editMode,
}: {
  sesi: JadwalData["sesi"];
  tanggal: string;
  idJadwal: string;
  editMode: boolean;
}) {
  console.log("sesi", sesi);

  const semuaMapel = Array.from(
    new Set(sesi.flatMap((s) => s.ujian.map((u) => u.mataPelajaran)))
  ).map((mataPelajaran) => ({ mataPelajaran }));

  // State untuk menyimpan waktu ujian
  const [ujianTimes, setUjianTimes] = useState<{
    [ujianId: string]: {
      jamMulai: Dayjs | null;
      jamSelesai: Dayjs | null;
    };
  }>({});

  // Inisialisasi ujianTimes dari data sesi
  useEffect(() => {
    const initialTimes: {
      [ujianId: string]: {
        jamMulai: Dayjs | null;
        jamSelesai: Dayjs | null;
      };
    } = {};

    sesi.forEach((s) => {
      s.ujian.forEach((u) => {
        if (u.id) {
          initialTimes[u.id] = {
            jamMulai: u.jamMulai ? dayjs(u.jamMulai, "HH:mm") : null,
            jamSelesai: u.jamSelesai ? dayjs(u.jamSelesai, "HH:mm") : null,
          };
        }
      });
    });

    setUjianTimes(initialTimes);
  }, [sesi]);

  const handleStartTimeChange = (ujianId: string, newValue: Dayjs | null) => {
    if (!ujianId) return;

    setUjianTimes((prev) => ({
      ...prev,
      [ujianId]: {
        ...(prev[ujianId] || { jamSelesai: null }),
        jamMulai: newValue,
      },
    }));
  };

  const handleEndTimeChange = (ujianId: string, newValue: Dayjs | null) => {
    if (!ujianId) return;

    setUjianTimes((prev) => ({
      ...prev,
      [ujianId]: {
        ...(prev[ujianId] || { jamMulai: null }),
        jamSelesai: newValue,
      },
    }));
  };

  return (
    <div className="flex  items-end  justify-end flex-col mt-2">
      <ModalAddUjianToSesi tanggal={tanggal} idJadwal={idJadwal} />
      <div className="w-full">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mata Pelajaran</TableCell>
              {sesi.map((s) => (
                <TableCell align="center" key={s.id}>
                  Sesi {s.sesi}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {semuaMapel.map((mapel) => (
              <TableRow key={mapel.mataPelajaran}>
                <TableCell>{mapel.mataPelajaran}</TableCell>
                {sesi.map((s) => {
                  const ujian = s.ujian.find(
                    (u) => u.mataPelajaran === mapel.mataPelajaran
                  );
                  return (
                    <TableCell align="center" key={s.id}>
                      {ujian ? (
                        <div className="flex flex-col gap-2">
                          <div>
                            {!ujian.jamMulai || editMode ? (
                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <MobileTimePicker
                                  label="Jam Mulai"
                                  value={
                                    ujianTimes[ujian.id || ""]?.jamMulai || null
                                  }
                                  onChange={(newValue) => {
                                    handleStartTimeChange(
                                      ujian.id || "",
                                      newValue
                                    );
                                  }}
                                  ampm={false}
                                />
                              </LocalizationProvider>
                            ) : (
                              <span>Mulai: {ujian.jamMulai}</span>
                            )}
                          </div>
                          <div>
                            {!ujian.jamSelesai || editMode ? (
                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <MobileTimePicker
                                  label="Jam Selesai"
                                  value={
                                    ujianTimes[ujian.id || ""]?.jamSelesai ||
                                    null
                                  }
                                  onChange={(newValue) => {
                                    handleEndTimeChange(
                                      ujian.id || "",
                                      newValue
                                    );
                                  }}
                                  ampm={false}
                                />
                              </LocalizationProvider>
                            ) : (
                              <span>Selesai: {ujian.jamSelesai}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
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
          {dayjs(row.tanggal).locale("id").format("D MMMM YYYY")}
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
                  {dayjs(row.tanggal).locale("id").format("D MMMM YYYY")}
                </p>
                <Tooltip onClick={handleClickEditMode} title="Edit Mode" arrow>
                  <button
                    className={`rounded ring-0 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100 p-2 hover:bg-gray-300`}
                  >
                    {editMode ? <XIcon /> : <PencilIcon />}
                  </button>
                </Tooltip>
              </div>
              <div className="relative">
                <form onSubmit={handleSavedChange}>
                  {/* Tabel Sesi (Parent) dengan border kiri */}
                  <div className="border-l-4 border-blue-500 pl-4 mb-6 relative">
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
                                <LocalizationProvider
                                  dateAdapter={AdapterDayjs}
                                >
                                  <MobileTimePicker
                                    label="Pilih Jam"
                                    value={sesiTimes[sesiRow.id]?.jamMulai}
                                    onChange={(newValue) =>
                                      handleStartTimeChange(
                                        sesiRow.id,
                                        newValue
                                      )
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
                                <LocalizationProvider
                                  dateAdapter={AdapterDayjs}
                                >
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
                  </div>

                  {/* Flex container untuk UjianTable di kanan dengan border L menghubungkan */}
                  <div className="relative">
                    {/* Border yang menghubungkan parent-child */}
                    <div className="absolute left-0 top-[-24px] h-8 w-6 border-l-4 border-blue-500"></div>
                    <div
                      className="absolute left-0 top-[-6px] h-4 border-b-4 border-blue-500"
                      style={{ width: "calc(11% - 9px)" }}
                    ></div>

                    <div className="flex justify-end">
                      <div className="w-[90%]">
                        <div className="border-l-4 border-blue-500 pl-4">
                          <UjianTable
                            editMode={editMode}
                            sesi={row.sesi}
                            tanggal={row.tanggal}
                            idJadwal={row.id}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {editMode && (
                    <div className="w-full flex justify-end mt-4">
                      <div className="max-w-md">
                        <FormButton />
                      </div>
                    </div>
                  )}
                </form>
              </div>
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
