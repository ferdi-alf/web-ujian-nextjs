export const dynamic = "auto";
import { auth } from "@/auth";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { FlipText } from "@/components/magicui/flip-text";
import { ShineBorder } from "@/components/magicui/shine-border";
import MulaiButton from "@/components/mulaiButton";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Tingkat } from "@prisma/client";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";

type Params = Promise<{ tingkat: string; namaUjian: string }>;

const UjianDetail = async (params: { params: Params }) => {
  const session = await auth();
  const { tingkat, namaUjian } = await params.params;

  const siswaDetail = session?.user?.id
    ? await prisma.siswaDetail.findUnique({
        where: {
          userId: session.user.id,
        },
        include: {
          user: true,
          kelas: true,
        },
      })
    : null;

  const ujian = await prisma.ujian.findFirst({
    where: {
      mataPelajaran: {
        tingkat: tingkat as Tingkat,
        pelajaran: namaUjian,
      },
    },

    include: {
      mataPelajaran: true,
    },
  });

  if (!ujian) {
    notFound();
  }

  return (
    <div className="w-full h-screen  flex justify-center  items-center">
      <div className="p-2  flex flex-col gap-2">
        <div className="z-10 flex  items-center justify-center">
          <div
            className={cn(
              "group rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            )}
          >
            <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
              <span>
                ✨ Dibuat Dengan ❤️ oleh{" "}
                <Link
                  className="text-blue-400"
                  href="https://instagram.com/eternalferr_"
                >
                  @eternalferr_
                </Link>
              </span>
              <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
            </AnimatedShinyText>
          </div>
        </div>
        <FlipText className="text-4xl font-bold my-3 -tracking-widest text-black dark:text-white md:text-5xl md:leading-[5rem]">
          Trust Yourself
        </FlipText>
        <ShineBorder
          className="w-full mx-auto p-5 flex flex-col justify-start  bg-white shadow-md rounded-lg"
          color={["#3f83f8", "#9061f9", "#e74694"]}
        >
          <div className="w-full">
            <div className="flex flex-nowrap gap-2">
              <div className="rounded-full w-24 h-24">
                <Image
                  width={50}
                  height={50}
                  className="rounded-full"
                  src={
                    siswaDetail?.user.image
                      ? siswaDetail.user.image
                      : "/avatar.png"
                  }
                  alt={`avatar siswa ${siswaDetail?.name}`}
                />
              </div>
              <div className="flex flex-col">
                <div className="flex gap-2">
                  <p className="font-semibold min-w-15">Nama:</p>
                  <p>{siswaDetail?.name || "-"}</p>
                </div>
                <div className="flex gap-2 ">
                  <p className="font-semibold min-w-15">Kelas:</p>
                  <p>
                    {siswaDetail?.kelas.tingkat || "-"} -{" "}
                    {siswaDetail?.kelas.jurusan || "-"}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-start mt-5 font-bold">Data Ujian</p>
            <div className="flex gap-2">
              <p className="font-semibold min-w-20">Mata Pelajaran:</p>
              <p>
                {ujian.mataPelajaran.tingkat} -{" "}
                {ujian.mataPelajaran.pelajaran || "-"}
              </p>
            </div>

            <div className="flex gap-2">
              <p className="font-semibold min-w-20">Waktu pengerjaan:</p>
              <span className="bg-pink-100 text-pink-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm border border-pink-400">
                {ujian.waktuPengerjaan} menit
              </span>
            </div>
          </div>
        </ShineBorder>
        <MulaiButton tingkat={tingkat} ujian={namaUjian} />
      </div>
    </div>
  );
};

export default UjianDetail;
