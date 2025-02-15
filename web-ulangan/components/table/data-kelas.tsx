/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import { alpha } from "@mui/material/styles";
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
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import { deleteKelas, getKelas } from "@/lib/crudKelas";
import useSWR, { useSWRConfig } from "swr";
import Swal from "sweetalert2";
import TableLoading from "@/components/skeleton/Table-loading";
import toast from "react-hot-toast";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import SearchField from "@/components/search";
import { useSearchParams } from "next/navigation";

interface KelasData {
  id: string;
  tingkat: string;
  jurusan: string | null;
}

const fetchKelas = async () => {
  try {
    const data = await getKelas();
    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch data");
  }
};

export default function EnhancedTable() {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const { mutate } = useSWRConfig();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search")?.toLocaleLowerCase() ?? "";

  const {
    data: rawData,
    error,
    // mutate,
    isLoading,
  } = useSWR("kelas", fetchKelas);

  const filteredData = React.useMemo(() => {
    // Pertama format data seperti sebelumnya
    const formattedData = rawData
      ? rawData.map((kelas: KelasData) => ({
          id: kelas.id,
          tingkat: kelas.tingkat,
          jurusan: kelas.jurusan,
        }))
      : [];

    // Kemudian terapkan pencarian pada data yang sudah diformat
    return formattedData.filter((item) => {
      if (!searchTerm) return true;

      return (
        item.tingkat.toLowerCase().includes(searchTerm) ||
        item.jurusan?.toLowerCase().includes(searchTerm)
      );
    });
  }, [rawData, searchTerm]);

  if (isLoading) {
    return <TableLoading />;
  }

  if (error) {
    toast.error("gagal memuat data");
    return <div>Error loading data</div>;
  }

  const handleDelete = async (
    selectedIds: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selectedIds.length === 0) return;

    const selectedClasses = filteredData.filter((kelas) =>
      selectedIds.includes(kelas.id)
    );

    const classNames = selectedClasses
      .map((kelas) => `${kelas.tingkat} ${kelas.jurusan}`)
      .join(", ");

    const result = await Swal.fire({
      icon: "warning",
      title: "Apakah Anda yakin?",
      text: `Jika Anda menghapus kelas ${classNames}, semua yang berelasi dengan kelas ini termasuk siswa dan proktor akan terhapus.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        mutate(
          "kelas",
          (currentData: any) =>
            currentData?.filter(
              (kelas: any) => !selectedIds.includes(kelas.id)
            ),
          false
        );

        const response = await deleteKelas(selectedIds);

        if (response.success) {
          mutate("kelas");
          setSelected([]);
          showSuccessToast(response.message);
        } else {
          throw new Error(response.message);
        }
      } catch (error) {
        console.error(error);
        showErrorToast("Gagal menghapus data");

        mutate("kelas");
      }
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Kelastable
        title="Data Kelas"
        data={filteredData}
        selected={selected}
        setSelected={setSelected}
        handleDelete={() => handleDelete(selected, setSelected)}
        page={page}
        setPage={setPage}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
      />
    </Box>
  );
}

interface KelasTableProps {
  title: string;
  data: KelasData[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  handleDelete: () => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  rowsPerPage: number;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
}

function Kelastable({
  title,
  data,
  selected,
  setSelected,
  handleDelete,
  page,
  setPage,
  rowsPerPage,
  setRowsPerPage,
}: KelasTableProps) {
  const isSelected = (id: string) => selected.includes(id);

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    setSelected((prevStated) =>
      prevStated.includes(id)
        ? prevStated.filter((selectedId) => selectedId !== id)
        : [...prevStated, id]
    );
  };

  return (
    <>
      <div className="w-full pr-3 pt-4 flex justify-end">
        <SearchField />
      </div>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            bgcolor:
              selected.length > 0
                ? (theme) =>
                    alpha(
                      theme.palette.primary.main,
                      theme.palette.action.activatedOpacity
                    )
                : "transparent",
          }}
        >
          {selected.length > 0 ? (
            <Typography
              sx={{ flex: "1 1 100%" }}
              color="inherit"
              variant="subtitle1"
            >
              {selected.length} selected
            </Typography>
          ) : (
            <Typography sx={{ flex: "1 1 100%" }} variant="h6">
              {title}
            </Typography>
          )}
          {selected.length > 0 ? (
            <Tooltip title="Delete">
              <IconButton onClick={handleDelete}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Filter list">
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>#</TableCell>
                <TableCell>Tingkat</TableCell>
                <TableCell>Jurusan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  const isItemSelected = isSelected(row.id);
                  return (
                    <TableRow
                      hover
                      onClick={(event) => handleClick(event, row.id)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      key={row.id}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={isItemSelected} />
                      </TableCell>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>

                      <TableCell>{row.tingkat}</TableCell>
                      <TableCell>{row.jurusan}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
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
    </>
  );
}
