/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { getKelas } from "@/lib/crudKelas";
import { Kelas } from "@prisma/client";
import React, { useActionState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormButton } from "@/components/button";
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
import { AddSiswa } from "@/lib/crudSiswa";
import { X } from "lucide-react";
import * as XLSX from "xlsx";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import { mutate } from "swr";

interface InputGroup {
  id: number;
  name: string;
  nis: string;
  ruang: string;
  kelamin: string;
  nomorUjian: string;
  password: string;
}

const FormInputSiswa = () => {
  const [state, formAction] = useActionState(AddSiswa, null);
  console.log(state);
  const [showPassword, setShowPassword] = React.useState<{
    [key: number]: boolean;
  }>({});
  const [kelas, setKelas] = React.useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = React.useState<Kelas | null>(null);
  const [inputGroups, setInputGroups] = React.useState<InputGroup[]>([
    {
      id: 1,
      name: "",
      nis: "",
      ruang: "",
      kelamin: "",
      nomorUjian: "",
      password: "",
    },
  ]);
  const [kelasError, setKelasError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  useEffect(() => {
    if (state?.success) {
      mutate("siswa");
    }
  }, [state]);

  const resetFormm = React.useCallback(() => {
    setInputGroups([
      {
        id: 1,
        name: "",
        nis: "",
        ruang: "",
        kelamin: "",
        nomorUjian: "",
        password: "",
      },
    ]);
    setSelectedKelas(null);
    setShowPassword({});
    setSelectedFile(null);
  }, []);

  useEffect(() => {
    if (state?.success) {
      if (!selectedKelas) return;

      const kelasName = `${selectedKelas.tingkat} ${selectedKelas.jurusan}`;

      showSuccessToast(
        `Berhasil menambahkan data siswa untuk kelas ${kelasName}`
      );

      resetFormm();
    } else if (state?.error) {
      if ("message" in state.error) {
        showErrorToast(state.error.message || "Error");
      } else if ("server" in state.error) {
        showErrorToast(state.error.server);
      } else if (state.error.kelasId && !selectedKelas) {
        if (!kelasError) {
          // Hanya tampilkan error jika belum pernah muncul
          setKelasError(state.error.kelasId[0]);
          showErrorToast(state.error.kelasId[0]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, kelasError, resetFormm]);

  // Reset kelasError saat user memilih kelas
  useEffect(() => {
    if (selectedKelas && kelasError) {
      setKelasError(null);
    }
  }, [selectedKelas, kelasError]);

  const handleClickShowPassword = (id: number) => {
    setShowPassword((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const handleInputChange = (
    id: number,
    field: keyof InputGroup,
    value: string
  ) => {
    setInputGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === id ? { ...group, [field]: value } : group
      )
    );
  };

  const addInputGroup = () => {
    const newId = inputGroups.length + 1;
    setInputGroups((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        nis: "",
        ruang: "",
        kelamin: "",
        nomorUjian: "",
        password: "",
      },
    ]);
  };

  const removeInputGroup = (index: number) => {
    setInputGroups((prev) => prev.filter((_, i) => i !== index));
  };

  React.useEffect(() => {
    const fetchKelas = async () => {
      const KelasList = await getKelas();
      setKelas(KelasList || []);
    };
    fetchKelas();
  }, []);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);

      try {
        const data = await readExcelFile(file);
        if (data && data.length > 0) {
          // Update batas menjadi 40
          if (data.length > 40) {
            showErrorToast(
              `Data yang dapat diimport maksimal 40 siswa per batch. Data akan dipotong.`
            );
          }

          // Ambil 40 data pertama
          const limitedData = data.slice(0, 40);

          const newInputGroups: InputGroup[] = limitedData.map(
            (row: any, index: number) => ({
              id: index + 1,
              name: getNormalizedValue(row, ["nama siswa", "nama", "name"]),
              nis: getNormalizedValue(row, ["nis/nisn", "nis", "nisn"]),
              ruang: getNormalizedValue(row, ["ruang", "room"]),
              kelamin: getNormalizedValue(row, [
                "kelamin",
                "jenis kelamin",
                "gender",
              ]),
              nomorUjian: getNormalizedValue(row, [
                "nomor ujian",
                "nomer ujian",
                "no ujian",
              ]),
              password: getNormalizedValue(row, [
                "password",
                "kata sandi",
                "PASSOWRD",
              ]),
            })
          );

          // Validasi apakah ada data yang berhasil dimapping
          const hasValidData = newInputGroups.some(
            (group) =>
              group.name ||
              group.nis ||
              group.ruang ||
              group.kelamin ||
              group.nomorUjian ||
              group.password
          );

          if (!hasValidData) {
            showErrorToast(
              "Format kolom file Excel tidak sesuai. Pastikan file memiliki minimal salah satu kolom berikut: Nama Siswa, NIS, Ruang, Jenis Kelamin, Nomor Ujian, atau Password."
            );
            return;
          }

          // Validasi per kolom
          const missingColumns = [];
          const requiredColumns = {
            name: ["nama siswa", "nama", "name"],
            nis: ["nis/nisn", "nis", "nisn"],
            nomorUjian: ["nomor ujian", "nomer ujian", "no ujian"],
            password: ["password", "kata sandi", "PASSOWRD"],
          };

          for (const [field, keys] of Object.entries(requiredColumns)) {
            const hasColumn = newInputGroups.some(
              (group) => group[field as keyof InputGroup]
            );
            if (!hasColumn) {
              missingColumns.push(keys[0]);
            }
          }

          if (missingColumns.length > 0) {
            showErrorToast(
              `Kolom wajib tidak ditemukan: ${missingColumns.join(", ")}`
            );
            return;
          }

          setInputGroups(newInputGroups);
          showSuccessToast(
            `Berhasil mengimpor ${limitedData.length} data dari ${data.length} total data, harap periksa kembali`
          );
        } else {
          showErrorToast("File Excel kosong atau tidak memiliki data.");
        }
      } catch (error) {
        console.error("Error reading Excel file:", error);
        showErrorToast("Error membaca file Excel. Periksa format file.");
      }
    }
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert Excel data to JSON dengan header yang sudah dinormalisasi
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: "",
            // Hapus header option ini agar menggunakan header asli dari Excel
            // header: 'lowercase'
          });

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const getNormalizedValue = (row: any, possibleKeys: string[]) => {
    // Ubah semua key yang ada di row menjadi lowercase untuk pencocokan
    const rowKeys = Object.keys(row);
    const normalizedRow: { [key: string]: any } = {};

    rowKeys.forEach((key) => {
      normalizedRow[key.toLowerCase()] = row[key];
    });

    // Cari nilai berdasarkan possible keys yang sudah di-lowercase
    for (const key of possibleKeys) {
      const normalizedKey = key.toLowerCase();
      if (normalizedRow[normalizedKey] !== undefined) {
        return normalizedRow[normalizedKey];
      }
    }

    return "";
  };

  const handleKelasChange = (kelasId: string) => {
    const selected = kelas.find((k) => k.id.toString() === kelasId);
    setSelectedKelas(selected || null);
  };

  const groupClasses: Record<string, Kelas[]> = kelas.reduce((acc, kelas) => {
    if (!acc[kelas.tingkat]) acc[kelas.tingkat] = [];
    acc[kelas.tingkat].push(kelas);
    return acc;
  }, {} as Record<string, Kelas[]>);

  return (
    <div className="w-full">
      <form action={formAction}>
        <div className="flex flex-col mt-5">
          <div className="flex gap-2">
            <div className="">
              <input
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                id="fileInput"
                onChange={handleFileChange}
              />
              <label
                htmlFor="fileInput"
                className="bg-green-700 text-white px-4 py-2 rounded cursor-pointer inline-block"
              >
                Pilih File Excel
              </label>
              {selectedFile && (
                <p className="mt-2">File: {selectedFile.name}</p>
              )}
            </div>
            <div className="sm:w-1/4 w-1/2">
              <Select name="kelasId" onValueChange={handleKelasChange}>
                <SelectTrigger
                  className={
                    "kelasId" in (state?.error || {})
                      ? "border-red-700 border-2"
                      : ""
                  }
                >
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupClasses).map(
                    ([tingkat, tingkatClasses]) => (
                      <SelectGroup key={tingkat}>
                        <SelectLabel>Tingkat {tingkat}</SelectLabel>
                        {tingkatClasses.map((Kelas) => (
                          <SelectItem
                            key={Kelas.id}
                            value={Kelas.id.toString()}
                          >
                            {Kelas.tingkat} {Kelas.jurusan}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  )}
                </SelectContent>
              </Select>
              {"kelasId" in (state?.error || {}) && (
                <p className="mt-2 text-start text-red-700 text-sm">
                  {state?.message}
                </p>
              )}
            </div>
          </div>
          {inputGroups.map((group, index) => (
            <div
              key={group.id}
              className="bg-white mt-5 p-3 shadow-md rounded-sm"
            >
              {index === 0 ? (
                <p className="text-xl font-semibold">{index + 1}</p>
              ) : (
                <div className="flex justify-between">
                  <p className="text-xl font-semibold">{index + 1}</p>

                  <X
                    onClick={() => removeInputGroup(index)}
                    className="cursor-pointer"
                  />
                </div>
              )}
              <FormControl
                fullWidth
                className="mt-5"
                error={
                  typeof state?.error?.siswaData?.[index] === "object" &&
                  !!state?.error?.siswaData?.[index]?.name
                }
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
                }}
              >
                <InputLabel>Nama</InputLabel>
                <Input
                  name={`name${index}`}
                  placeholder="Masukan nama lengkap siswa"
                  value={group.name}
                  onChange={(e) =>
                    handleInputChange(group.id, "name", e.target.value)
                  }
                />
                {typeof state?.error?.siswaData?.[index] === "object" &&
                  state?.error?.siswaData?.[index]?.name && (
                    <FormHelperText error>
                      {state.error.siswaData[index].name}
                    </FormHelperText>
                  )}
              </FormControl>

              {/* Similar FormControl components for other fields, with error handling */}
              <FormControl
                fullWidth
                className="mt-3"
                error={
                  typeof state?.error?.siswaData?.[index] === "object" &&
                  !!state?.error?.siswaData?.[index]?.nis
                }
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
                <InputLabel>NIS/NISN</InputLabel>
                <Input
                  name={`nis${index}`}
                  placeholder="Masukan NIS/NISN"
                  value={group.nis}
                  onChange={(e) =>
                    handleInputChange(group.id, "nis", e.target.value)
                  }
                />
                {typeof state?.error?.siswaData?.[index] === "object" &&
                  state?.error?.siswaData?.[index]?.nis && (
                    <FormHelperText error>
                      {state.error.siswaData[index].nis}
                    </FormHelperText>
                  )}
              </FormControl>

              <FormControl
                fullWidth
                className="mt-3"
                error={
                  typeof state?.error?.siswaData?.[index] === "object" &&
                  !!state?.error?.siswaData?.[index]?.ruang
                }
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
                <InputLabel>Ruang</InputLabel>
                <Input
                  name={`ruang${index}`}
                  placeholder="Masukan Ruang"
                  value={group.ruang}
                  onChange={(e) =>
                    handleInputChange(group.id, "ruang", e.target.value)
                  }
                />
                {typeof state?.error?.siswaData?.[index] === "object" &&
                  state?.error?.siswaData?.[index]?.ruang && (
                    <FormHelperText error>
                      {state.error.siswaData[index].ruang}
                    </FormHelperText>
                  )}
              </FormControl>

              <div className="mt-3">
                <select
                  name={`kelamin${index}`}
                  value={group.kelamin}
                  onChange={(e) =>
                    handleInputChange(group.id, "kelamin", e.target.value)
                  }
                  className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ${
                    typeof state?.error?.siswaData?.[index] === "object" &&
                    state?.error?.siswaData?.[index]?.kelamin
                      ? "border-red-700"
                      : ""
                  }`}
                >
                  <option value="" disabled>
                    Pilih Kelamin
                  </option>
                  <option value="L">Laki-Laki</option>
                  <option value="P">Perempuan</option>
                </select>
                {typeof state?.error?.siswaData?.[index] === "object" &&
                  state?.error?.siswaData?.[index]?.kelamin && (
                    <p className="mt-2 text-start text-red-700 text-sm">
                      {state.error.siswaData[index].kelamin}
                    </p>
                  )}
              </div>

              <div className="w-full flex justify-end">
                <div className="w-[95%]">
                  <FormControl
                    fullWidth
                    className="mt-5"
                    error={
                      typeof state?.error?.siswaData?.[index] === "object" &&
                      !!state?.error?.siswaData?.[index]?.nomorUjian
                    }
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
                    <InputLabel>Nomor Ujian</InputLabel>
                    <Input
                      name={`nomorUjian${index}`}
                      placeholder="Masukan nomor ujian siswa"
                      value={group.nomorUjian}
                      onChange={(e) =>
                        handleInputChange(
                          group.id,
                          "nomorUjian",
                          e.target.value
                        )
                      }
                    />
                    <p>
                      Nomor ujian digunakan sebagai username siswa untuk login
                    </p>
                    {typeof state?.error?.siswaData?.[index] === "object" &&
                      state?.error?.siswaData?.[index]?.nomorUjian && (
                        <FormHelperText error>
                          {state.error.siswaData[index].nomorUjian}
                        </FormHelperText>
                      )}
                  </FormControl>

                  <FormControl
                    variant="standard"
                    error={
                      typeof state?.error?.siswaData?.[index] === "object" &&
                      !!state?.error?.siswaData?.[index]?.password
                    }
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
                    <InputLabel>Password</InputLabel>
                    <Input
                      name={`password${index}`}
                      type={showPassword[group.id] ? "text" : "password"}
                      value={group.password}
                      onChange={(e) =>
                        handleInputChange(group.id, "password", e.target.value)
                      }
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => handleClickShowPassword(group.id)}
                            onMouseDown={handleMouseDownPassword}
                          >
                            {showPassword[group.id] ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                    {typeof state?.error?.siswaData?.[index] === "object" &&
                      state?.error?.siswaData?.[index]?.password && (
                        <FormHelperText error>
                          {state.error.siswaData[index].password}
                        </FormHelperText>
                      )}
                  </FormControl>
                </div>
              </div>
            </div>
          ))}
          <div className="w-full flex mt-2 justify-end">
            <div className="max-w-lg">
              <button
                type="button"
                onClick={addInputGroup}
                className="bg-blue-500 rounded-sm p-3 text-white"
              >
                Tambah +
              </button>
            </div>
          </div>
          <div className="w-full flex justify-end">
            <div className="max-w-lg">
              <FormButton />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FormInputSiswa;
