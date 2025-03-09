import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "react-hot-toast";

const DownloadResultsButton = () => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      toast.loading("Generating exam results archive...", {
        id: "download-toast",
      });

      // Ambil API URL dari env
      const API = process.env.NEXT_PUBLIC_API_URL_GOLANG;
      const response = await fetch(`${API}/api/ujian/download`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to download results");
      }

      // Konversi response ke Blob untuk menangani file ZIP
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Buat elemen <a> untuk mendownload file ZIP
      const a = document.createElement("a");
      a.href = url;
      a.download = "hasil-ujian.zip"; // Nama file ZIP
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Download berhasil!", { id: "download-toast" });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Terjadi kesalahan saat mengunduh hasil", {
        id: "download-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isLoading}
      className="bg-green-600 hover:bg-green-700 mb-4"
    >
      <Download className="mr-2 h-4 w-4" />
      {isLoading ? "Generating..." : "Download Semua Hasil Ujian"}
    </Button>
  );
};

export default DownloadResultsButton;
