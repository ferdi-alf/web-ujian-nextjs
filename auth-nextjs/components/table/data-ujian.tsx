/* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-unused-vars */
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
  Chip,
  Divider,
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
import { mutate } from "swr";
import { deleteUjian, updateUjian } from "@/lib/crudUjian";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import { Trash2Icon, CalendarIcon } from "lucide-react";
import { FormButton } from "../button";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import "dayjs/locale/id";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TableLoading from "../skeleton/Table-loading";
import { number } from "zod";

interface UjianData {
  id: string;
  mataPelajaran: string;
  jamMulai: string;
  jamSelesai: string;
  status: string;
  token: string;
  ujianBerikutnyaAda: boolean;
  hitungMundurAktif: boolean;
  sisaWaktuMulai: number | null;
  waktuPengerjaan: number;
}

interface SesiData {
  id: string;
  isSesi: number;
  jamMulai: string;
  jamSelesai: string;
  isNextSesi: number;
  hitungMundurSesiAktif: boolean;
  sisaWaktuSesi: number | null;
  adaSesiBerikutnya: boolean;
  ujian: UjianData[];
}

interface TingkatData {
  tanggal: string;
  sisaHari: number;
  nextUjianAda: boolean;
  pelacakUjianHariAktif: boolean;
  sesiUjian: SesiData[];
}

interface WebSocketData {
  X: TingkatData[];
  XI: TingkatData[];
  XII: TingkatData[];
}

interface UjianTableProps {
  title: string;
  data: UjianData[];
  tingkatData?: TingkatData;
  sesiAktif?: SesiData | null;
}

const ExamTracker = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsData, setWsData] = useState<WebSocketData | null>(null);
  console.log("wsData", wsData);
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const HOST = process.env.NEXT_PUBLIC_API_URL_GOLANG;
        if (!HOST) {
          throw new Error("NEXT_PUBLIC_API_URL_GOLANG not defined");
        }

        const response = await fetch(`${HOST}/api/data-ujian`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setWsData(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [error]);

  useEffect(() => {
    const HOST = process.env.NEXT_PUBLIC_API_URL_GOLANG?.replace("http://", "");
    if (!HOST) {
      setError("NEXT_PUBLIC_API_URL_GOLANG not defined");
      return;
    }

    let reconnectTimeout: NodeJS.Timeout;
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      ws = new WebSocket(`ws://${HOST}/ws/api/data-ujian`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setWsData(data);
        } catch (err) {
          console.error("Error parsing WebSocket data:", err);
        }
      };

      ws.onopen = () => {
        console.log("WebSocket connected");
        // Reset error state if reconnected after error
        if (error) setError(null);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);

        // Try to reconnect after 3 seconds
        reconnectTimeout = setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error. Reconnecting...");
      };
    };

    connectWebSocket();

    // Cleanup function
    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [error]);

  const tingkatX = wsData?.X || [];
  const tingkatXI = wsData?.XI || [];
  const tingkatXII = wsData?.XII || [];

  const renderAlertUjian = () => {
    if (tingkatX.some((ujian) => ujian.sisaHari > 0)) {
      const ujian = tingkatX.find((u) => u.sisaHari > 0);
      return (
        <Alert severity="info" className="mb-2">
          Ujian Tingkat X terjadwal {ujian?.sisaHari} hari lagi (
          {dayjs(ujian?.tanggal).format("DD MMMM YYYY")})
        </Alert>
      );
    }

    if (tingkatXI.some((ujian) => ujian.sisaHari > 0)) {
      const ujian = tingkatXI.find((u) => u.sisaHari > 0);
      return (
        <Alert severity="info" className="mb-2">
          Ujian Tingkat XI terjadwal {ujian?.sisaHari} hari lagi (
          {dayjs(ujian?.tanggal).format("DD MMMM YYYY")})
        </Alert>
      );
    }

    if (tingkatXII.some((ujian) => ujian.sisaHari > 0)) {
      const ujian = tingkatXII.find((u) => u.sisaHari > 0);
      return (
        <Alert severity="info" className="mb-2">
          Ujian Tingkat XII terjadwal {ujian?.sisaHari} hari lagi (
          {dayjs(ujian?.tanggal).format("DD MMMM YYYY")})
        </Alert>
      );
    }

    return null;
  };

  const getSesiAktif = (tingkat: TingkatData[]): SesiData | null => {
    for (const t of tingkat) {
      const sesi = t.sesiUjian.find((s) => s.hitungMundurSesiAktif);
      if (sesi) return sesi;
    }
    return null;
  };

  if (loading) {
    return (
      <div>
        <TableLoading />
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="mt-2 flex flex-col gap-y-5">
      {renderAlertUjian()}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Status Ujian
        </Typography>
      </Box>

      <UjianTable
        title="Daftar Ujian Tingkat X"
        data={tingkatX.flatMap((tingkat) =>
          tingkat.sesiUjian.flatMap((sesi) => sesi.ujian)
        )}
        tingkatData={tingkatX[0]}
        sesiAktif={getSesiAktif(tingkatX)}
      />

      <UjianTable
        title="Daftar Ujian Tingkat XI"
        data={tingkatXI.flatMap((tingkat) =>
          tingkat.sesiUjian.flatMap((sesi) => sesi.ujian)
        )}
        tingkatData={tingkatXI[0]}
        sesiAktif={getSesiAktif(tingkatXI)}
      />

      <UjianTable
        title="Daftar Ujian Tingkat XII"
        data={tingkatXII.flatMap((tingkat) =>
          tingkat.sesiUjian.flatMap((sesi) => sesi.ujian)
        )}
        tingkatData={tingkatXII[0]}
        sesiAktif={getSesiAktif(tingkatXII)}
      />
    </div>
  );
};

// Status color mapping
const statusColors: Record<string, string> = {
  pending: "bg-gray-100  text-gray-800 border-gray-500",
  active: "bg-green-100 text-green-800 border-green-400",
  selesai: "bg-purple-100 text-purple-800 border-purple-400",
};

// Individual exam row component
function Row({
  row,
  tingkatData,
}: {
  row: UjianData;
  tingkatData?: TingkatData;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    if (row.token && row.token !== "-") {
      setToken(row.token);
    } else {
      setToken("");
    }
  }, [row]);

  return (
    <>
      <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell className="truncate">{row.mataPelajaran}</TableCell>
        <TableCell align="center">{token || "-"}</TableCell>
        <TableCell align="center">
          <div
            className={
              statusColors[row.status] +
              " px-2 py-1  rounded text-sm border inline-block"
            }
          >
            {row.status}
          </div>
          {row.hitungMundurAktif && row.sisaWaktuMulai != null && (
            <div className="text-xs truncate text-blue-600 mt-1">
              {row.sisaWaktuMulai} menit lagi terjadwal active
            </div>
          )}
        </TableCell>

        <TableCell align="center">{row.waktuPengerjaan} menit</TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={6} sx={{ py: 0 }}>
            <Box sx={{ m: 2 }}>
              <Typography variant="subtitle2" gutterBottom component="div">
                Detail Ujian
              </Typography>
              <Typography variant="body2">
                Jam Mulai: {row.jamMulai || "Belum ditentukan"}
              </Typography>
              <Typography variant="body2">
                Jam Selesai: {row.jamSelesai || "Belum ditentukan"}
              </Typography>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function UjianTable({ title, data, tingkatData, sesiAktif }: UjianTableProps) {
  return (
    <TableContainer component={Paper} sx={{ mb: 3, width: "100%" }}>
      {/* Toolbar tetap full lebar dan tidak ikut scroll */}
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          flexWrap: "wrap", // biar responsif
          gap: 2,
        }}
      >
        <Typography variant="h6" className="truncate" fontWeight="medium">
          {title}
        </Typography>

        {sesiAktif?.hitungMundurSesiAktif &&
          sesiAktif?.sisaWaktuSesi !== null && (
            <Alert severity="info" sx={{ whiteSpace: "nowrap" }}>
              {sesiAktif.isNextSesi ? (
                <>
                  Sesi {sesiAktif.isSesi} akan dimulai dalam{" "}
                  {sesiAktif.sisaWaktuSesi} menit lagi
                </>
              ) : (
                <>
                  Sesi {sesiAktif.isSesi} akan dimulai dalam{" "}
                  {sesiAktif.sisaWaktuSesi} menit lagi
                </>
              )}
            </Alert>
          )}
      </Toolbar>

      <Divider />

      {/* WRAPPER YANG BISA DI-SCROLL */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Table sx={{ minWidth: 650 }} className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Pelajaran</TableCell>
              <TableCell align="center">Token</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Waktu Pengerjaan</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((row) => (
                <Row key={row.id} row={row} tingkatData={tingkatData} />
              ))
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
      </Box>
    </TableContainer>
  );
}

export default ExamTracker;
