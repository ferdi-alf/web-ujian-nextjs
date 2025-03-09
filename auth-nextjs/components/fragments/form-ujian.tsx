/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSoal } from "@/lib/crudSoal";
import { MataPelajaran } from "@prisma/client";
import { FormControl, FormHelperText, Input, InputLabel } from "@mui/material";

const FormInputUjian = ({ errors }: { errors?: any }) => {
  const [classes, setClasses] = React.useState<MataPelajaran[]>([]);
  React.useEffect(() => {
    const fetchData = async () => {
      const UjianList = await getSoal();
      setClasses(UjianList || []);
    };

    fetchData();
  }, []);

  const groupClasses: Record<string, MataPelajaran[]> = classes.reduce(
    (acc, pelajaran) => {
      if (!acc[pelajaran.tingkat]) acc[pelajaran.tingkat] = [];
      acc[pelajaran.tingkat].push(pelajaran);
      return acc;
    },
    {} as Record<string, MataPelajaran[]>
  );

  const orderesTingkat = ["X", "XI", "XII"];

  const sortedGroup = Object.entries(groupClasses).sort(
    (a, b) => orderesTingkat.indexOf(a[0]) - orderesTingkat.indexOf(b[0])
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Mata Pelajaran */}
        <div className="w-full">
          <Select name="mataPelajaran">
            <SelectTrigger>
              <SelectValue placeholder="Pilih soal mata pelajaran" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {sortedGroup.map(([tingkat, pelajaranList]) => (
                <SelectGroup key={tingkat}>
                  <SelectLabel>Soal tingkat {tingkat}</SelectLabel>
                  {pelajaranList.map((pelajaran) => (
                    <SelectItem
                      className="hover:bg-slate-100"
                      key={pelajaran.id}
                      value={pelajaran.id}
                    >
                      {pelajaran.tingkat} - {pelajaran.pelajaran}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {errors?.mataPelajaran && (
            <p className="text-red-500 text-start text-sm mt-1">
              {errors.mataPelajaran[0]}
            </p>
          )}
        </div>

        {/* Waktu Pengerjaan */}
        <div className="w-full">
          <Select name="waktuPengerjaan">
            <SelectTrigger>
              <SelectValue placeholder="Pilih waktu pengerjaan" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup className="bg-white hove">
                <SelectLabel>Waktu pengerjaan</SelectLabel>
                <SelectItem className="hover:bg-slate-100" value="30">
                  30 menit
                </SelectItem>
                <SelectItem className="hover:bg-slate-100" value="60">
                  60 menit
                </SelectItem>
                <SelectItem className="hover:bg-slate-100" value="120">
                  120 menit
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors?.waktuPengerjaan && (
            <p className="text-red-500 text-start text-sm mt-1">
              {errors.waktuPengerjaan[0]}
            </p>
          )}
        </div>
      </div>

      {/* Token */}
      <FormControl
        error={errors?.token}
        fullWidth
        className="mt-6"
        variant="standard"
      >
        <InputLabel htmlFor="token">Token</InputLabel>
        <Input
          placeholder="Masukan Token"
          name="token"
          id="token"
          aria-describedby="token-error-text"
        />
        <p className="text-xs text-start">
          Token bersifat opsional atau dapat dikosongkan terlebih dahulu jika
          belum ingin mengaktifkan ujian.
        </p>
        {errors?.token && (
          <FormHelperText className="text-red-500 text-start text-sm mt-1">
            {errors.token[0]}
          </FormHelperText>
        )}
      </FormControl>
    </>
  );
};

export default FormInputUjian;
