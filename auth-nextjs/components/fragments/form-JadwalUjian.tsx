"use client";
import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface ErrorField {
  tingkat?: string[] | undefined;
  jumlahSesi?: string[] | undefined;
  tanggal?: string[] | undefined;
}
const FormJadwalUjian = ({ state }: { state?: ErrorField }) => {
  const [startDate, setStartDate] = useState(new Date());
  return (
    <>
      <div className="w-full">
        <label
          htmlFor="tingkat"
          className="block mt-3 text-start mb-2 text-sm font-medium text-gray-900 "
        >
          Piliah Tingkat
        </label>
        <select
          defaultValue=""
          id="tingkat"
          name="tingkat"
          className={`bg-gray-50 border md:text-base text-sm ${
            state?.tingkat ? "border-red-500" : "border-gray-300"
          } border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
        >
          <option value="" disabled>
            Tingkat
          </option>
          <option value="X">X</option>
          <option value="XI">XI</option>
          <option value="XII">XII</option>
        </select>
        <p className="text-sm text-red-500">{state?.tingkat}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="">
          <label
            htmlFor="tanggal"
            className="block mt-3 text-start mb-2 md:text-sm text-xs font-medium text-gray-900 "
          >
            Masukan Tanggal Jadwal
          </label>
          <DatePicker
            id="tanggal"
            selected={startDate}
            onChange={(date: Date | null) => {
              if (date) {
                date.setHours(12, 0, 0, 0);
                setStartDate(date);

                const inputHidden = document.getElementById(
                  "tanggal-hidden"
                ) as HTMLInputElement;
                if (inputHidden) {
                  inputHidden.value = date.toISOString().split("T")[0];
                }
              }
            }}
            locale="id"
            preventOpenOnFocus
            strictParsing
            dateFormat="dd/MM/yyyy"
            className={`bg-gray-50 border ${
              state?.tanggal ? "border-red-500" : "border-gray-300"
            }   text-sm rounded-lg w-full p-2.5`}
            placeholderText="dd/mm/yyyy"
            name="tanggal-picker"
          />
          <input type="hidden" name="tanggal" id="tanggal-hidden" />

          <p className="text-sm text-red-500">{state?.tanggal}</p>
        </div>
        <div className="">
          <label
            className="block mt-3 text-start mb-2 text-sm font-medium text-gray-900 "
            htmlFor="jumlahSesi"
          >
            Masukan Jumlah Sesi
          </label>
          <select
            defaultValue=""
            id="jumlahSesi"
            name="jumlahSesi"
            className={`bg-gray-50 border  ${
              state?.tingkat ? "border-red-500" : "border-gray-300"
            } border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
          >
            <option value="" disabled>
              Pilih Jumlah Sesi
            </option>
            <option value="1">1 Sesi</option>
            <option value="2">2 Sesi</option>
            <option value="3">3 Sesi</option>
          </select>
          <p className="text-sm text-red-500">{state?.jumlahSesi}</p>
        </div>
      </div>
    </>
  );
};

export default FormJadwalUjian;
