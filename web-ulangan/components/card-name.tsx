import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import InputToken from "./fragments/input-token";

const session = await auth();

const siswaDetail = session?.user?.id
  ? await prisma.siswaDetail.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        name: true,
        tingkat: true,
        jurusan: true,
        tanggalLahir: true,
      },
    })
  : null;

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const CardName = async () => {
  return (
    <div className="p-8 bg-white/30 rounded-lg inset-0 backdrop-blur-md sm:w-3/5 shadow-lg max-w-md">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <p className="font-bold min-w-20">Nama:</p>
          <p>{siswaDetail?.name || "-"}</p>
        </div>
        <div className="flex gap-2">
          <p className="font-bold min-w-20">Tingkat:</p>
          <p>{siswaDetail?.tingkat || "-"}</p>
        </div>
        <div className="flex gap-2">
          <p className="font-bold min-w-20">Jurusan:</p>
          <p>{siswaDetail?.jurusan || "-"}</p>
        </div>
        <div className="flex gap-2">
          <p className="font-bold min-w-20">Tgl Lahir:</p>
          <p>
            {siswaDetail?.tanggalLahir
              ? formatDate(siswaDetail.tanggalLahir)
              : "-"}
          </p>
        </div>
      </div>
      <div className="mt-5 w-full">
        <InputToken />
      </div>
    </div>
  );
};

export default CardName;
