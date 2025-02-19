/* eslint-disable @typescript-eslint/no-explicit-any */
// First, install the needed packages:
// npm install jspdf html2canvas

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
// import dynamic from "next/dynamic";

interface DownloadPDFProps {
  soalData: any[];
  pelajaran: string;
  tingkat: string;
}

const downloadPDF = async ({
  soalData,
  pelajaran,
  tingkat,
}: DownloadPDFProps) => {
  // const jsPDF = dynamic(() => import("jspdf").then((mod) => mod.jsPDF), {
  //   ssr: false,
  // });
  // Create a temporary div to render content for PDF
  const tempDiv = document.createElement("div");
  tempDiv.style.padding = "20px";
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.backgroundColor = "white";
  tempDiv.style.width = "595px"; // A4 width in pixels at 72 DPI

  // Create header with title
  const header = document.createElement("div");
  header.style.textAlign = "center";
  header.style.marginBottom = "20px";
  header.innerHTML = `
    <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">Soal ${pelajaran}</h1>
    <h2 style="font-size: 14px; margin-top: 0;">Tingkat ${tingkat}</h2>
    <div style="width: 100%; height: 2px; background-color: #000; margin: 10px 0;"></div>
  `;
  tempDiv.appendChild(header);

  // Create content for each question
  soalData.forEach((soal, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.style.marginBottom = "15px";
    questionDiv.style.padding = "10px";
    questionDiv.style.borderBottom = "1px solid #eee";

    // Question text
    const questionText = document.createElement("div");
    questionText.innerHTML = `
      <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
        <span style="font-weight: bold; margin-right: 8px;">${index + 1}.</span>
        <div style="display: flex; flex-direction: column;">
         ${
           soal.gambar !== null
             ? `<img src=${soal.gambar} style="width: 8rem; height: auto"/>`
             : ""
         }
        <span style="font-weight: 500;">${soal.soal}</span>
        </div>
       
      </div>
    `;
    questionDiv.appendChild(questionText);

    // Answer options
    soal.Jawaban.forEach((jawaban: any, idx: number) => {
      const optionLetter = String.fromCharCode(65 + idx);
      const answerDiv = document.createElement("div");
      answerDiv.style.display = "flex";
      answerDiv.style.alignItems = "center";
      answerDiv.style.marginLeft = "25px";
      answerDiv.style.marginBottom = "5px";

      // Create the option letter in a circle
      const circleSpan = document.createElement("span");
      circleSpan.style.display = "inline-flex";
      circleSpan.style.alignItems = "center";
      circleSpan.style.justifyContent = "center";
      circleSpan.style.width = "24px";
      circleSpan.style.height = "24px";
      circleSpan.style.borderRadius = "50%";
      circleSpan.style.backgroundColor = "#f3f4f6";
      circleSpan.style.marginRight = "8px";
      circleSpan.textContent = optionLetter;

      // Create the answer text
      const answerText = document.createElement("span");
      answerText.style.color = jawaban.benar ? "#4ade80" : "black";
      answerText.textContent = jawaban.jawaban;

      // Add check mark for correct answer
      if (jawaban.benar) {
        const checkSpan = document.createElement("span");
        checkSpan.style.color = "#4ade80";
        checkSpan.style.marginLeft = "8px";
        checkSpan.innerHTML = "✓";
        answerDiv.appendChild(circleSpan);
        answerDiv.appendChild(answerText);
        answerDiv.appendChild(checkSpan);
      } else {
        answerDiv.appendChild(circleSpan);
        answerDiv.appendChild(answerText);
      }

      questionDiv.appendChild(answerDiv);
    });

    tempDiv.appendChild(questionDiv);
  });

  // Add the temporary div to the document
  document.body.appendChild(tempDiv);

  try {
    const pdf = new jsPDF("p", "pt", "a4");

    const canvas = await html2canvas(tempDiv, {
      scale: 2, // Meningkatkan kualitas gambar
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");

    const imgWidth = 595; // Lebar A4 dalam px
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 842; // Tinggi A4 dalam px
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Jika konten lebih tinggi dari satu halaman, tambahkan halaman baru
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `Soal_${pelajaran}_${tingkat}_${new Date()
      .toLocaleDateString()
      .replace(/\//g, "-")}.pdf`;

    pdf.save(fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Terjadi kesalahan saat membuat PDF. Silakan coba lagi.");
  } finally {
    // Clean up the temporary div
    if (tempDiv.parentNode) {
      tempDiv.parentNode.removeChild(tempDiv);
    }
  }
};

export default downloadPDF;
