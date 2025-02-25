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
  console.log(state);

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
        name="token"
        placeholder="Massukan token ujian"
      />
      <TokenButton />
    </form>
  );
};

export default InputToken;
