import dayjs from "dayjs";
import { object, string, z } from "zod";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

export const SignInSchema = object({
  username: string().nonempty("Invalid email"),
  password: string().min(8, "Password must be more than 8 characters"),
});

export const ResgisterSchema = object({
  username: string().min(1, "Name must be more than 1 character"),
  password: string().min(8, "Password must be more than 8 characters"),
  confirmPassword: string().min(8, "Password must be more than 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

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
    jurusan: z.string().optional(),
    password: z.string().min(8, "password harus berisi minimal 8 karakter"),
  })
  .superRefine((data, ctx) => {
    if (
      data.role === "PROKTOR" &&
      (!data.jurusan || data.jurusan.trim() === "")
    ) {
      ctx.addIssue({
        path: ["jurusan"],
        message: "jurusan wajib dipilih untuk role Proktor",
        code: "custom",
      });
    }
  });

export const UpdatProfileSchema = z
  .object({
    id: z.string({
      required_error: "ID user diperlukan",
    }),
    username: z
      .string({
        required_error: "Username diperlukan ",
      })
      .min(3, "Username minimal 3 karakter ")
      .optional(),
    image: z
      .any()
      .refine(
        (file) =>
          !file ||
          (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)),
        {
          message: "Format gambar tidak valid (hanya: JPG, PNG, WEBP)",
          path: ["image"],
        }
      )
      .optional(),
    oldPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // Jika newPassword ada, confirmPassword harus sama dengan newPassword
      if (data.newPassword && data.newPassword !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Password baru dan konfirmasi password harus sama",
      path: ["confirmPassword"],
    }
  )
  .refine(
    (data) => {
      // Jika oldPassword tidak kosong, newPassword dan confirmPassword harus diisi
      if (data.oldPassword && (!data.newPassword || !data.confirmPassword)) {
        return false;
      }
      return true;
    },
    {
      message:
        "Password baru dan konfirmasi password harus diisi jika password lama diisi",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      // Jika newPassword ada, confirmPassword tidak boleh kosong
      if (data.newPassword && !data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Konfirmasi password diperlukan jika password baru diisi",
      path: ["confirmPassword"],
    }
  );

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
    jurusan: z.string().optional(),
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
      (!data.jurusan || data.jurusan.trim() === "")
    ) {
      ctx.addIssue({
        path: ["jurusan"],
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

export const updateUjianSchema = z
  .object({
    id: z.string().min(5, { message: "ID tidak ada" }),

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

    jamMulai: z
      .string()
      .optional()
      .refine((val) => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
        message: "Format jam mulai harus HH:mm",
      }),

    jamSelesai: z
      .string()
      .optional()
      .refine((val) => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
        message: "Format jam selesai harus HH:mm",
      }),
  })
  .refine(
    (data) => {
      // If either start or end time is provided, both must be present
      if (data.jamMulai || data.jamSelesai) {
        return !!(data.jamMulai && data.jamSelesai);
      }
      return true;
    },
    {
      message: "Jika salah satu waktu diisi, waktu lainnya juga harus diisi",
      path: ["jamMulai", "jamSelesai"],
    }
  )
  .refine(
    (data) => {
      if (data.jamMulai && data.jamSelesai) {
        const [startHour, startMinute] = data.jamMulai.split(":").map(Number);
        const [endHour, endMinute] = data.jamSelesai.split(":").map(Number);

        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        return endTime > startTime;
      }
      return true;
    },
    {
      message: "Jam selesai harus lebih besar dari jam mulai",
      path: ["jamSelesai"],
    }
  )
  .refine(
    (data) => {
      if (data.status === "active") {
        return !!(data.jamMulai && data.jamSelesai);
      }
      return true;
    },
    {
      message:
        "Sebelum mengaktifkan ujian, harap isi jam mulai dan jam selesai terlebih dahulu",
      path: ["jamMulai", "jamSelesai"],
    }
  );

export type UpdateUjianInput = z.infer<typeof updateUjianSchema>;
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

export const AddBiodataSchema = z.object({
  id: z.string().optional(), // ID tetap optional untuk update data
  namaSekolah: z
    .string()
    .min(3, "Nama sekolah minimal 3 karakter")
    .optional()
    .or(z.literal("")), // Jika kosong, biarkan tanpa validasi
  kepalaSekolah: z
    .string()
    .min(3, "Nama kepala sekolah minimal 3 karakter")
    .optional()
    .or(z.literal("")),
  nipKepalaSekolah: z
    .string()
    .min(8, "NIP minimal 8 karakter")
    .max(18, "NIP maksimal 18 karakter")
    .optional()
    .or(z.literal("")),
  alamatSekolah: z
    .string()
    .min(5, "Alamat sekolah minimal 5 karakter")
    .optional()
    .or(z.literal("")),
});

export const JumlahSesiEnum = z.enum(["1", "2", "3"], {
  required_error: "jumlah sesi tidak valid, pilih antara 1 sampai 3 sesi",
});

export const addJadwalUjianSchema = z.object({
  tingkat: TingkatEnum,
  jumlahSesi: JumlahSesiEnum,
  tanggal: z.coerce.date({
    errorMap: () => ({
      message: "Tanggal jadwal ujian wajib diisi dan harus valid",
    }),
  }),
});

export const addUjianToSesiSchema = z.object({
  mataPelajaranIds: z.array(
    z.string({
      message: "Pilih setidaknya 1 ujian untuk di tambahkan",
    })
  ),
  idJadwal: z.string(),
});

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export const ujianSchema = z
  .object({
    id: z.string(),
    jamMulai: z.string().nullable(),
    jamSelesai: z.string().nullable(),
    mataPelajaran: z.string().optional(), // Tambahkan ini karena ada di data
  })
  .refine(
    (data) => {
      // Skip validasi jika salah satu atau kedua nilai null
      if (data.jamMulai === null || data.jamSelesai === null) {
        return true;
      }

      // Konversi ke objek dayjs dan bandingkan secara eksplisit dengan format
      const start = dayjs(`2023-01-01 ${data.jamMulai}`);
      const end = dayjs(`2023-01-01 ${data.jamSelesai}`);

      // Pastikan jam mulai lebih awal dari jam selesai
      return start.isBefore(end);
    },
    {
      message: "Jam mulai ujian harus lebih kecil dari jam selesai",
      path: ["jamMulai"],
    }
  );

// Schema untuk sesi
const sesiSchema = z
  .object({
    id: z.string(),
    jamMulai: z.string().nullable(), // Mengizinkan null
    jamSelesai: z.string().nullable(), // Mengizinkan null
    ujian: z.array(ujianSchema),
    sesi: z.number().optional(), // Tambahkan ini karena ada di data
  })
  .refine(
    (data) => {
      try {
        // Skip validasi jika salah satu atau kedua nilai null
        if (data.jamMulai === null || data.jamSelesai === null) {
          return true;
        }

        // Gunakan pendekatan tanggal lengkap untuk menghindari masalah format
        const start = dayjs(`2023-01-01 ${data.jamMulai}`);
        const end = dayjs(`2023-01-01 ${data.jamSelesai}`);

        // Cek secara eksplisit apakah valid sebelum membandingkan
        if (!start.isValid() || !end.isValid()) {
          console.log("Format waktu tidak valid:", { start, end });
          return false;
        }

        // Debug
        console.log("Comparing times:", {
          jamMulai: data.jamMulai,
          jamSelesai: data.jamSelesai,
          isBefore: start.isBefore(end),
        });

        // Pastikan jam mulai sesi lebih awal dari jam selesai sesi
        return start.isBefore(end);
      } catch (error) {
        console.error("Error during validation:", error);
        return false;
      }
    },
    {
      message: "Jam mulai sesi harus lebih kecil dari jam selesai",
      path: ["jamMulai"],
    }
  )
  .superRefine((data, ctx) => {
    // Skip validasi jika jam sesi tidak lengkap
    if (data.jamMulai === null || data.jamSelesai === null) {
      return;
    }

    const sesiStart = dayjs(`2023-01-01 ${data.jamMulai}`);
    const sesiEnd = dayjs(`2023-01-01 ${data.jamSelesai}`);

    // Periksa setiap ujian
    data.ujian.forEach((ujian, index) => {
      // Skip jika jamMulai atau jamSelesai ujian null
      if (ujian.jamMulai === null || ujian.jamSelesai === null) {
        return;
      }

      const ujianStart = dayjs(`2023-01-01 ${ujian.jamMulai}`);
      const ujianEnd = dayjs(`2023-01-01 ${ujian.jamSelesai}`);

      // Validasi: ujianStart harus >= sesiStart
      if (!ujianStart.isSame(sesiStart) && !ujianStart.isAfter(sesiStart)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Jam mulai ujian (${ujian.jamMulai}) harus sama dengan atau setelah jam mulai sesi (${data.jamMulai})`,
          path: [`ujian`, index, "jamMulai"],
        });
      }

      // Validasi: ujianEnd harus <= sesiEnd
      if (!ujianEnd.isSame(sesiEnd) && !ujianEnd.isBefore(sesiEnd)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Jam selesai ujian (${ujian.jamSelesai}) harus sama dengan atau sebelum jam selesai sesi (${data.jamSelesai})`,
          path: [`ujian`, index, "jamSelesai"],
        });
      }

      // Validasi: ujianStart harus < ujianEnd
      if (!ujianStart.isBefore(ujianEnd)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Jam mulai ujian (${ujian.jamMulai}) harus lebih awal dari jam selesai ujian (${ujian.jamSelesai})`,
          path: [`ujian`, index, "jamMulai"],
        });
      }
    });
  });

export const payloadSchema = z.object({
  idJadwal: z.string(),
  sesi: z.array(sesiSchema),
});
