"use client";
import { TextField } from "@mui/material";
import { TokenButton } from "../button";
import { useActionState, useEffect, useState } from "react";
import { toUjian } from "@/lib/crudUjian";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

const InputToken = () => {
  const [state, formAction] = useActionState(toUjian, null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log("State:", state); // Debugging

    if (state) {
      setIsLoading(false); // Matikan loading setelah respons diterima

      if (state.error) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: state.error.server || "Token tidak valid!",
        });
      }

      if (state.success && state.data) {
        console.log(
          "Redirecting to:",
          `/ujian/${state.data.mataPelajaran.tingkat}/${state.data.mataPelajaran.pelajaran}`
        );

        router.push(
          `/ujian/${state.data.mataPelajaran.tingkat}/${state.data.mataPelajaran.pelajaran}`
        );
        router.refresh();
      }
    }
  }, [state, router]);

  return (
    <form
      action={(formData) => {
        setIsLoading(true); // Aktifkan loading saat submit
        formAction(formData);
      }}
      className="flex sm:flex-row flex-col sm:gap-x-3 gap-y-5 justify-between items-center"
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
      />

      {/* Tampilkan tombol loading jika isLoading */}
      <TokenButton />
      {isLoading ? (
        <div className="fixed top-0 left-0 w-full h-full bg-black/40 z-[9999] flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        </div>
      ) : (
        ""
      )}
    </form>
  );
};

export default InputToken;
