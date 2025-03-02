import { object, string, z } from "zod";

export const LoginSchema = object({
  username: string().nonempty({ message: "Username tidak boleh kosong" }),
  password: string().nonempty({ message: "Password tidak boleh kosong" }),
});

export const TingkatEnum = z.enum(["X", "XI", "XII"], {
  required_error: "Tingkat harus dipilih",
});

export const AddKelaSchema = z.object({
  tingkat: TingkatEnum, // Ini sudah memvalidasi bahwa nilai tingkat adalah salah satu dari "X", "XI", atau "XII"
  jurusan: z.string().nonempty({ message: "Jurusan tidak boleh kosong" }),
});

export const Role = z.enum(["ADMIN", "PROKTOR"]);
export const AddUserSchema = z
  .object({
    username: z.string().nonempty({ message: "username tidak boleh kosong" }),
    role: Role,
    kelasId: z.string().optional(), // sesuaikan dengan model dan form
    password: z.string().min(8, "password harus berisi minimal 8 karakter"),
  })
  .superRefine((data, ctx) => {
    if (
      data.role === "PROKTOR" &&
      (!data.kelasId || data.kelasId.trim() === "")
    ) {
      ctx.addIssue({
        path: ["kelasId"],
        message: "Kelas wajib dipilih untuk role Proktor",
        code: "custom",
      });
    }
  });

export const UpdateUsersSchema = z
  .object({
    id: z.string({
      required_error: "ID user diperlukan",
    }),
    username: z
      .string({
        required_error: "Username diperlukan ",
      })
      .min(3, "Username minimal 3 karakter "),
    role: z.enum(["ADMIN", "PROKTOR"], {
      required_error: "Role harus dipilih",
    }),
    kelasId: z.string().optional(),
    password: z
      .union([
        z.string().min(6, "Password minimal 6 karakter"),
        z.string().length(0), // Mengizinkan string kosong
      ])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.role === "PROKTOR" &&
      (!data.kelasId || data.kelasId.trim() === "")
    ) {
      ctx.addIssue({
        path: ["kelasId"],
        message: "Kelas wajib dipilih untuk role Proktor",
        code: "custom",
      });
    }
  });

export const AddSiswaSchema = z.object({
  kelasId: z.string({
    required_error: "Kelas harus dipilih",
  }),
  siswaData: z
    .array(
      z.object({
        name: z
          .string({
            required_error: "Nama harus diisi",
          })
          .min(3, "Nama minimal 3 karakter"),
        nis: z
          .string({
            required_error: "NIS/NISN harus diisi",
          })
          .min(5, "NIS/NISN minimal 5 karakter"),
        ruang: z.string({
          required_error: "Ruang harus diisi",
        }),
        kelamin: z.enum(["L", "P"], {
          required_error: "Jenis kelamin harus dipilih",
        }),
        nomorUjian: z.string({
          required_error: "Nomor ujian harus diisi",
        }),
        password: z
          .string({
            required_error: "Password harus diisi",
          })
          .min(5, "Password minimal 5 karakter"),
      })
    )
    .min(1, "Minimal harus ada 1 data siswa"),
});
export type AddSiswaInput = z.infer<typeof AddSiswaSchema>;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/png",
  "image/webp",
];

export const UpdateSiswaSchema = z.object({
  id: z.string({
    required_error: "ID siswa diperlukan",
  }),
  name: z
    .string({
      required_error: "Nama siswa diperlukan",
    })
    .min(3, "Nama minimal 3 karakter"),
  ruang: z.string({
    required_error: "Ruang diperlukan",
  }),
  kelamin: z.enum(["L", "P"], {
    required_error: "Jenis kelamin harus dipilih",
  }),
  nis: z.string({
    required_error: "NIS diperlukan",
  }),
  nomor_ujian: z.string({
    required_error: "Nomor ujian diperlukan",
  }),
  username: z
    .string({
      required_error: "Username diperlukan",
    })
    .min(3, "Username minimal 3 karakter"),
  password: z
    .union([
      z.string().min(5, "Password minimal 5 karakter"),
      z.string().length(0),
    ])
    .optional(),
  image: z
    .any()
    .refine((file) => {
      if (!(file instanceof File) || file?.size === 0) return true;
      return file?.size <= MAX_FILE_SIZE;
    }, "Ukuran maksimal file adalah 5MB")
    .refine((file) => {
      if (!(file instanceof File) || file?.size === 0) return true;
      return ACCEPTED_IMAGE_TYPES.includes(file?.type);
    }, "Format file harus berupa .jpg, .jpeg, .png atau .webp")
    .optional(),
});

export const AddSoalSchema = z.object({
  tingkat: z.enum(["X", "XI", "XII"], {
    message: "Tingkat harus dipilih",
  }),
  pelajaran: z.string().min(1, { message: "Pelajaran tidak boleh kosong" }),

  soalData: z
    .array(
      z.object({
        id: z.string(),
        soal: z.string().min(1, { message: "Soal tidak boleh kosong" }),
        gambar: z
          .union([
            z.string(),
            z
              .instanceof(File)
              .refine((file) => file.size <= MAX_FILE_SIZE, {
                message: "Ukuran maksimal file adalah 5MB",
              })
              .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
                message: "Format file harus jpeg, jpg, png, atau webp",
              }),
            z.null(), // Explicitly allow null
          ])
          .optional() // Make the whole union optional
          .nullable(), // Allow null values
        pilihan: z
          .array(
            z.object({
              id: z.string(),
              text: z
                .string()
                .min(1, { message: "Pilihan jawaban tidak boleh kosong" }),
              benar: z.boolean(),
            })
          )
          .length(5, { message: "Harus ada tepat 5 pilihan jawaban" })
          .refine((pilihan) => pilihan.some((p) => p.benar), {
            message: "Jawaban benar harus di pilih",
          }),
      })
    )
    .min(1, { message: "Minimal harus ada 1 soal" }),
});

export type AddSoalInput = z.infer<typeof AddSoalSchema>;

export const updateSoalSchema = z.object({
  soal: z.string().min(1, { message: "Soal tidak boleh kosong" }),
  mataPelajaranId: z
    .string()
    .min(1, { message: "Mata pelajaran harus dipilih" }),
  gambar: z
    .union([
      z.string(),
      z
        .instanceof(File)
        .refine((file) => file.size <= MAX_FILE_SIZE, {
          message: "Ukuran maksimal file adalah 5MB",
        })
        .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
          message: "Format file harus jpeg, jpg, png, atau webp",
        }),
      z.null(), // Explicitly allow null
    ])
    .optional() // Make the whole union optional
    .nullable(), // Allow null values
  Jawaban: z
    .array(
      z.object({
        id: z.string().optional(),
        jawaban: z
          .string()
          .min(1, { message: "Pilihan jawaban tidak boleh kosong" }),
        benar: z.boolean(),
      })
    )
    .min(2, { message: "Minimal harus ada 2 pilihan jawaban" })
    .refine((data) => data.some((item) => item.benar), {
      message: "Harus ada setidaknya satu jawaban yang benar",
    }),
});

const WaktuPengerjaanEnum = z.enum(["30", "60", "120"]);
const StatusEnum = z.enum(["pending", "active", "selesai"], {
  message: "status hanya boleh pending, active atau selesai",
});

export const AddUjian = object({
  mataPelajaran: z.string().min(1, { message: "Mata pelajaran harus dipilih" }),

  waktuPengerjaan: WaktuPengerjaanEnum.refine((val) => val !== undefined, {
    message: "Waktu pengerjaan harus dipilih",
  }),

  token: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 5, {
      message: "Token harus memiliki minimal 5 karakter jika diisi",
    }),
});

export const updateUjianSchema = object({
  id: z.string().min(5, { message: "id tidak ada" }),
  waktuPengerjaan: WaktuPengerjaanEnum.refine((val) => val !== undefined, {
    message: "Waktu pengerjaan harus dipilih",
  }),
  status: StatusEnum.refine((val) => val !== undefined, {
    message: "Status harus dipilih",
  }),
  token: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 5, {
      message: "Token harus memiliki minimal 5 karakter jika diisi",
    }),
});

export const tokenSchema = z.object({
  token: z.string().min(1, { message: "token tidak boleh kosong" }),
});

export const submitUjianSchema = z.object({
  ujianId: z.string().min(1, "ID ujian tidak boleh kosong"),
  siswaDetailId: z.string().min(1, "ID siswa tidak boleh kosong"),
  // This will be a dynamic property for each question
  // We'll validate it separately in the action function
});

export type SubmitUjianInput = z.infer<typeof submitUjianSchema>;
