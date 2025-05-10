/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import useSWR, { mutate } from "swr";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TableLoading from "../skeleton/Table-loading";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PencilIcon, TrashIcon, XIcon } from "lucide-react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { FormButton } from "../button";
import ModalAddUjianToSesi from "../dialog/ModalAddUjianToSesi";
import "dayjs/locale/id";
import { showErrorToast, showSuccessToast } from "../toast/ToastSuccess";
import { LoadingSpinner } from "../fragments/loading-spinner";

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

const formatTimeDisplay = (timeString: string | null) => {
  if (!timeString) return "-";
  return timeString;
};

function Row({ row }: { row: JadwalData }) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sesiTimes, setSesiTimes] = useState<{
    [sesiId: string]: {
      jamMulai: Dayjs | null;
      jamSelesai: Dayjs | null;
    };
  }>({});
  const [ujianTimes, setUjianTimes] = useState<{
    [ujianId: string]: {
      jamMulai: Dayjs | null;
      jamSelesai: Dayjs | null;
    };
  }>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialTimes: {
      [sesiId: string]: {
        jamMulai: Dayjs | null;
        jamSelesai: Dayjs | null;
      };
    } = {};

    row.sesi.forEach((sesiRow) => {
      initialTimes[sesiRow.id] = {
        jamMulai: sesiRow.jamMulai ? dayjs(sesiRow.jamMulai, "HH:mm") : null,
        jamSelesai: sesiRow.jamSelesai
          ? dayjs(sesiRow.jamSelesai, "HH:mm")
          : null,
      };
    });

    setSesiTimes(initialTimes);
  }, [row.sesi, editMode]); // Removed refreshTrigger dependency to prevent loops

  useEffect(() => {
    const initialTimes: {
      [ujianId: string]: {
        jamMulai: Dayjs | null;
        jamSelesai: Dayjs | null;
      };
    } = {};

    row.sesi.forEach((s) => {
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
  }, [row.sesi, editMode]);

  const handleModalSuccess = useCallback(() => {
    mutate("jadwalUjian");
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleClickEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  const handleStartTimeChange = useCallback(
    (sesiId: string, newValue: Dayjs | null) => {
      setSesiTimes((prev) => ({
        ...prev,
        [sesiId]: { ...prev[sesiId], jamMulai: newValue },
      }));
    },
    []
  );

  const handleEndTimChange = useCallback(
    (sesiId: string, newValue: Dayjs | null) => {
      setSesiTimes((prev) => ({
        ...prev,
        [sesiId]: { ...prev[sesiId], jamSelesai: newValue },
      }));
    },
    []
  );

  const handleUjianStartChange = useCallback(
    (ujianId: string, newValue: Dayjs | null) => {
      setUjianTimes((prev) => ({
        ...prev,
        [ujianId]: {
          ...(prev[ujianId] || { jamSelesai: null }),
          jamMulai: newValue,
        },
      }));
    },
    []
  );

  const handleUjianEndChange = useCallback(
    (ujianId: string, newValue: Dayjs | null) => {
      setUjianTimes((prev) => ({
        ...prev,
        [ujianId]: {
          ...(prev[ujianId] || { jamMulai: null }),
          jamSelesai: newValue,
        },
      }));
    },
    []
  );

  const validateFormBeforeSubmit = useCallback(() => {
    const errors: string[] = [];

    // Validasi setiap sesi
    row.sesi.forEach((sesi) => {
      const sesiStart = sesiTimes[sesi.id]?.jamMulai;
      const sesiEnd = sesiTimes[sesi.id]?.jamSelesai;

      // Hanya validasi jika kedua nilai diubah atau keduanya kosong
      if ((sesiStart && !sesiEnd) || (!sesiStart && sesiEnd)) {
        errors.push(`Sesi ${sesi.sesi}: Harap isi jam mulai dan jam selesai`);
      }

      // Jika keduanya diisi, pastikan jamMulai < jamSelesai
      if (sesiStart && sesiEnd && !sesiStart.isBefore(sesiEnd)) {
        errors.push(
          `Sesi ${sesi.sesi}: Jam mulai harus lebih awal dari jam selesai`
        );
      }

      // Validasi ujian dalam sesi ini
      sesi.ujian.forEach((ujian) => {
        if (!ujian.id) return; // Skip jika tidak ada ID

        const ujianId = ujian.id;
        const ujianStart = ujianTimes[ujianId]?.jamMulai;
        const ujianEnd = ujianTimes[ujianId]?.jamSelesai;

        // Jika hanya salah satu yang diisi
        if ((ujianStart && !ujianEnd) || (!ujianStart && ujianEnd)) {
          errors.push(
            `${ujian.mataPelajaran} Sesi ${sesi.sesi}: Harap isi jam mulai dan jam selesai`
          );
        }

        // Jika keduanya diisi, pastikan jamMulai < jamSelesai
        if (ujianStart && ujianEnd && !ujianStart.isBefore(ujianEnd)) {
          errors.push(
            `${ujian.mataPelajaran} Sesi ${sesi.sesi}: Jam mulai harus lebih awal dari jam selesai`
          );
        }

        // Jika ujian dan sesi keduanya diisi, validasi rentang waktu
        if (sesiStart && sesiEnd && ujianStart && ujianEnd) {
          if (ujianStart.isBefore(sesiStart)) {
            errors.push(
              `${ujian.mataPelajaran} Sesi ${sesi.sesi}: Jam mulai ujian tidak boleh sebelum jam mulai sesi`
            );
          }

          if (ujianEnd.isAfter(sesiEnd)) {
            errors.push(
              `${ujian.mataPelajaran} Sesi ${sesi.sesi}: Jam selesai ujian tidak boleh setelah jam selesai sesi`
            );
          }
        }
      });
    });

    return errors;
  }, [row.sesi, sesiTimes, ujianTimes]);

  const handleSavedChange = useCallback(
    async (event: any, isModalTriggered = false) => {
      event.preventDefault();
      try {
        const updatedSesi = row.sesi.map((sesi) => {
          const jamMulai = sesiTimes[sesi.id]?.jamMulai
            ? sesiTimes[sesi.id].jamMulai?.format("HH:mm")
            : sesi.jamMulai; // Gunakan nilai asli jika tidak diubah

          const jamSelesai = sesiTimes[sesi.id]?.jamSelesai
            ? sesiTimes[sesi.id].jamSelesai?.format("HH:mm")
            : sesi.jamSelesai; // Gunakan nilai asli jika tidak diubah

          const updatedUjian = sesi.ujian.map((ujian) => {
            if (!ujian.id) return ujian; // Return ujian asli jika tidak ada ID

            const ujianId = ujian.id;
            const ujianJamMulai = ujianTimes[ujianId]?.jamMulai
              ? ujianTimes[ujianId].jamMulai.format("HH:mm")
              : ujian.jamMulai; // Gunakan nilai asli jika tidak diubah

            const ujianJamSelesai = ujianTimes[ujianId]?.jamSelesai
              ? ujianTimes[ujianId].jamSelesai.format("HH:mm")
              : ujian.jamSelesai; // Gunakan nilai asli jika tidak diubah

            return {
              id: ujianId,
              jamMulai: ujianJamMulai,
              jamSelesai: ujianJamSelesai,
              mataPelajaran: ujian.mataPelajaran,
            };
          });

          return {
            id: sesi.id,
            jamMulai,
            jamSelesai,
            ujian: updatedUjian,
            sesi: sesi.sesi,
          };
        });

        const url = process.env.NEXT_PUBLIC_API_URL;
        const payload = { idJadwal: row.id, sesi: updatedSesi };

        console.log(
          "Data yang dikirim ke API:",
          JSON.stringify(payload, null, 2)
        );

        const res = await fetch(`${url}/api/update-jadwal`, {
          method: "PUT",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const result = await res.json();
        if (result.success && result.message) {
          if (!isModalTriggered) {
            showSuccessToast(result.message);
          }
          mutate("jadwalUjian");
          setEditMode(false);
        } else {
          showErrorToast("Gagal menyimpan data");
          if (result.error && result.errors_field) {
            console.log("Field Errors:", result.errors_field);

            // Tampilkan pesan error lebih jelas
            const errorMessages = result.errors_field
              .map((err: any) => {
                // Format pesan error agar lebih mudah dibaca
                const path = err.path.join(".");
                const message = err.message;
                return `${message} (${path})`;
              })
              .join("\n");

            showErrorToast(errorMessages);
          }
        }
      } catch (error) {
        console.error("Error saat menyimpan:", error);
        showErrorToast("Terjadi kesalahan saat menyimpan data");
      }
    },
    [row.sesi, row.id, sesiTimes, ujianTimes]
  );

  const handleSavedChangeWithValidation = useCallback(
    (event: any) => {
      event.preventDefault();

      const validationErrors = validateFormBeforeSubmit();

      if (validationErrors.length > 0) {
        showErrorToast(validationErrors.join("\n"));
        return;
      }

      handleSavedChange(event);
    },
    [validateFormBeforeSubmit, handleSavedChange]
  );

  const handleDelete = async (id: string) => {
    const url = process.env.NEXT_PUBLIC_API_URL;
    setLoading(true);
    const res = await fetch(`${url}/api/jadwal-ujian/${id}`, {
      method: "DELETE",
    });

    const response = await res.json();

    if (response.success) {
      showSuccessToast(response.message);
      mutate("jadwalUjian");
      setLoading(false);
    } else {
      showErrorToast(response.error_message);
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <TableRow>
          <TableCell>
            <LoadingSpinner />
          </TableCell>
        </TableRow>
      )}
      <TableRow>
        {loading && <LoadingSpinner />}
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
          <button
            onClick={() => handleDelete(row.id)}
            className="rounded bg-gray-100 p-2 hover:bg-gray-300"
          >
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
                <form onSubmit={handleSavedChangeWithValidation}>
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
                                    disabled={!editMode}
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
                                    disabled={!editMode}
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

                  <div className="relative">
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
                            ujianTimes={ujianTimes}
                            onStartTimeChange={handleUjianStartChange}
                            onEndTimeChange={handleUjianEndChange}
                            onModalSuccess={handleModalSuccess}
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

function UjianTable({
  sesi,
  tanggal,
  idJadwal,
  editMode,
  ujianTimes,
  onStartTimeChange,
  onEndTimeChange,
  onModalSuccess,
}: {
  sesi: JadwalData["sesi"];
  tanggal: string;
  idJadwal: string;
  editMode: boolean;
  ujianTimes: {
    [ujianId: string]: {
      jamMulai: Dayjs | null;
      jamSelesai: Dayjs | null;
    };
  };
  onStartTimeChange: (ujianId: string, newValue: Dayjs | null) => void;
  onEndTimeChange: (ujianId: string, newValue: Dayjs | null) => void;
  onModalSuccess?: () => void;
}) {
  const semuaMapel = useMemo(() => {
    const uniqueMapel = Array.from(
      new Set(sesi.flatMap((s) => s.ujian.map((u) => u.mataPelajaran)))
    ).map((mataPelajaran) => ({ mataPelajaran }));

    // Sort alphabetically for consistent order
    return uniqueMapel.sort((a, b) =>
      a.mataPelajaran.localeCompare(b.mataPelajaran)
    );
  }, [sesi]);

  // Memoize the check function to prevent re-renders
  const isSesiTimeValid = useCallback((sesiObj: any) => {
    return sesiObj.jamMulai && sesiObj.jamSelesai;
  }, []);

  return (
    <div className="flex items-end justify-end flex-col mt-2">
      <ModalAddUjianToSesi
        tanggal={tanggal}
        idJadwal={idJadwal}
        onSuccess={onModalSuccess}
      />
      <div className="w-full">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mata Pelajaran</TableCell>
              {sesi.map((s) => (
                <TableCell align="center" key={s.id}>
                  Sesi {s.sesi}
                  {editMode && !isSesiTimeValid(s) && (
                    <span className="text-red-500 text-xs block">
                      (Atur waktu sesi dulu)
                    </span>
                  )}
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

                  const sesiValid = isSesiTimeValid(s);

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
                                    // Prioritaskan nilai dari ujianTimes, lalu fallback ke nilai dari ujian
                                    (ujian.id &&
                                      ujianTimes[ujian.id]?.jamMulai) ||
                                    (ujian.jamMulai
                                      ? dayjs(ujian.jamMulai, "HH:mm")
                                      : null)
                                  }
                                  onChange={(newValue) => {
                                    if (ujian.id) {
                                      onStartTimeChange(ujian.id, newValue);
                                    }
                                  }}
                                  ampm={false}
                                  disabled={!sesiValid || !editMode}
                                />
                              </LocalizationProvider>
                            ) : (
                              <span>
                                Mulai: {formatTimeDisplay(ujian.jamMulai)}
                              </span>
                            )}
                          </div>
                          <div>
                            {!ujian.jamSelesai || editMode ? (
                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <MobileTimePicker
                                  label="Jam Selesai"
                                  value={
                                    // Prioritaskan nilai dari ujianTimes, lalu fallback ke nilai dari ujian
                                    (ujian.id &&
                                      ujianTimes[ujian.id]?.jamSelesai) ||
                                    (ujian.jamSelesai
                                      ? dayjs(ujian.jamSelesai, "HH:mm")
                                      : null)
                                  }
                                  onChange={(newValue) => {
                                    if (ujian.id) {
                                      onEndTimeChange(ujian.id, newValue);
                                    }
                                  }}
                                  ampm={false}
                                  disabled={!sesiValid || !editMode}
                                />
                              </LocalizationProvider>
                            ) : (
                              <span>
                                Selesai: {formatTimeDisplay(ujian.jamSelesai)}
                              </span>
                            )}
                          </div>
                          {editMode && !sesiValid && (
                            <div className="text-red-500 text-xs mt-1">
                              Atur waktu sesi terlebih dahulu
                            </div>
                          )}
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
          {data.length > 0 ? (
            data.map((row) => <Row key={row.id} row={row} />)
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box>
                  <p className="text-center p-3 font-bold">Belum ada data </p>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DataJadwal;
