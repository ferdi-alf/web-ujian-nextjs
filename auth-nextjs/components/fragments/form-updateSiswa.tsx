import {
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
} from "@mui/material";
import React from "react";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Image from "next/image";

interface FormUpdateSiswaProps {
  siswa: {
    id: string;
    name: string;
    ruang: string;
    kelamin: string;
    nis: string;
    nomor_ujian: string;
    userId: {
      id: string;
      username: string;
      image: string;
    };
  };
  errors?: Record<string, string[]>;
}

const FormUpdateSiswa = ({ siswa, errors }: FormUpdateSiswaProps) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [image, setImage] = React.useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
    }
  };

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

  const handleModalClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Mencegah event bubbling ke elemen induk
  };
  return (
    <div onClick={handleModalClick} className="flex flex-col gap-4 mt-5">
      <input type="hidden" name="id" value={siswa.id} />
      <div
        onClick={handleModalClick}
        className="flex items-center justify-center w-full"
      >
        <label className="flex items-center justify-center w-full h-28 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 overflow-hidden relative">
          {image ? (
            // Pratinjau gambar dengan posisi tengah
            <div className="w-full py-2 rounded-lg h-full flex items-center justify-center">
              <Image
                width={150}
                height={150}
                src={image}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          ) : (
            // Jika belum ada gambar, tampilkan ikon dan teks
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag
                and drop foto siswa
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                SVG, PNG, JPG
              </p>
            </div>
          )}
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>
        {errors?.image && (
          <p className="text-red-500 text-sm">{errors.image[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-1">
        <TextField
          onClick={handleModalClick}
          name="name"
          id="outlined-basic"
          label="Nama"
          variant="outlined"
          defaultValue={siswa.name}
          error={!!errors?.name}
          helperText={errors?.name?.[0]}
        />
        <TextField
          onClick={handleModalClick}
          name="ruang"
          id="outlined-basic"
          label="Ruang"
          variant="outlined"
          defaultValue={siswa.ruang}
          error={!!errors?.ruang}
          helperText={errors?.ruang?.[0]}
        />
      </div>

      <div>
        <select
          name="kelamin"
          defaultValue={siswa.kelamin}
          className={`bg-gray-50 border ${
            errors?.kelamin ? "border-red-500" : "border-gray-300"
          } text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
        >
          <option value="" disabled>
            Pilih Kelamin
          </option>
          <option value="L">Laki-Laki</option>
          <option value="P">Perempuan</option>
        </select>
        {errors?.kelamin && (
          <p className="text-red-500 text-sm mt-1">{errors.kelamin[0]}</p>
        )}
      </div>

      <TextField
        onClick={handleModalClick}
        name="username"
        id="outlined-basic"
        label="Username"
        variant="outlined"
        defaultValue={siswa.userId.username}
        error={!!errors?.username}
        helperText={errors?.username?.[0]}
      />

      <div className="grid grid-cols-2 gap-x-1">
        <TextField
          onClick={handleModalClick}
          name="nis"
          id="outlined-basic"
          label="NIS"
          variant="outlined"
          defaultValue={siswa.nis}
          error={!!errors?.nis}
          helperText={errors?.nis?.[0]}
        />

        <TextField
          onClick={handleModalClick}
          name="nomor_ujian"
          id="outlined-basic"
          label="Nomor Ujian"
          variant="outlined"
          defaultValue={siswa.nomor_ujian}
          error={!!errors?.nomor_ujian}
          helperText={errors?.nomor_ujian?.[0]}
        />
      </div>

      <FormControl sx={{ width: "100%" }} variant="outlined">
        <InputLabel
          error={!!errors?.password}
          htmlFor="outlined-adornment-password"
        >
          Password
        </InputLabel>
        <OutlinedInput
          onClick={handleModalClick}
          name="password"
          id="outlined-adornment-password"
          type={showPassword ? "text" : "password"}
          error={!!errors?.password}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label={
                  showPassword ? "hide the password" : "display the password"
                }
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                onMouseUp={handleMouseUpPassword}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          }
          label="Password"
        />
        {errors?.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password[0]}</p>
        )}
      </FormControl>
    </div>
  );
};

export default FormUpdateSiswa;
