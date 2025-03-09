package handlers

import (
	"backend/repositories"
	"backend/utils"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
)

func DownloadHasilUjian(c *fiber.Ctx, db *sql.DB) error {
    hasil, err := repositories.GetHasilUjian(db)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Gagal mengambil data hasil ujian"})
    }

    // Buat direktori temporary dengan timestamp untuk menghindari konflik
    timestamp := time.Now().Unix()
    tempDir := fmt.Sprintf("temp/hasil_ujian_%d", timestamp)
    os.MkdirAll(tempDir, os.ModePerm)
    
    // Map untuk menyimpan tingkat, mata pelajaran, dan kelas yang unik
    uniqueData := make(map[string]map[string]map[string]bool)
    
    // Identifikasi semua kombinasi tingkat/matapelajaran/kelas yang ada
    for _, h := range hasil {
        if _, ok := uniqueData[h.Tingkat]; !ok {
            uniqueData[h.Tingkat] = make(map[string]map[string]bool)
        }
        
        if _, ok := uniqueData[h.Tingkat][h.MataPelajaran]; !ok {
            uniqueData[h.Tingkat][h.MataPelajaran] = make(map[string]bool)
        }
        
        uniqueData[h.Tingkat][h.MataPelajaran][h.Kelas] = true
    }
    
    // Map untuk menyimpan path file dalam ZIP dan path file PDF
    files := make(map[string]string)
    
    // Buat PDF untuk setiap kelas
    for tingkat, mataPelajaranMap := range uniqueData {
        for mataPelajaran, kelasMap := range mataPelajaranMap {
            for kelas := range kelasMap {
                pdfPath, err := utils.GeneratePDF(tingkat, mataPelajaran, kelas, hasil)
                if err != nil {
                    continue
                }
                
                // Format jalur file di dalam ZIP: Ujian Tingkat X/X-BIndo/X-RPL.pdf
               zipPath := fmt.Sprintf("Hasil Ujian/Ujian Tingkat %s/%s/%s.pdf", tingkat, mataPelajaran, kelas)

                
                files[zipPath] = pdfPath
            }
        }
    }
    
    // Buat ZIP
    zipPath := filepath.Join(tempDir, "hasil_ujian.zip")
    err = utils.CreateZIP(zipPath, files)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat ZIP"})
    }
    
    // Kirim file ZIP ke user
    c.Set("Content-Disposition", "attachment; filename=hasil_ujian.zip")
    err = c.SendFile(zipPath)
    
    // Bersihkan file temporary setelah selesai (bisa dijalankan sebagai goroutine)
    go func() {
        time.Sleep(5 * time.Minute) // Beri waktu untuk download selesai
        os.RemoveAll(tempDir)
    }()
    
    return err
}