"use client";

import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { InteractiveHoverButton } from "./magicui/interactive-hover-button";

const MulaiButton = ({
  tingkat,
  ujian,
}: {
  tingkat: string;
  ujian: string;
}) => {
  const router = useRouter();

  const handleMulaiUjian = () => {
    Swal.fire({
      title: "Harap Baca Ini Sebelum Memulai!",
      icon: "info",
      html: `
        <ul style="text-align: left; list-style-type: disc; margin-left: 20px;">
          <li>Sistem dapat mendeteksi kecurangan kamu.</li>
          <li>Setiap kali kamu ketahuan curang, nilaimu akan dikurangi <b>3</b>.</li>
          <li>Bersikap jujur saat mengerjakan ujian!😁.</li>
       </ul>
      `,
      showCancelButton: true,
      confirmButtonText: "Ok, saya mengerti",
    }).then((result) => {
      if (result.isConfirmed) {
        router.push(`/ujian/${tingkat}/${ujian}/mulai`);
      }
    });
  };

  return (
    <InteractiveHoverButton onClick={handleMulaiUjian}>
      Mulai
    </InteractiveHoverButton>
  );
};

export default MulaiButton;
