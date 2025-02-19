/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Box } from "@mui/material";
import { Check, MoveLeft } from "lucide-react";
import { useMemo, useState } from "react";
import downloadPDF from "@/components/downloadSoalPdf";

interface SoalData {
  id: string;
  soal: string;
  gambar?: string | null;
  tingkat: string; // These properties appear to be at the top level
  pelajaran: string; // based on your TableDataSoal component
}

interface FrameDataSoalProps {
  tingkat: string;
  pelajaran: string;
  soalList: SoalData[];
}

interface FrameDataSoalProps {
  tingkat: string;
  pelajaran: string;
  soalList: SoalData[];
}

const FrameDataSoal = ({
  tingkat,
  pelajaran,
  soalList,
}: FrameDataSoalProps) => {
  const [frame, setFrame] = useState(false);

  const filteredSoal = useMemo(() => {
    if (!soalList || soalList.length === 0) {
      return [];
    }

    const subjectObject = soalList.find(
      (item) => item.tingkat === tingkat && item.pelajaran === pelajaran
    );

    return Array.isArray(subjectObject?.soal) ? subjectObject.soal : [];
  }, [soalList, tingkat, pelajaran]);

  console.log("filter:", filteredSoal);

  const handleShowFrame = () => {
    setFrame((prev) => !prev);
  };

  return (
    <div>
      <button
        onClick={handleShowFrame}
        type="button"
        className="p-2 rounded-md bg-blue-500 text-white"
      >
        Details
      </button>
      <div
        className={`fixed top-0 z-30 right-0 h-screen overflow-auto bg-white shadow-lg transition-transform duration-300 ${
          frame ? "translate-x-0 w-full border" : "translate-x-full w-0"
        }`}
      >
        <div className="md:pl-64 pl-0 h-screen bg-white">
          <div className="p-3">
            <div className="w-full p-2 border-b">
              <div className="md:w-[60%]  w-full flex items-center justify-between">
                <button
                  onClick={handleShowFrame}
                  className="text-xl font-semibold hover:bg-gray-200 rounded-md p-2"
                >
                  <MoveLeft />
                </button>
                <h1 className="text-xl  font-semibold">
                  Data Soal {pelajaran} tingkat {tingkat}
                </h1>
              </div>
            </div>

            <div className="py-2">
              <Box sx={{ width: "100%" }}>
                <div className="flex flex-col gap-2 p-3 mt-3 ">
                  <div className="flex flex-nowrap gap-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadPDF({
                          soalData: filteredSoal,
                          pelajaran: pelajaran,
                          tingkat: tingkat,
                        })
                      }
                      className="text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
                    >
                      Unduh Soal PDF
                    </button>
                    <button
                      type="button"
                      className="text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
                    >
                      Unduh Soal Excel
                    </button>
                  </div>
                  {filteredSoal.map((soal, index) => (
                    <div key={soal.id} className="p-3 mt-3 shadow-md">
                      <p className="font-bold text-lg">{index + 1}</p>
                      {soal.gambar && (
                        <img
                          src={soal.gambar}
                          alt={`gambar soal nomor ${index + 1}`}
                          className="rounded-lg h-32"
                        />
                      )}
                      <p className="text-base font-medium">{soal.soal}</p>

                      {soal.Jawaban.map((jawaban: any, index: number) => {
                        const optionLetter = String.fromCharCode(65 + index);

                        return (
                          <div key={jawaban.id}>
                            <div className="flex items-center gap-x-2">
                              <span className="w-6 h-6 mt-1 flex items-center justify-center rounded-full bg-gray-100">
                                {optionLetter}
                              </span>
                              <p
                                className={`${
                                  jawaban.benar ? "text-green-400" : ""
                                } font-light`}
                              >
                                {jawaban.jawaban}
                              </p>
                              {jawaban.benar && (
                                <Check className="text-green-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </Box>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameDataSoal;
