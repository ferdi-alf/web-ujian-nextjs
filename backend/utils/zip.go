package utils

import (
	"archive/zip"
	"io"
	"os"
	"strings"
)

func CreateZIP(outputPath string, files map[string]string) error {
    zipFile, err := os.Create(outputPath)
    if err != nil {
        return err
    }
    defer zipFile.Close()

    zipWriter := zip.NewWriter(zipFile)
    defer zipWriter.Close()

    for zipPath, filePath := range files {
        file, err := os.Open(filePath)
        if err != nil {
            return err
        }
        defer file.Close()

        // Ubah path menjadi format ZIP-friendly
        zipPath = strings.ReplaceAll(zipPath, "\\", "/")

        // Buat direktori di dalam ZIP jika perlu
       

        // Tambahkan file ke ZIP
        w, err := zipWriter.Create(zipPath)
        if err != nil {
            return err
        }

        if _, err := io.Copy(w, file); err != nil {
            return err
        }
    }

    return nil
}

