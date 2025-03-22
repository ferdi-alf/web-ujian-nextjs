import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import InputToken from "@/components/fragments/input-token";

const CardName = async () => {
  const session = await auth();

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

  console.log(session);

  return (
    // <div className="p-2">
    <div className="p-8 mx-2 bg-white/30 rounded-lg inset-0 sm:w-3/5 shadow-lg max-w-md w-full">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <p className="font-semibold min-w-20">Nama:</p>
          <p>{siswaDetail?.name || "-"}</p>
        </div>
        <div className="flex gap-2">
          <p className="font-semibold min-w-20">Kelas:</p>
          <p>
            {siswaDetail?.kelas.tingkat || "-"} -{" "}
            {siswaDetail?.kelas.jurusan || "-"}
          </p>
        </div>
        <div className="flex gap-2">
          <p className="font-semibold min-w-20">NIS/NISN:</p>
          <p>{siswaDetail?.nis}</p>
        </div>
        <div className="flex gap-2">
          <p className="font-semibold min-w-20">Ruang:</p>
          <p>{siswaDetail?.ruang}</p>
        </div>
        <div className="flex gap-2">
          <p className="font-semibold min-w-20">Status:</p>
          <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm  border border-green-400">
            {siswaDetail?.status}
          </span>
        </div>
      </div>
      <div className="mt-5 w-full">
        <InputToken />
      </div>
    </div>
    // </div>
  );
};

export default CardName;
