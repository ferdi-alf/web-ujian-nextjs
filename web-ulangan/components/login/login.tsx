"use client";

import {
  FormControl,
  FormHelperText,
  IconButton,
  Input,
  InputAdornment,
  InputLabel,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useActionState, useEffect, useState } from "react";
import { ButtonLogin } from "@/components/button";
import { LoginCredentials } from "@/lib/actions";
import { showErrorToast } from "../toast/ToastSuccess";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState(LoginCredentials, null);
  console.log(state);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const handleMouseUpPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  useEffect(() => {
    if (state?.error) {
      showErrorToast(state?.message);
    }
  }, [state]);

  return (
    <div className="p-8 bg-white/30  rounded-lg inset-0   shadow-lg max-w-md  ">
      <h1 className="text-2xl text-center font-bold ">Login</h1>
      <form action={formAction} className="relative">
        <FormControl
          fullWidth
          error={!!state?.fieldErrors?.username}
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
          <InputLabel htmlFor="component-error">Username</InputLabel>
          <Input
            name="username"
            id="component-error"
            aria-describedby="component-error-text"
          />
          <FormHelperText id="component-error-text">
            {state?.fieldErrors?.username}
          </FormHelperText>
        </FormControl>
        <FormControl
          variant="standard"
          error={!!state?.fieldErrors?.password}
          fullWidth
          className="mt-10"
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
          <InputLabel htmlFor="standard-adornment-password">
            Password
          </InputLabel>
          <Input
            name="password"
            id="standard-adornment-password"
            type={showPassword ? "text" : "password"}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showPassword ? "hide the password" : "display the password"
                  }
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  onMouseUp={handleMouseUpPassword}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />

          <FormHelperText>{state?.fieldErrors?.password}</FormHelperText>
        </FormControl>
        <ButtonLogin />
      </form>
    </div>
  );
};

export default LoginPage;
