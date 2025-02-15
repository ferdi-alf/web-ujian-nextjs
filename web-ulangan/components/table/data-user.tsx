/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  TableContainer,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Checkbox,
  TableHead,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import { alpha } from "@mui/material/styles";
import Image from "next/image";
import { deleteUsers, getUsers } from "@/lib/crudUsers";
import ModalUpdateUsers from "@/components/dialog/ModalUpdateUsers";
import TableLoading from "@/components/skeleton/Table-loading";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";

interface KelasId {
  id: string;
  tingkat: string;
  jurusan: string;
}

interface UsersData {
  id: string;
  username: string;
  role: string;
  kelasId?: KelasId;
  image?: string;
}

// Wrapper untuk getUsers yang bisa digunakan dengan SWR
const fetchUsers = async () => {
  try {
    const data = await getUsers();
    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch users");
  }
};

export default function DataUsers() {
  const [selectedAdmins, setSelectedAdmins] = React.useState<string[]>([]);
  const [selectedProktors, setSelectedProktors] = React.useState<string[]>([]);
  const [pageAdmins, setPageAdmins] = React.useState(0);
  const [rowsPerPageAdmins, setRowsPerPageAdmins] = React.useState(5);
  const [pageProktors, setPageProktors] = React.useState(0);
  const [rowsPerPageProktors, setRowsPerPageProktors] = React.useState(5);

  // Menggunakan SWR dengan fungsi getUsers
  const { data: rawData, error, isLoading } = useSWR("users", fetchUsers);
  const { mutate } = useSWRConfig();

  const { admins, proktors } = React.useMemo(() => {
    if (!rawData) return { admins: [], proktors: [] };

    const formattedData = rawData.map((user: any) => ({
      id: user.id,
      username: user.username || "",
      role: user.role,
      kelasId: user.kelas
        ? {
            id: user.kelas.id,
            tingkat: user.kelas.tingkat,
            jurusan: user.kelas.jurusan || "",
          }
        : undefined,
      image: user.image || "",
    }));

    return {
      admins: formattedData.filter((user: UsersData) => user.role === "ADMIN"),
      proktors: formattedData.filter(
        (user: UsersData) => user.role === "PROKTOR"
      ),
    };
  }, [rawData]);

  if (isLoading) {
    return <TableLoading />;
  }

  const handleDelete = async (
    selectedIds: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    try {
      const response = await deleteUsers(selectedIds);
      mutate(
        "users",
        (currentData: any) =>
          currentData?.filter((kelas: any) => !selectedIds.includes(kelas.id)),
        false // false = tidak fetch ulang langsung
      );
      if (response.success) {
        mutate("users");
        setSelected([]);
        showSuccessToast(response.message);
      }
    } catch (error) {
      console.error("Error deleting users", error);
      showErrorToast("Gagal menghapus data user");
    }
  };

  if (error) {
    showErrorToast("Gagal memuat data");
    return <div>Error loading data...</div>;
  }

  return (
    <Box sx={{ width: "100%" }}>
      <UserTable
        title="Data Akses Admin"
        users={admins}
        selected={selectedAdmins}
        setSelected={setSelectedAdmins}
        handleDelete={() => handleDelete(selectedAdmins, setSelectedAdmins)}
        page={pageAdmins}
        setPage={setPageAdmins}
        rowsPerPage={rowsPerPageAdmins}
        setRowsPerPage={setRowsPerPageAdmins}
      />
      <UserTable
        title="Data Akses Proktor"
        users={proktors}
        selected={selectedProktors}
        setSelected={setSelectedProktors}
        handleDelete={() => handleDelete(selectedProktors, setSelectedProktors)}
        page={pageProktors}
        setPage={setPageProktors}
        rowsPerPage={rowsPerPageProktors}
        setRowsPerPage={setRowsPerPageProktors}
      />
    </Box>
  );
}

// UserTable component remains the same but with added mutate prop
interface UserTableProps {
  title: string;
  users: UsersData[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  handleDelete: () => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  rowsPerPage: number;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
  // mutate: () => Promise<any>;
}

// Reusable User Table Component
function UserTable({
  title,
  users,
  selected,
  setSelected,
  handleDelete,
  page,
  setPage,
  rowsPerPage,
  setRowsPerPage,
}: UserTableProps) {
  const isSelected = (id: string) => selected.includes(id);

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    setSelected((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((selectedId) => selectedId !== id)
        : [...prevSelected, id]
    );
  };

  return (
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
          {/* Table Head */}
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"></TableCell>
              <TableCell>No</TableCell>
              <TableCell>Avatar</TableCell>
              <TableCell>Username</TableCell>
              {title === "Data Akses Proktor" && <TableCell>Kelas</TableCell>}
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => {
                const isItemSelected = isSelected(row.id);
                console.log(row);
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
                    <TableCell>
                      <Image
                        className="rounded-full"
                        height={50}
                        width={50}
                        alt="avatar"
                        src={row.image || "/avatar.png"}
                      />
                    </TableCell>
                    <TableCell>{row.username}</TableCell>
                    {/* Hanya tampil di tabel Proktor */}
                    {title === "Data Akses Proktor" && (
                      <>
                        <TableCell className="truncate">
                          {row.kelasId?.tingkat || "-"} {" - "}
                          {row.kelasId?.jurusan || "-"}
                        </TableCell>
                      </>
                    )}
                    <TableCell>{row.role}</TableCell>
                    <TableCell>
                      <ModalUpdateUsers userData={row} />
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[2, 5, 10, 25]}
        component="div"
        count={users.length}
        rowsPerPage={rowsPerPage}
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
