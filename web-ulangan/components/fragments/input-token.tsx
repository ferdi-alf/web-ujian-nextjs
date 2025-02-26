/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { TextField } from "@mui/material";
import { TokenButton } from "../button";
import { useActionState, useEffect } from "react";
import { toUjian } from "@/lib/crudUjian";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

const InputToken = () => {
  const [state, formAction] = useActionState(toUjian, null);
  const router = useRouter();
  console.log("wkwkwk", state);

  useEffect(() => {
    if (state?.error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: (state as any).error.server || "Token tidak valid!",
      });
    }

    if (state?.success && state.data) {
      router.push(
        `/ujian/${state.data.mataPelajaran.tingkat}/${state.data.mataPelajaran.pelajaran}`
      );
    }
  }, [state, router]);
  return (
    <form
      action={formAction}
      className="flex sm:flex-row flex-col sm:gap-x-3  gap-y-5 justify-between items-center"
    >
      <TextField
        required
        id="outlined-required"
        label="Token"
        className="p-2 w-full"
        name="token"
        placeholder="Masukan token ujian"
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
      />
      <TokenButton />
    </form>
  );
};

export default InputToken;
