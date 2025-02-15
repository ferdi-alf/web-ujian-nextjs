/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormControl, FormHelperText, InputLabel, Input } from "@mui/material";

const FormKelas = ({ state }: { state: any }) => {
  console.log("state", state);

  const jurusanError = Array.isArray(state?.error?.jurusan)
    ? state.error.jurusan[0]
    : state?.error?.jurusan;
  const tingkatError = Array.isArray(state?.error?.tingkat)
    ? state.error.tingkat[0]
    : state?.error?.tingkat;

  return (
    <>
      <label className="block mt-3 mb-2 text-sm font-medium text-gray-900 ">
        Pilih Tingkat
      </label>
      <select
        id="tingkat"
        name="tingkat"
        defaultValue=""
        className={`bg-gray-50 border MB-7 ${
          tingkatError ? "border-red-500" : "border-gray-300"
        } text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
      >
        <option value="" disabled>
          Tingkat
        </option>
        <option value="X">X</option>
        <option value="XI">XI</option>
        <option value="XII">XII</option>
      </select>
      {tingkatError && (
        <p className="font-normal text-red-500">{tingkatError}</p>
      )}

      <FormControl
        fullWidth
        error={!!jurusanError}
        variant="standard"
        sx={{
          "& .MuiInput-root": {
            backgroundColor: "transparent",
            "&:before": {
              borderBottom: "1px solid rgba(0, 0, 0, 0.42)", // Warna hitam saat tidak fokus
            },
            "&:hover:not(.Mui-disabled):before": {
              borderBottom: "2px solid rgba(0, 0, 0, 0.87)",
            },
            "&:after": {
              borderBottom: "2px solid #3b82f6", // Warna biru-500 untuk border bottom saat focus
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
            color: "rgba(0, 0, 0, 0.7)", // Warna hitam saat tidak fokus
            "&.Mui-focused": {
              color: "#3b82f6", // Warna biru-500 saat focus
            },
          },
          "& .MuiFormHelperText-root": {
            color: "error.main",
          },
        }}
      >
        <InputLabel htmlFor="component-error">Jurusan</InputLabel>
        <Input
          placeholder="Contoh: RPL, TKJ 1, TKR Industri"
          name="jurusan"
          id="component-error"
          aria-describedby="component-error-text"
        />
        <FormHelperText id="component-error-text">
          {jurusanError} {/* Tampilkan pesan error */}
        </FormHelperText>
      </FormControl>
    </>
  );
};

export default FormKelas;
