package utils

import (
	"backend/models"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/jung-kurt/gofpdf"
)

func GeneratePDF(tingkat, mataPelajaran, kelas string, hasil []models.HasilUjianDetail) (string, error) {
	// Buat direktori jika belum ada
	dirPath := fmt.Sprintf("temp/%s/%s", tingkat, mataPelajaran)
	os.MkdirAll(dirPath, os.ModePerm)

	// Nama file sekarang menggunakan format yang benar
	// Perbaiki format nama file agar sesuai dengan harapan
	fileName := fmt.Sprintf("%s-%s-%s.pdf", mataPelajaran, tingkat, kelas)
	filePath := fmt.Sprintf("%s/%s", dirPath, fileName)

	// Buat PDF baru
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Header - Pusatkan judul
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(190, 10, fmt.Sprintf("Hasil Ujian %s - %s", mataPelajaran, kelas), "", 0, "C", false, 0, "")
	pdf.Ln(15)

	// Buat header tabel
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(240, 240, 240)

	// Lebar kolom diperbaiki agar lebih proporsional
	colWidths := []float64{10, 45, 20, 35, 25, 20, 35}
	headers := []string{"No", "Nama", "Nilai", "Total Kecurangan", "Kelas", "NIS", "Waktu Pengerjaan"}

	for i, header := range headers {
		pdf.CellFormat(colWidths[i], 10, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Filter hasil hanya untuk kelas yang spesifik
	var filteredHasil []models.HasilUjianDetail
	for _, h := range hasil {
		if h.Tingkat == tingkat && h.MataPelajaran == mataPelajaran && strings.Contains(h.Kelas, kelas) {
			filteredHasil = append(filteredHasil, h)
		}
	}

	// Isi tabel
	pdf.SetFont("Arial", "", 7)
	for i, h := range filteredHasil {
		// Gunakan nilai langsung karena sudah dalam bentuk string
		nilaiStr := h.Nilai

		// Format kelas menjadi "X-RPL" bukan "X-X-RPL"
		kelasFormatted := strings.Replace(h.Kelas, fmt.Sprintf("%s-", tingkat), "", 1)

		// Isi setiap kolom
		pdf.CellFormat(colWidths[0], 8, fmt.Sprintf("%d", i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[1], 8, h.SiswaNama, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[2], 8, nilaiStr, "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[3], 8, fmt.Sprintf("%d", h.TotalKecurangan), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[4], 8, kelasFormatted, "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[5], 8, h.NIS, "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[6], 8, convertToMinutes(h.WaktuPengerjaan), "1", 0, "C", false, 0, "")
		pdf.Ln(-1)
	}

	// Simpan PDF
	err := pdf.OutputFileAndClose(filePath)
	if err != nil {
		log.Println("Error creating PDF:", err)
		return "", err
	}

	return filePath, nil
}

// Fungsi untuk mengkonversi waktu dalam detik ke format menit:detik
func convertToMinutes(waktuStr string) string {
	waktu, err := strconv.Atoi(waktuStr)
	if err != nil {
		return waktuStr
	}

	menit := waktu / 60
	detik := waktu % 60

	return fmt.Sprintf("%d:%02d", menit, detik)
}
