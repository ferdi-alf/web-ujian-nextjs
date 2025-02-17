/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { AddSoalSchema } from "./zod";

export const AddSoal = async (prevState: unknown, formData: FormData) => {
  try {
    const tingkat = formData.get("tingkat");
    const pelajaran = formData.get("pelajaran");

    // Parse soalData
    const soalData: any[] = [];
    let index = 0;

    while (formData.has(`soalData[${index}]`)) {
      const soalItem = formData.get(`soalData[${index}]`);

      if (typeof soalItem === "string") {
        try {
          const parsedItem = JSON.parse(soalItem);
          soalData.push(parsedItem);
          console.log(`Parsed soal ${index}:`, parsedItem);
        } catch (error) {
          console.error(`Error parsing soal ${index}:`, error);
          throw new Error(`Invalid soal data format at index ${index}`);
        }
      }
      index++;
    }

    // Validate data
    const dataToValidate = {
      tingkat,
      pelajaran,
      soalData,
    };

    console.log("Data to validate:", dataToValidate);

    const result = AddSoalSchema.safeParse(dataToValidate);

    if (!result.success) {
      console.log("Validation errors:", result.error.format());
      return {
        success: false,
        error: result.error.format(),
      };
    }

    // Create new FormData for backend
    const backendFormData = new FormData();
    backendFormData.append("tingkat", tingkat as string);
    backendFormData.append("pelajaran", pelajaran as string);
    backendFormData.append("soalData", JSON.stringify(soalData));

    // Add image files from original formData
    for (let i = 0; i < soalData.length; i++) {
      const fileKey = `gambar_${i}`;
      const file = formData.get(fileKey);

      if (file instanceof File) {
        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          return {
            success: false,
            error: {
              server: `File gambar untuk soal ${
                i + 1
              } terlalu besar. Maksimal 5MB`,
            },
          };
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
          return {
            success: false,
            errorFile: {
              server: `Tipe file untuk soal ${
                i + 1
              } tidak valid. Hanya menerima JPEG, PNG, atau GIF`,
            },
          };
        }

        backendFormData.append(fileKey, file);
        console.log(`Added file ${fileKey}:`, file.name);
      }
    }

    // Log FormData contents
    console.log("FormData contents:");
    for (const pair of backendFormData.entries()) {
      console.log(pair[0], pair[1]);
    }

    // Send request to backend
    console.log("Mengirim request ke:", "http://localhost:8050/api/soal");
    const response = await fetch("http://127.0.0.1:8050/api/soal", {
      method: "POST",
      body: backendFormData, // Remove headers to allow browser set correct content-type with boundary
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
    console.error("Server error:", error);
    return {
      success: false,
      error: {
        server:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server",
      },
    };
  }
};
