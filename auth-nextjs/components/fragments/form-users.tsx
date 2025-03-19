/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormControl, FormHelperText, InputLabel, Input } from "@mui/material";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserData {
  id: string;
  username: string;
  role: string;
  jurusan?: string;
  image?: string;
}

const FormInputUsers = ({
  state,
  initialData,
}: {
  state: any;
  initialData: UserData;
}) => {
  const [selectedRole, setSelectedRole] = React.useState(initialData?.role);

  const usernameError = Array.isArray(state?.error?.username)
    ? state.error.username[0]
    : state?.error?.username;
  const roleError = Array.isArray(state?.error?.role)
    ? state.error.role[0]
    : state?.error?.role;
  const jurusanError = Array.isArray(state?.error?.jurusan)
    ? state.error.jurusan[0]
    : state?.error?.jurusan;
  const passwordError = Array.isArray(state?.error?.password)
    ? state.error.password[0]
    : state?.error?.password;

  const handleModalClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Mencegah event bubbling ke elemen induk
  };

  return (
    <>
      <input type="hidden" name="id" value={initialData?.id} />
      <FormControl
        fullWidth
        className="mt-5"
        error={!!usernameError}
        variant="standard"
        sx={{
          "& .MuiInput-root": {
            backgroundColor: "transparent",
            "&:before": {
              borderBottom: "1px solid rgba(0, 0, 0, 0.42)",
            },
            "&:hover:not(.Mui-disabled):before": {
              borderBottom: "2px solid rgba(0, 0, 0, 0.87)",
            },
            "&:after": {
              borderBottom: "2px solid #3b82f6",
            },
            "& input": {
              color: "inherit",
              backgroundColor: "transparent",
              "&:-webkit-autofill": {
                WebkitBoxShadow: "0 0 0 1000px transparent inset",
                WebkitTextFillColor: "inherit",
                transition: "background-color 5000s ease-in-out 0s",
              },
            },
          },
          "& .MuiInputLabel-root": {
            color: "rgba(0, 0, 0, 0.7)",
            "&.Mui-focused": {
              color: "#3b82f6",
            },
          },
          "& .MuiFormHelperText-root": {
            color: "error.main",
          },
        }}
      >
        <InputLabel htmlFor="component-error">Username</InputLabel>
        <Input
          onClick={handleModalClick}
          placeholder="Masukan username"
          name="username"
          id="component-error"
          defaultValue={initialData?.username}
          aria-describedby="component-error-text"
        />
        <FormHelperText id="component-error-text">
          {usernameError}
        </FormHelperText>
      </FormControl>

      <label className="block mt-3 text-start mb-2 text-sm font-medium text-gray-900 ">
        Pilih Role
      </label>
      <select
        id="role"
        onClick={handleModalClick}
        name="role"
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value)}
        className={`bg-gray-50 border ${
          roleError ? "border-red-500" : "border-gray-300"
        }  text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
      >
        <option value="" disabled>
          Role
        </option>
        <option value="ADMIN">Admin</option>
        <option value="PROKTOR">Proktor</option>
      </select>
      {roleError && <p className="text-red-500">{roleError}</p>}

      {selectedRole === "PROKTOR" && (
        <Select name="jurusan" defaultValue={initialData?.jurusan}>
          <p className="mt-4 mb-2 text-start text-gray-500 text-sm">
            Harap pilih Jurusan menentukan Proktor
          </p>
          <SelectTrigger
            className={`${jurusanError ? "border-red-700 border-2" : ""}`}
          >
            <SelectValue placeholder="Pilih Jurusan" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Jurusan</SelectLabel>
              <SelectItem value="TKJ">TKJ</SelectItem>
              <SelectItem value="RPL">RPL</SelectItem>
              <SelectItem value="TKR">TKR</SelectItem>
              <SelectItem value="TAV">TAV</SelectItem>
              <SelectItem value="TP">TP</SelectItem>
              <SelectItem value="TSM">TSM</SelectItem>
              <SelectItem value="TITL">TITL</SelectItem>
              <SelectItem value="DPIB">DPIB</SelectItem>
            </SelectGroup>
          </SelectContent>
          {jurusanError && (
            <p className="mt-2 text-start text-red-700 text-sm">
              {jurusanError}
            </p>
          )}
        </Select>
      )}

      <FormControl
        fullWidth
        className="mt-5"
        error={!!passwordError}
        variant="standard"
        sx={{
          "& .MuiInput-root": {
            backgroundColor: "transparent",
            "&:before": {
              borderBottom: "1px solid rgba(0, 0, 0, 0.42)",
            },
            "&:hover:not(.Mui-disabled):before": {
              borderBottom: "2px solid rgba(0, 0, 0, 0.87)",
            },
            "&:after": {
              borderBottom: "2px solid #3b82f6",
            },
            "& input": {
              color: "inherit",
              backgroundColor: "transparent",
              "&:-webkit-autofill": {
                WebkitBoxShadow: "0 0 0 1000px transparent inset",
                WebkitTextFillColor: "inherit",
                transition: "background-color 5000s ease-in-out 0s",
              },
            },
          },
          "& .MuiInputLabel-root": {
            color: "rgba(0, 0, 0, 0.7)",
            "&.Mui-focused": {
              color: "#3b82f6",
            },
          },
          "& .MuiFormHelperText-root": {
            color: "error.main",
          },
        }}
      >
        <InputLabel htmlFor="component-error">Password</InputLabel>
        <Input
          onClick={handleModalClick}
          type="password"
          placeholder={
            initialData?.id
              ? "Masukan password baru (Opsional)"
              : "Masukan password"
          }
          name="password"
          id="component-error"
          aria-describedby="component-error-text"
        />
        <FormHelperText id="component-error-text">
          {passwordError}
        </FormHelperText>
      </FormControl>
    </>
  );
};

export default FormInputUsers;
