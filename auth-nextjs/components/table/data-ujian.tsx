/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  IconButton,
  Collapse,
  Box,
  Typography,
  Alert,
} from "@mui/material";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import useSWR, { mutate } from "swr";
import { deleteUjian, getUjian, updateUjian } from "@/lib/crudUjian";
import TableLoading from "@/components/skeleton/Table-loading";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import { Trash2Icon, CalendarIcon, InfoIcon } from "lucide-react";
import { FormButton } from "../button";
import Swal from "sweetalert2";
import ButtonDownloadBeritaAcara from "../DownloadBeritaAcara";
import dayjs from "dayjs";
import "dayjs/locale/id";

interface UjianData {
  id: string;
  token: string;
  waktuPengerjaan: number;
  status: "pending" | "active" | "selesai";
  jamMulai: string;
  jamSelesai: string;
  mataPelajaran: {
    id: string;
    tingkat: "X" | "XI" | "XII";
    pelajaran: string;
  };
  countDownMenit?: number;
}

interface SessionData {
  sesi: number;
  jamMulai: string;
  jamSelesai: string;
  tanggal: string;
  countDown: number;
}

interface WebSocketData {
  type: "upcoming_exam_check" | "today_exam_data";
  hasUpcomingExam: boolean;
  daysUntil: number;
  firstExamDate?: string;
  currentSession?: SessionData;
  nextSession?: SessionData;
  examData?: {
    X: UjianData[];
    XI: UjianData[];
    XII: UjianData[];
  };
}

interface UjianTableProps {
  title: string;
  data: UjianData[];
}

type ErrorObject = {
  [key: string]: string[] | string | undefined;
};

const fetchUjian = async () => {
  try {
    const data = await getUjian();
    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch data");
  }
};

const DataUjian = () => {
  const { data: rawData, error, isLoading } = useSWR("ujian", fetchUjian);
  const [wsData, setWsData] = useState<WebSocketData | null>(null);
  const [countdown, setCountdown] = useState<{ [key: string]: number }>({});

  // Connect to WebSocket
  useEffect(() => {
    const HOST = process.env.NEXT_PUBLIC_API_URL_GOLANG?.replace("http://", "");
    if (!HOST) {
      console.error("NEXT_PUBLIC_API_URL_GOLANG not defined");
      return;
    }

    const ws = new WebSocket(`ws://${HOST}/ws/api/data-ujian`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setWsData(data);

        // Set initial countdowns if applicable
        if (data.type === "today_exam_data" && data.examData) {
          const newCountdown: { [key: string]: number } = {};

          // Process X, XI, XII exams
          ["X", "XI", "XII"].forEach((tingkat) => {
            if (data.examData[tingkat]) {
              data.examData[tingkat].forEach((exam: UjianData) => {
                if (exam.countDownMenit && exam.countDownMenit > 0) {
                  newCountdown[exam.id] = exam.countDownMenit;
                }
              });
            }
          });

          setCountdown(newCountdown);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onopen = () => console.log("WebSocket connected");
    ws.onclose = () => console.log("WebSocket disconnected");
    ws.onerror = (error) => console.error("WebSocket error:", error);

    return () => ws.close();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (Object.keys(countdown).length === 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        const updated: { [key: string]: number } = {};
        let hasChanges = false;

        Object.entries(prev).forEach(([id, value]) => {
          if (value > 0) {
            updated[id] = value - 1;
            hasChanges = true;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [countdown]);

  // Format countdown to minutes
  const formatCountdown = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} menit`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} jam ${mins > 0 ? `${mins} menit` : ""}`;
    }
  };

  // Format time HH:MM
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "-";
    return timeStr;
  };

  // Format date to Indonesian format
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return dayjs(dateStr).locale("id").format("dddd, D MMMM YYYY");
  };

  const { X, XI, XII } = React.useMemo(() => {
    if (!rawData) return { X: [], XI: [], XII: [] };

    const formattedData = rawData.map((ujian: any) => ({
      id: ujian.id,
      token: ujian.token || "-",
      waktuPengerjaan: ujian.waktuPengerjaan,
      status: ujian.status,
      jamMulai: ujian.jamMulai,
      jamSelesai: ujian.jamSelesai,
      mataPelajaran: {
        id: ujian.mataPelajaran.id,
        tingkat: ujian.mataPelajaran.tingkat,
        pelajaran: ujian.mataPelajaran.pelajaran,
      },
    }));

    return {
      X: formattedData.filter(
        (ujian: UjianData) => ujian.mataPelajaran.tingkat === "X"
      ),
      XI: formattedData.filter(
        (ujian: UjianData) => ujian.mataPelajaran.tingkat === "XI"
      ),
      XII: formattedData.filter(
        (ujian: UjianData) => ujian.mataPelajaran.tingkat === "XII"
      ),
    };
  }, [rawData]);

  // Render upcoming exam notification
  const renderUpcomingExamAlert = () => {
    if (!wsData || !wsData.hasUpcomingExam || wsData.daysUntil <= 0) {
      return null;
    }

    return (
      <Alert severity="info" icon={<CalendarIcon />} sx={{ mb: 3 }}>
        <div className="flex items-center">
          <Typography variant="body1">
            Ujian terjadwal {wsData.daysUntil} hari lagi
            {wsData.firstExamDate && ` (${formatDate(wsData.firstExamDate)})`}
          </Typography>
        </div>
      </Alert>
    );
  };

  // Render current session info
  const renderCurrentSession = () => {
    if (
      !wsData ||
      wsData.type !== "today_exam_data" ||
      !wsData.currentSession
    ) {
      return (
        <Typography variant="subtitle1">Belum Ada Ujian Saat Ini</Typography>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">
          Ujian Berlangsung: Sesi {wsData.currentSession.sesi}
          <Typography
            variant="body2"
            component="span"
            color="text.secondary"
            sx={{ ml: 1 }}
          >
            ({formatTime(wsData.currentSession.jamMulai)} -{" "}
            {formatTime(wsData.currentSession.jamSelesai)})
          </Typography>
        </Typography>

        {wsData.nextSession && wsData.nextSession.countDown <= 60 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <div className="flex items-center">
              <Typography variant="body2">
                Sesi selanjutnya ({wsData.nextSession.sesi}) dimulai dalam{" "}
                {formatCountdown(wsData.nextSession.countDown)}
                <Typography
                  variant="body2"
                  component="span"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  ({formatTime(wsData.nextSession.jamMulai)} -{" "}
                  {formatTime(wsData.nextSession.jamSelesai)})
                </Typography>
              </Typography>
            </div>
          </Alert>
        )}
      </Box>
    );
  };

  if (isLoading) {
    return <TableLoading />;
  }
  if (error) {
    showErrorToast("Gagal memuat data");
    return <div>Error loading data...</div>;
  }

  return (
    <div className="mt-2 flex flex-col gap-y-5">
      {renderUpcomingExamAlert()}

      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Status Ujian
        </Typography>
        {renderCurrentSession()}
      </Box>

      <UjianTable title="Daftar Ujian Tingkat X" data={X} />
      <UjianTable title="Daftar Ujian Tingkat XI" data={XI} />
      <UjianTable title="Daftar Ujian Tingkat XII" data={XII} />
    </div>
  );
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 border-gray-500",
  active: "bg-green-100 text-green-800 border-green-400 ",
  selesai: "bg-purple-100 text-purple-800 border-purple-400 ",
};

function Row({ row }: { row: UjianData }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [state, formAction] = useActionState(updateUjian, null);

  const handleFormSubmit = async (formData: FormData) => {
    const status = formData.get("status") as string;

    // Check if status is being set to active
    if (status === "active") {
      const result = await Swal.fire({
        icon: "info",
        title: "Konfirmasi Aktivasi Ujian",
        text: `Anda akan mengaktifkan ujian ${row.mataPelajaran.tingkat} - ${row.mataPelajaran.pelajaran} jam mulai dan jam selesai akan dihitung setelah mengaktivasi ujian ini`,
        showCancelButton: true,
        confirmButtonText: "Ya, Aktifkan",
        cancelButtonText: "Batal",
        reverseButtons: true,
      });

      // If user cancels, stop form submission
      if (!result.isConfirmed) {
        return;
      }
    }

    startTransition(() => {
      formAction(formData);
    });
  };

  const lastProcessedStateRef = useRef<{
    success?: boolean;
    error?: ErrorObject;
    message?: string;
  } | null>(null);

  useEffect(() => {
    const isStateDifferent = () => {
      if (!lastProcessedStateRef.current && state) return true;

      if (state?.success !== lastProcessedStateRef.current?.success)
        return true;

      if (state?.message !== lastProcessedStateRef.current?.message)
        return true;

      // Safe error comparison
      const currentError = state?.error as ErrorObject | undefined;
      const lastError = lastProcessedStateRef.current?.error;

      // Compare error keys
      const currentErrorKeys = currentError ? Object.keys(currentError) : [];
      const lastErrorKeys = lastError ? Object.keys(lastError) : [];

      if (currentErrorKeys.length !== lastErrorKeys.length) return true;

      // Detailed error comparison
      return currentErrorKeys.some((key) => {
        const currentValue = currentError?.[key];
        const lastValue = lastError?.[key];

        // Convert to string for comparison, handling array and string types
        const currentStringValue = Array.isArray(currentValue)
          ? JSON.stringify(currentValue)
          : currentValue;

        const lastStringValue = Array.isArray(lastValue)
          ? JSON.stringify(lastValue)
          : lastValue;

        return currentStringValue !== lastStringValue;
      });
    };

    // Only process if the state is different
    if (state && isStateDifferent()) {
      // Handle errors
      if (state?.error) {
        const errorObj = state.error as ErrorObject;
        Object.entries(errorObj).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => showErrorToast(`${field}: ${msg}`));
          } else if (typeof messages === "string") {
            showErrorToast(`${field}: ${messages}`);
          }
        });
      }

      // Handle success
      if (state?.success && state?.message) {
        showSuccessToast(state.message);
        mutate("ujian");
      }

      // Update the ref with the current processed state
      lastProcessedStateRef.current = state;
    }
  }, [state]);

  useEffect(() => {
    if (row.token && row.token !== "-") {
      setToken(row.token);
    } else {
      setToken("");
    }
  }, [row]);

  const generateRandomToken = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";

    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    setToken(result);
  };

  const handleDelete = async (row: UjianData) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Apakah Anda yakin?",
      text: `Jika Anda menghapus ujian ${row.mataPelajaran.tingkat} ${row.mataPelajaran.pelajaran}, semua yang berelasi dengan ujian ini termasuk data hasil ujian dan data kecurangan di ujian ini akan terhapus. Harap backup data terkait sebelum menghapus!`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      try {
        const res = await deleteUjian(row.id);

        if (res.error && res.message) {
          showErrorToast(res.message);
        }
        if (res.success && res.message) {
          showSuccessToast(res.message);
          mutate("ujian");
        }
      } catch (error) {
        console.log(error);
        showErrorToast("Gagal menghapus data");
      }
    }
  };

  // Render status with potential countdown
  const renderStatus = () => {
    if (row.status === "active") {
      return (
        <span
          className={`capitalize font-medium text-xs me-2 px-2.5 py-0.5 rounded-sm border ${statusColors.active}`}
        >
          Aktif
        </span>
      );
    } else if (row.status === "selesai") {
      return (
        <span
          className={`capitalize font-medium text-xs me-2 px-2.5 py-0.5 rounded-sm border ${statusColors.selesai}`}
        >
          Selesai
        </span>
      );
    } else {
      return (
        <span
          className={`capitalize font-medium text-xs me-2 px-2.5 py-0.5 rounded-sm border ${statusColors.pending}`}
        >
          {row.status}
        </span>
      );
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
        <TableCell className="truncate">
          {row.mataPelajaran.tingkat}
          {" - "}
          {row.mataPelajaran.pelajaran}
        </TableCell>
        <TableCell align="center">{row.token}</TableCell>
        <TableCell align="center">{renderStatus()}</TableCell>
        <TableCell align="center">{row.waktuPengerjaan} menit</TableCell>
        <TableCell
          align="center"
          sx={{ display: "flex", flexWrap: "nowrap", gap: "8px" }}
        >
          <button
            onClick={() => handleDelete(row)}
            className="rounded bg-gray-100 p-2 hover:bg-gray-300"
          >
            <Trash2Icon />
          </button>
          <ButtonDownloadBeritaAcara />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <p className="text-base font-light">
                Detail Ujian {row.mataPelajaran.tingkat} {" - "}{" "}
                {row.mataPelajaran.pelajaran}
              </p>
              <form
                action={handleFormSubmit}
                className="w-full mt-5 flex flex-col gap-y-4"
              >
                <input type="hidden" name="id" value={row.id} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full">
                    <p className="font-medium">Status Ujian</p>
                    <Select defaultValue={row.status} name="status">
                      <SelectTrigger>
                        <SelectValue placeholder="Set status ujian" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Status ujian</SelectLabel>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="selesai">Selesai</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full">
                    <p className="font-medium">Waktu pengerjaan</p>
                    <Select
                      defaultValue={
                        row.waktuPengerjaan
                          ? row.waktuPengerjaan.toString()
                          : "-"
                      }
                      name="waktuPengerjaan"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih waktu pengerjaan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Waktu pengerjaan</SelectLabel>
                          <SelectItem value="30">30 menit</SelectItem>
                          <SelectItem value="60">60 menit</SelectItem>
                          <SelectItem value="120">120 menit</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="start-time"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Jam Mulai:
                    </label>
                    <div className="relative">
                      <input
                        defaultValue={row.jamMulai || ""}
                        type="time"
                        id="start-time"
                        name="jamMulai"
                        className="bg-gray-50 border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="end-time"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Jam Selesai:
                    </label>
                    <div className="relative">
                      <input
                        defaultValue={row.jamSelesai || ""}
                        type="time"
                        id="end-time"
                        name="jamSelesai"
                        className="bg-gray-50 border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <label className="mb-2 text-sm font-medium text-gray-900 sr-only">
                    Token
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Masukan token ujian"
                    />
                    <button
                      onClick={generateRandomToken}
                      type="button"
                      className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2"
                    >
                      Buat otomatis
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-md">
                    <FormButton />
                  </div>
                </div>
              </form>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function UjianTable({ title, data }: UjianTableProps) {
  return (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Toolbar>
        <Typography variant="h6" fontWeight="medium">
          {title}
        </Typography>
      </Toolbar>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Pelajaran</TableCell>
            <TableCell align="center">Token</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="center">Waktu Pengerjaan</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((row) => <Row key={row.id} row={row} />)
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">
                  Tidak ada ujian terjadwal untuk tingkat ini
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DataUjian;
