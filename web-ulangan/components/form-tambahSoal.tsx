/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { TextareaAutosize, TextField } from "@mui/material";
import { X } from "lucide-react";
import Image from "next/image";
import React, {
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import * as XLSX from "xlsx";
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/toast/ToastSuccess";
import { useActionState } from "react";
import { AddSoal } from "@/lib/crudSoal"; // Assuming you have this
import { FormButton } from "./button";

interface InputGroup {
  id: string;
  soal: string;
  gambar?: string | null;
  imageFile?: File | null;
  pilihan: PilihanJawaban[];
  tingkat: string;
  pelajaran: string;
}

interface PilihanJawaban {
  id: string;
  text: string;
  benar: boolean;
}

type ErrorWithMessages = {
  _errors?: string[];
};

type SoalItemError = {
  soal?: ErrorWithMessages;
  pilihan?: ErrorWithMessages & {
    [key: number]: {
      text?: ErrorWithMessages;
    };
  };
};

type SoalDataError = {
  soalData?: {
    [key: number]: SoalItemError;
  };
};

// Helper functions untuk setiap jenis error
const getSoalError = (
  error: SoalDataError | undefined,
  index: number
): string => {
  if (!error?.soalData?.[index]?.soal?._errors?.length) {
    return "";
  }
  return error.soalData[index].soal._errors[0];
};

const getPilihanArrayError = (
  error: SoalDataError | undefined,
  index: number
): string => {
  if (!error?.soalData?.[index]?.pilihan?._errors?.length) {
    return "";
  }
  return error.soalData[index].pilihan._errors[0];
};

const getPilihanTextError = (
  error: SoalDataError | undefined,
  index: number,
  pIndex: number
): string => {
  if (!error?.soalData?.[index]?.pilihan?.[pIndex]?.text?._errors?.length) {
    return "";
  }
  return error.soalData[index].pilihan[pIndex].text._errors[0];
};

// Type guard

const useResetForm = (
  success: boolean,
  setSelectedTingkat: (value: string) => void,
  setSelectedPelajaran: (value: string) => void,
  setSelectedFile: (value: File | null) => void,
  setInputGroups: (value: InputGroup[]) => void
) => {
  const resetForm = useCallback(() => {
    setSelectedTingkat("");
    setSelectedPelajaran("");
    setSelectedFile(null);
    setInputGroups([
      {
        id: "1",
        soal: "",
        gambar: null,
        imageFile: null,
        tingkat: "",
        pelajaran: "",
        pilihan: Array.from({ length: 5 }, (_, i) => ({
          id: String.fromCharCode(65 + i),
          text: "",
          benar: false,
        })),
      },
    ]);
  }, [
    setSelectedTingkat,
    setSelectedPelajaran,
    setSelectedFile,
    setInputGroups,
  ]);

  useEffect(() => {
    if (success) {
      setTimeout(() => {
        resetForm();
      }, 0);
    }
  }, [success, resetForm]);
};

const FormTambahSoal = () => {
  const [state, formAction] = useActionState(AddSoal, null);
  console.log(state);
  const [selectedTingkat, setSelectedTingkat] = useState("");
  const [selectedPelajaran, setSelectedPelajaran] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputGroups, setInputGroups] = useState<InputGroup[]>([
    {
      id: "1",
      soal: "",
      gambar: null,
      imageFile: null,
      tingkat: "",
      pelajaran: "",
      pilihan: Array.from({ length: 5 }, (_, i) => ({
        id: String.fromCharCode(65 + i), // Generates A, B, C, D, E
        text: "",
        benar: false,
      })),
    },
  ]);
  const resetForm = useResetForm(
    state?.success ?? false,
    setSelectedTingkat,
    setSelectedPelajaran,
    setSelectedFile,
    setInputGroups
  );

  useEffect(() => {
    if (state?.success == true) {
      setSelectedTingkat(""); // Reset tingkat
      setSelectedPelajaran(""); // Reset pelajaran
      setSelectedFile(null); // Reset file Excel yang diunggah

      setInputGroups([
        {
          id: "1",
          soal: "",
          gambar: null,
          imageFile: null,
          tingkat: "",
          pelajaran: "",
          pilihan: Array.from({ length: 5 }, (_, i) => ({
            id: String.fromCharCode(65 + i),
            text: "",
            benar: false,
          })),
        },
      ]);
    }
  }, [state]);

  // Update useEffect untuk handling error
  useEffect(() => {
    if (state?.success) {
      showSuccessToast(state.data.message || "");
    } else if (state?.error) {
      // Error tingkat
      if (
        "tingkat" in state.error &&
        state.error.tingkat &&
        state.error.tingkat._errors &&
        state.error.tingkat._errors.length > 0
      ) {
        showErrorToast(state.error.tingkat._errors[0]);
      }
      // Error pelajaran
      else if (
        "pelajaran" in state.error &&
        state.error.pelajaran?._errors &&
        state.error.pelajaran._errors.length > 0
      ) {
        showErrorToast(state.error.pelajaran._errors[0]);
      }
      // Error soal
      else if (state.error && "soalData" in state.error) {
        showErrorToast("Ada beberapa soal yang belum diisi dengan lengkap");
      } else if (state.error && "server" in state.error) {
        showErrorToast(state.error.server);
      }
    }
  }, [state]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);

      try {
        const data = await readExcelFile(file);
        if (data && data.length > 0) {
          if (data.length > 50) {
            showErrorToast(
              `Data yang dapat diimport maksimal 50 soal per batch. Data akan dipotong.`
            );
          }

          const limitedData = data.slice(0, 50);

          const newInputGroups: InputGroup[] = limitedData.map(
            (row: any, index: number) => {
              // Get the answer key and convert it to the corresponding letter
              const numericAnswer = getNormalizedValue(row, [
                "jawaban",
                "jawaban_benar",
                "correct",
                "kunci jawaban",
              ]);

              // Convert numeric answer (1-5) to letter (A-E)
              const answerMap: { [key: string]: string } = {
                "1": "A",
                "2": "B",
                "3": "C",
                "4": "D",
                "5": "E",
              };

              const correctAnswer = answerMap[numericAnswer] || "";

              return {
                id: (index + 1).toString(),
                soal: getNormalizedValue(row, [
                  "soal",
                  "pertanyaan",
                  "question",
                ]),
                gambar: null,
                imageFile: null,
                tingkat: getNormalizedValue(row, ["tingkat", "kelas", "grade"]),
                pelajaran: getNormalizedValue(row, [
                  "pelajaran",
                  "mata pelajaran",
                  "subject",
                ]),
                pilihan: [
                  {
                    id: "A",
                    text: getNormalizedValue(row, [
                      "pilihan_a",
                      "a",
                      "option_a",
                      "jawab1",
                    ]),
                    benar: correctAnswer === "A",
                  },
                  {
                    id: "B",
                    text: getNormalizedValue(row, [
                      "pilihan_b",
                      "b",
                      "option_b",
                      "jawab2",
                    ]),
                    benar: correctAnswer === "B",
                  },
                  {
                    id: "C",
                    text: getNormalizedValue(row, [
                      "pilihan_c",
                      "c",
                      "option_c",
                      "jawab3",
                    ]),
                    benar: correctAnswer === "C",
                  },
                  {
                    id: "D",
                    text: getNormalizedValue(row, [
                      "pilihan_d",
                      "d",
                      "option_d",
                      "jawab4",
                    ]),
                    benar: correctAnswer === "D",
                  },
                  {
                    id: "E",
                    text: getNormalizedValue(row, [
                      "pilihan_e",
                      "e",
                      "option_e",
                      "jawab5",
                    ]),
                    benar: correctAnswer === "E",
                  },
                ],
              };
            }
          );

          const hasValidData = newInputGroups.some(
            (group) => group.soal || group.pilihan.some((p) => p.text)
          );

          if (!hasValidData) {
            showErrorToast(
              "Format kolom file Excel tidak sesuai. Pastikan file memiliki kolom Soal dan Pilihan Jawaban (A-E)."
            );
            return;
          }

          setInputGroups(newInputGroups);
          showSuccessToast(
            `Berhasil mengimpor ${limitedData.length} soal dari ${data.length} total data`
          );
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: "",
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

  const getNormalizedValue = (row: any, possibleKeys: string[]): string => {
    const rowKeys = Object.keys(row);
    const normalizedRow: { [key: string]: any } = {};

    rowKeys.forEach((key) => {
      normalizedRow[key.toLowerCase()] = row[key];
    });

    for (const key of possibleKeys) {
      const normalizedKey = key.toLowerCase();
      if (normalizedRow[normalizedKey] !== undefined) {
        return normalizedRow[normalizedKey];
      }
    }

    return "";
  };

  const handleImageChange = async (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);

      setInputGroups((prevGroups) =>
        prevGroups.map((group) =>
          group.id === id
            ? {
                ...group,
                gambar: imageUrl, // For preview only
                imageFile: file, // Store the actual file
              }
            : group
        )
      );
    }
  };

  const addInputGroup = () => {
    const newId = (inputGroups.length + 1).toString();
    setInputGroups((prev) => [
      ...prev,
      {
        id: newId,
        soal: "",
        gambar: null,
        imageFile: null,
        tingkat: prev[0].tingkat, // Copy from first group
        pelajaran: prev[0].pelajaran, // Copy from first group
        pilihan: Array.from({ length: 5 }, (_, i) => ({
          id: String.fromCharCode(65 + i),
          text: "",
          benar: false,
        })),
      },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("tingkat", selectedTingkat);
    formData.append("pelajaran", selectedPelajaran);

    inputGroups.forEach((group, index) => {
      const soalDataItem = {
        id: group.id,
        soal: group.soal,
        gambar: group.imageFile ? `gambar_${index}` : null,
        pilihan: group.pilihan.map((pilihan) => ({
          id: pilihan.id,
          text: pilihan.text,
          benar: pilihan.benar,
        })),
      };

      formData.append(`soalData[${index}]`, JSON.stringify(soalDataItem));

      // Tambahkan file gambar jika ada
      if (group.imageFile) {
        formData.append(`gambar_${index}`, group.imageFile);
      }
    });

    startTransition(() => {
      formAction(formData);
    });
  };

  const removeInputGroup = (id: string) => {
    setInputGroups((prev) => prev.filter((group) => group.id !== id));
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex justify-between md:items-center mt-5 items-start md:flex-row flex-col-reverse gap-2">
          <div className="grid gap-x-2 grid-cols-[35%_auto]">
            <div className="">
              <select
                name="tingkat"
                value={selectedTingkat}
                onChange={(e) => setSelectedTingkat(e.target.value)}
                className={`bg-gray-50 border ${
                  state?.error &&
                  "tingkat" in state.error &&
                  typeof state.error.tingkat === "object"
                    ? "border-red-500"
                    : "border-gray-300"
                } text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
              >
                <option value="">Pilih tingkat</option>
                <option value="X">X</option>
                <option value="XI">XI</option>
                <option value="XII">XII</option>
              </select>
              {state?.error &&
                "tingkat" in state.error &&
                typeof state.error.tingkat === "object" && (
                  <p className="text-red-500 text-sm mt-1">
                    {"tingkat" in state.error &&
                      Array.isArray(state.error.tingkat._errors) &&
                      state.error.tingkat._errors[0]}
                  </p>
                )}
            </div>

            <TextField
              name="pelajaran"
              label="Mata Pelajaran"
              variant="outlined"
              value={selectedPelajaran}
              onChange={(e) => setSelectedPelajaran(e.target.value)}
              error={
                state?.error &&
                "pelajaran" in state.error &&
                typeof state.error.pelajaran === "object"
              }
              helperText={
                state?.error &&
                "pelajaran" in state.error &&
                typeof state.error.pelajaran === "object"
                  ? Array.isArray(state.error.pelajaran._errors) &&
                    state.error.pelajaran._errors[0]
                  : ""
              }
            />
          </div>
          <div>
            <input
              className="hidden"
              id="fileInput"
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
            />
            <label
              htmlFor="fileInput"
              className="bg-green-700 text-white px-4 py-2 rounded-md cursor-pointer inline-block"
            >
              Import dari Excel
            </label>
            {selectedFile && <p className="mt-2">File: {selectedFile.name}</p>}
          </div>
        </div>
        <div className="flex flex-col bg-slate-100 p-2 rounded-sm mt-2">
          {inputGroups.map((group, index) => (
            <div
              key={group.id}
              className="bg-white mt-5 p-3 shadow-md rounded-md"
            >
              {index === 0 ? (
                <p className="text-xl font-semibold">{index + 1}</p>
              ) : (
                <div className="flex justify-between">
                  <p className="text-xl font-semibold">{index + 1}</p>
                  <X
                    onClick={() => removeInputGroup(group.id)}
                    className="cursor-pointer"
                  />
                </div>
              )}

              <div className="flex items-center mt-2 justify-center w-full">
                <label className="flex items-center justify-center w-full h-28 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 overflow-hidden relative">
                  {group.gambar ? (
                    <div className="w-full py-2 rounded-lg h-full flex items-center justify-center">
                      <Image
                        width={150}
                        height={150}
                        src={group.gambar} // ✅ Gunakan langsung
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <p className="mb-2 text-sm text-gray-500">
                        Click untuk upload atau seret untuk menambahkan gambar
                        (Opasional)
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange(group.id, e)}
                  />
                </label>
              </div>

              <TextareaAutosize
                name={`soal${index}`}
                placeholder="Soal"
                value={inputGroups[index].soal} // Pastikan state terhubung
                onChange={(e) => {
                  const newInputGroups = [...inputGroups];
                  newInputGroups[index].soal = e.target.value;
                  setInputGroups(newInputGroups); // Update state
                }}
                className={`w-full rounded-md mt-3 p-2 border ${
                  state?.error &&
                  "soalData" in state.error &&
                  typeof state.error.soalData?.[index] === "object" &&
                  state?.error?.soalData?.[index]?.soal
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                minRows={3}
              />
              {(() => {
                const errorMessage = getSoalError(
                  state?.error as SoalDataError,
                  index
                );
                return errorMessage ? (
                  <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
                ) : null;
              })()}

              {group.pilihan.map((pilihan, pIndex) => (
                <div key={pilihan.id} className="flex flex-col">
                  <div className="flex mt-5 gap-2 flex-nowrap items-center">
                    <input
                      type="radio"
                      name={`benar${index}`}
                      value={pilihan.id}
                      checked={group.pilihan.some(
                        (p) => p.id === pilihan.id && pilihan.benar
                      )}
                      onChange={() =>
                        setInputGroups((prev) =>
                          prev.map((g) =>
                            g.id === group.id
                              ? {
                                  ...g,
                                  pilihan: g.pilihan.map((p) => ({
                                    ...p,
                                    benar: p.id === pilihan.id,
                                  })),
                                }
                              : g
                          )
                        )
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      name={`pilihan${pilihan.id}${index}`}
                      placeholder={`Pilihan ${pilihan.id}`}
                      value={pilihan.text}
                      onChange={(e) =>
                        setInputGroups((prev) =>
                          prev.map((g) =>
                            g.id === group.id
                              ? {
                                  ...g,
                                  pilihan: g.pilihan.map((p) =>
                                    p.id === pilihan.id
                                      ? { ...p, text: e.target.value }
                                      : p
                                  ),
                                }
                              : g
                          )
                        )
                      }
                      className={`bg-gray-50 border ${
                        getPilihanArrayError(
                          state?.error as SoalDataError,
                          index
                        )
                          ? "border-red-500"
                          : "border-gray-600"
                      } text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
                    />
                  </div>

                  {(() => {
                    const errorMessage = getPilihanTextError(
                      state?.error as SoalDataError,
                      index,
                      pIndex
                    );
                    return errorMessage ? (
                      <p className="text-red-500 text-sm mt-1 pl-6">
                        {errorMessage}
                      </p>
                    ) : null;
                  })()}
                </div>
              ))}

              {(() => {
                const errorMessage = getPilihanArrayError(
                  state?.error as SoalDataError,
                  index
                );
                return errorMessage ? (
                  <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
                ) : null;
              })()}
            </div>
          ))}

          <div className="w-full flex mt-2 justify-end">
            <button
              type="button"
              onClick={addInputGroup}
              className="bg-blue-500 rounded-sm p-3 text-white"
            >
              Tambah Soal +
            </button>
          </div>
        </div>
        <div className="w-full flex justify-end">
          <div className="max-w-lg">
            <FormButton />
          </div>
        </div>
      </form>
    </div>
  );
};

export default FormTambahSoal;
