/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  alpha,
  Box,
  Checkbox,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { MoveLeft } from "lucide-react";
import { SetStateAction, useMemo, useState } from "react";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteIcon from "@mui/icons-material/Delete";
import Image from "next/image";
import { deleteSiswa } from "@/lib/crudSiswa";
import Swal from "sweetalert2";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import { useSWRConfig } from "swr";
import SearchField from "@/components/search";
import { useSearchParams } from "next/navigation";
import ModalUpdateSiswa from "@/components/dialog/ModalUpdateSiswa";

interface SiswaData {
  id: string;
  name: string;
  kelasId: {
    id: string;
    tingkat: string;
    jurusan: string;
  };
  nomor_ujian: string;
  kelamin: string;
  nis: string;
  ruang: string;
  userId: {
    id: string;
    username: string;
    role: string;
    image: string;
  };
}

interface FrameDataUsersProps {
  tingkat: string;
  jurusan: string;
  siswaList: SiswaData[];
}

const FrameDataUsers = ({
  tingkat,
  jurusan,
  siswaList,
}: FrameDataUsersProps) => {
  const [frame, setFrame] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search")?.toLocaleLowerCase() ?? "";

  const filteredSiswa = useMemo(() => {
    const filteredByClass = siswaList.filter(
      (siswa) =>
        siswa.kelasId?.tingkat === tingkat && siswa.kelasId?.jurusan === jurusan
    );

    const filtered = filteredByClass.filter((item) => {
      if (!searchTerm) return true;

      return (
        item.name.toLowerCase().includes(searchTerm) ||
        item.nis.toLowerCase().includes(searchTerm) ||
        item.ruang.toLowerCase().includes(searchTerm) ||
        item.kelamin.toLowerCase().includes(searchTerm)
      );
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [siswaList, tingkat, jurusan, searchTerm]);

  const { mutate } = useSWRConfig();

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredSiswa.map((siswa) => siswa.id);
      setSelected(newSelected);
      return;
    }

    setSelected([]);
  };

  const handleShowFrame = () => {
    setFrame((prev) => !prev);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const handleDelete = async (
    selectedIds: string[],
    setSelected: React.Dispatch<SetStateAction<string[]>>
  ) => {
    const result = await Swal.fire({
      title: "Apa kamu yakin",
      text: `Kamu akan menghapus ${selected.length} data dari kelas ${tingkat} - ${jurusan}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const response = await deleteSiswa(selectedIds);
        mutate(
          "siswa",
          (currentData: any) =>
            currentData?.filter(
              (kelas: any) => !selectedIds.includes(kelas.id)
            ),
          false
        );
        if (response.success) {
          setSelected([]);
          mutate("siswa");
          showSuccessToast(
            `Berhasil menghapus ${selectedIds.length} data dari kelas ${tingkat} - ${jurusan}`
          );
        }
      } catch (error) {
        console.log(error);
        showErrorToast("Gagal menghapus data");
      }
    }
  };

  return (
    <div>
      {/* Tombol untuk membuka frame */}
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
                <h1 className="text-2xl  font-semibold">
                  Data siswa {tingkat} - {jurusan}
                </h1>
              </div>
            </div>

            <div className="py-2">
              <Box sx={{ width: "100%" }}>
                <Paper>
                  <div className="w-full pr-3 pt-4 flex justify-end">
                    <SearchField />
                  </div>

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
                      <div className="w-full flex items-center justify-between">
                        <Typography sx={{ flex: "1 1 100%" }} variant="h6">
                          {tingkat} - {jurusan}
                        </Typography>
                      </div>
                    )}
                    {selected.length > 0 ? (
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => handleDelete(selected, setSelected)}
                        >
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
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={
                                selected.length > 0 &&
                                selected.length < filteredSiswa.length
                              }
                              checked={
                                filteredSiswa.length > 0 &&
                                selected.length === filteredSiswa.length
                              }
                              onChange={handleSelectAllClick}
                            />
                          </TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>Avatar</TableCell>
                          <TableCell>Nama</TableCell>
                          <TableCell>NIS</TableCell>
                          <TableCell>Ruang</TableCell>
                          <TableCell>Jenis Kelamin</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredSiswa
                          .slice(
                            page * rowsPerPage,
                            page * rowsPerPage + rowsPerPage
                          )
                          .map((siswa, index) => {
                            const isItemSelected = isSelected(siswa.id);
                            return (
                              <TableRow
                                hover
                                onClick={(event) =>
                                  handleClick(event, siswa.id)
                                }
                                role="checkbox"
                                aria-checked={isItemSelected}
                                key={siswa.id}
                                selected={isItemSelected}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox checked={isItemSelected} />
                                </TableCell>
                                <TableCell>
                                  {page * rowsPerPage + index + 1}
                                </TableCell>
                                <TableCell>
                                  <Image
                                    className="rounded-full h-12 w-12 border"
                                    height={50}
                                    width={50}
                                    alt="avatar"
                                    src={siswa.userId?.image || "/avatar.png"}
                                  />
                                </TableCell>
                                <TableCell>{siswa.name}</TableCell>
                                <TableCell>{siswa.nis}</TableCell>
                                <TableCell>{siswa.ruang}</TableCell>
                                <TableCell>{siswa.kelamin}</TableCell>
                                <TableCell>
                                  <ModalUpdateSiswa siswa={siswa} />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredSiswa.length}
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

export default FrameDataUsers;
