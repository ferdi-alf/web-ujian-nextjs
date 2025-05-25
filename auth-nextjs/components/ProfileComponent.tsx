import {
  FormControl,
  IconButton,
  Input,
  InputAdornment,
  InputLabel,
  TextField,
} from "@mui/material";
import { PencilIcon } from "lucide-react";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { FormButton } from "./button";
interface ProfileComponentProps {
  onFileChange: (file: File) => void;
}

// Definisikan fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ProfileComponent = ({ onFileChange }: ProfileComponentProps) => {
  const [user, setUser] = useState<{
    data: {
      id: string;
      username: string;
      role: string;
      image: string;
    };
  } | null>(null);
  const [showOldPassword, setShowOldPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const handleClickShowOldPassword = () => setShowOldPassword((show) => !show);
  const handleClickShowNewPassword = () => setShowNewPassword((show) => !show);
  const handleClickShowConfirmPassword = () =>
    setShowConfirmPassword((show) => !show);

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

  const { data: userData, isLoading, error } = useSWR("/api/user", fetcher);
  console.log("www", userData);
  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  if (error) {
    return;
  }

  return (
    <div className="grid md:grid-cols-2 grid-cols-1 gap-2 bg-slate-50">
      {user?.data.id && <input type="hidden" value={user.data.id} name="id" />}
      <div className="p-2 bg-white rounded-lg">
        <div className="flex justify-center">
          <div className="w-1/2 relative rounded-full flex justify-center">
            {isLoading ? (
              <div className="animate-pulse w-full rounded-full object-cover aspect-square bg-gray-200 "></div>
            ) : (
              <Image
                width={150}
                height={150}
                className="w-full rounded-full object-cover aspect-square"
                src={
                  user?.data.image
                    ? user.data.image
                    : user?.data.role === "PROKTOR"
                    ? "/avatar.png"
                    : "/avatar-admin.jpg"
                } // Fallback lainnya}
                alt="avatar"
              />
            )}

            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  onFileChange(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById("dropzone-file")?.click()}
              className="rounded-full absolute right-1 bg-white md:bottom-12 bottom-3 p-1 border"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <button
          type="button"
          disabled={!user?.data.image}
          className={`${
            !user?.data.image ? "opacity-20 cursor-not-allowed" : ""
          } bg-red-500 rounded-sm p-2 w-full mt-6 font-medium text-white hover:bg-red-700`}
        >
          Hapus Photo Profile
        </button>
      </div>
      <div className="p-2 px-5 bg-white rounded-lg">
        {isLoading ? (
          <div className="animate-pulse h-14 bg-gray-200 rounded"></div>
        ) : (
          <TextField
            defaultValue={user?.data.username}
            name="name"
            id="outlined-basic"
            label="Username"
            variant="outlined"
            fullWidth
          />
        )}

        <div className="mt-5 w-full flex flex-col gap-y-5">
          <FormControl fullWidth variant="standard">
            <InputLabel htmlFor="standard-adornment-password">
              Password Lama
            </InputLabel>
            <Input
              name="oldPassword"
              id="standard-adornment-password"
              type={showOldPassword ? "text" : "password"}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={
                      showOldPassword
                        ? "hide the password"
                        : "display the password"
                    }
                    onClick={handleClickShowOldPassword}
                    onMouseDown={handleMouseDownPassword}
                    onMouseUp={handleMouseUpPassword}
                  >
                    {showOldPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>

          <FormControl fullWidth variant="standard">
            <InputLabel htmlFor="standard-adornment-password">
              Password baru
            </InputLabel>
            <Input
              name="newPassword"
              id="standard-adornment-password"
              type={showNewPassword ? "text" : "password"}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={
                      showNewPassword
                        ? "hide the password"
                        : "display the password"
                    }
                    onClick={handleClickShowNewPassword}
                    onMouseDown={handleMouseDownPassword}
                    onMouseUp={handleMouseUpPassword}
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>

          <FormControl fullWidth variant="standard">
            <InputLabel htmlFor="standard-adornment-password">
              Confirm Password
            </InputLabel>
            <Input
              name="confirmPassword"
              id="standard-adornment-password"
              type={showConfirmPassword ? "text" : "password"}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={
                      showConfirmPassword
                        ? "hide the password"
                        : "display the password"
                    }
                    onClick={handleClickShowConfirmPassword}
                    onMouseDown={handleMouseDownPassword}
                    onMouseUp={handleMouseUpPassword}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
          <FormButton />
        </div>
      </div>
    </div>
  );
};

export default ProfileComponent;
