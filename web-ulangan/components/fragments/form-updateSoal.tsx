import { TextareaAutosize } from "@mui/material";
import Image from "next/image";
import React, { useState } from "react";
import { FormButton } from "../button";
import { showSuccessToast } from "../toast/ToastSuccess";
import { mutate } from "swr";

interface Jawaban {
  id: string;
  soalId: string;
  jawaban: string;
  benar: boolean;
}

interface SoalType {
  id: string;
  soal: string;
  gambar?: string | null;
  mataPelajaranId: string;
  Jawaban: Jawaban[];
}

interface FormUpdateSoalProps {
  soal: SoalType;
  onSubmit: (updateSoal: SoalType) => void;
  errors?: Record<string, string[]>;
}
const FormUpdateSoal = ({
  soal,
  errors = {},
  onSubmit,
}: FormUpdateSoalProps) => {
  const [formState, setFormState] = useState<SoalType>({
    ...soal,
    Jawaban: [...soal.Jawaban],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    soal.gambar || null
  );

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
  };

  const handleSoalChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState({
      ...formState,
      soal: e.target.value,
    });
  };

  const handleJawabanChange = (jawabanId: string, value: string) => {
    setFormState({
      ...formState,
      Jawaban: formState.Jawaban.map((jawaban) =>
        jawaban.id === jawabanId ? { ...jawaban, jawaban: value } : jawaban
      ),
    });
  };

  const handleBenarChange = (jawabanId: string) => {
    setFormState({
      ...formState,
      Jawaban: formState.Jawaban.map((jawaban) => ({
        ...jawaban,
        benar: jawaban.id === jawabanId,
      })),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("soal", formState.soal);
    formData.append("mataPelajaranId", formState.mataPelajaranId); // Perbaikan nama field

    if (imageFile) {
      formData.append("gambar", imageFile);
    }

    formData.append("jawabanCount", formState.Jawaban.length.toString());
    formState.Jawaban.forEach((jawaban, index) => {
      formData.append(`jawaban[${index}].id`, jawaban.id);
      formData.append(`jawaban[${index}].jawaban`, jawaban.jawaban); // Perbaikan key jawaban
      formData.append(`jawaban[${index}].benar`, jawaban.benar.toString()); // Perbaikan key benar
    });

    try {
      const response = await fetch(`/api/soal/${formState.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);
        return;
      }
      if (response.ok) {
        const success = await response.json();
        if (success.success) {
          showSuccessToast(success.message);
          mutate("soal");
        }
      }

      const updatedSoal = await response.json();
      if (onSubmit) {
        onSubmit(updatedSoal);
        console.log("wkwkw", updatedSoal);
      }
    } catch (error) {
      console.log("Error updating soal:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-2">
      {/* Image upload section */}
      <label className="flex items-center justify-center w-full h-28 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 overflow-hidden relative">
        {imagePreview ? (
          <div className="w-full py-2 rounded-lg h-full flex items-center justify-center">
            <Image
              width={150}
              height={150}
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-4 text-gray-500"
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
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and
              drop gambar soal
            </p>
            <p className="text-xs text-gray-500">SVG, PNG, JPG</p>
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

      {/* Error message for image if any */}
      {errors.gambar && (
        <p className="text-red-500 text-xs mt-1">{errors.gambar}</p>
      )}

      {/* Question text */}
      <TextareaAutosize
        name="soal"
        placeholder="Soal"
        value={formState.soal}
        onChange={handleSoalChange}
        className="w-full mt-3 p-2 border border-gray-300 rounded-md"
        minRows={2}
      />
      {errors.soal && (
        <p className="text-red-500 text-xs mt-1">{errors.soal}</p>
      )}

      {/* Answer options */}
      <div className="mt-2">
        {formState.Jawaban.map((jawaban, index) => (
          <div key={jawaban.id} className="flex flex-col mb-2">
            <div className="flex mt-2 gap-2 flex-nowrap items-center">
              <input
                type="radio"
                name="benar"
                value={jawaban.id}
                checked={jawaban.benar}
                onChange={() => handleBenarChange(jawaban.id)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <input
                type="text"
                value={jawaban.jawaban}
                onChange={(e) =>
                  handleJawabanChange(jawaban.id, e.target.value)
                }
                placeholder={`Pilihan ${String.fromCharCode(65 + index)}`}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              />
            </div>
            {errors[`jawaban[${index}]`] && (
              <p className="text-red-500 text-xs mt-1">
                {errors[`jawaban[${index}]`]}
              </p>
            )}
          </div>
        ))}
      </div>
      <FormButton />
    </form>
  );
};
export default FormUpdateSoal;
