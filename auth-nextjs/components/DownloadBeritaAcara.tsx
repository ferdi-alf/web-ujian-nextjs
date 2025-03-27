import { FileDown } from "lucide-react";

const ButtonDownloadBeritaAcara = () => {
  return (
    <div className="">
      <button className="p-2 flex flex-nowrap gap-2 rounded-lg truncate bg-blue-500 text-white">
        Cetak Berita Acara
        <FileDown width={20} height={20} />
      </button>
    </div>
  );
};

export default ButtonDownloadBeritaAcara;
