"use client";
import { useActionState, useEffect } from "react";
import { FormButton } from "../button";
import { AddBiodata, getBiodata } from "@/lib/crudBiodata";
import { showSuccessToast } from "../toast/ToastSuccess";
import useSWR, { mutate } from "swr";

const fetchData = async (): Promise<Biodata> => {
  try {
    const data = await getBiodata();
    return data as Biodata;
  } catch (error) {
    console.log("error fetch:", error);
    throw error;
  }
};

interface Biodata {
  id: string;
  namaSekolah: string;
  kepalaSekolah: string;
  NipKepalaSekolah: string;
  alamat: string;
}

const BiodataForm = () => {
  const [state, formAction] = useActionState(AddBiodata, null);
  console.log(state);
  const { data, error, isLoading } = useSWR<Biodata>(
    "biodataSekolah",
    fetchData
  );
  useEffect(() => {
    if (state?.succes) {
      showSuccessToast(state.message);
      mutate("biodataSekolah");
    }
  }, [state]);

  console.log(data);
  if (error) {
    return <p>Error mengambil data</p>;
  }

  if (isLoading) {
    return <p>Loading....</p>;
  }
  return (
    <form action={formAction} className="space-y-4 p-3">
      <input type="hidden" defaultValue={data?.id || ""} name="id" />
      <div className="flex items-center gap-4">
        <p className="font-semibold text-sm w-40">Nama Sekolah</p>
        <input
          type="text"
          name="namaSekolah"
          placeholder="Nama Sekolah"
          defaultValue={data?.namaSekolah || ""}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 flex-1 p-2.5"
        />
      </div>
      <div className="flex items-center gap-4">
        <p className="font-semibold text-sm w-40">Kepala Sekolah</p>
        <input
          type="text"
          name="kepalaSekolah"
          placeholder="Nama Kepala Sekolah"
          defaultValue={data?.kepalaSekolah || ""}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 flex-1 p-2.5"
        />
      </div>
      <div className="flex items-center gap-4">
        <p className="font-semibold text-sm w-40">NIP Kepala Sekolah</p>
        <input
          type="text"
          placeholder="NIP Kepala Sekolah"
          name="nipKepalaSekolah"
          defaultValue={data?.NipKepalaSekolah || ""}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 flex-1 p-2.5"
        />
      </div>
      <div className="flex flex-col">
        <label
          htmlFor="message"
          className="block mb-2 text-sm font-medium text-gray-900"
        >
          Alamat Sekolah
        </label>
        <textarea
          name="alamatSekolah"
          id="message"
          defaultValue={data?.alamat || ""}
          className="block p-2.5 w-full h-28 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300"
          placeholder="Alamat Sekolah..."
        ></textarea>
      </div>
      <div className="w-full flex justify-end">
        <div className="max-w-md">
          <FormButton />
        </div>
      </div>
    </form>
  );
};

export default BiodataForm;
