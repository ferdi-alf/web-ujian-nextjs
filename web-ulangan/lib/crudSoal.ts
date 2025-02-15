/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { AddSoalSchema } from "./zod";

export const AddSoal = async (prevState: unknown, formData: FormData) => {
  try {
    const tingkat = formData.get("tingkat");
    const pelajaran = formData.get("pelajaran");

    const soalData: any[] = [];
    let index = 0;

    while (formData.has(`soalData[${index}]`)) {
      const soalItem = formData.get(`soalData[${index}]`);

      if (typeof soalItem === "string") {
        try {
          const parsedItem = JSON.parse(soalItem);
          soalData.push(parsedItem);
          console.log(`Parsed soal ${index}:`, parsedItem); // Debug log
        } catch (error) {
          console.error(`Error parsing soal ${index}:`, error);
        }
      }
      index++;
    }

    const dataToValidate = {
      tingkat,
      pelajaran,
      soalData,
    };

    console.log("Data to validate:", dataToValidate); // Debug log

    const result = AddSoalSchema.safeParse(dataToValidate);

    if (!result.success) {
      console.log("Validation errors:", result.error.format()); // Debug log
      return {
        success: false,
        error: result.error.format(),
      };
    }

    const backendFormData = new FormData();
    backendFormData.append("tingkat", tingkat as string);
    backendFormData.append("pelajaran", pelajaran as string);
    backendFormData.append("soalData", JSON.stringify(soalData));

    // Jika ada gambar, tambahkan secara terpisah
    soalData.forEach((soal, idx) => {
      if (soal.gambar && formData.has(soal.gambar)) {
        backendFormData.append(
          `gambar_${idx}`, // nama field untuk gambar
          formData.get(soal.gambar) as Blob
        );
      }
    });
    console.log("FormData contents:");
    for (const pair of backendFormData.entries()) {
      console.log(pair[0], pair[1]);
    }
    console.log("Mengirim request ke:", "http://localhost:8050/api/soal");
    const response = await fetch("http://127.0.0.1:8050/api/soal", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.log("Server Error:", errorData);
      return {
        success: false,

        error: {
          server: errorData,
        },
      };
    }

    const responseData = await response.json();
    return {
      success: true,
      message: "Soal berhasil ditambahkan",
      data: responseData,
    };
  } catch (error) {
    console.error("Server error:", error); // Debug log
    return {
      error: {
        server: (error as Error).message || "Terjadi kesalahan pada server",
      },
    };
  }
};
