package utils

import (
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

func SaveUploadedFile(file *multipart.FileHeader) (string, error) {
    filename := uuid.New().String() + filepath.Ext(file.Filename)
    uploadDir := os.Getenv("UPLOAD_DIR")
    
    if err := os.MkdirAll(uploadDir, 0755); err != nil {
        return "", err
    }
    
    uploadPath := filepath.Join(uploadDir, filename)
    
    if err := os.WriteFile(uploadPath, []byte{}, 0644); err != nil {
        return "", err
    }

    src, err := file.Open()
    if err != nil {
        return "", err
    }
    defer src.Close()

    fileContent := make([]byte, file.Size)
    if _, err := src.Read(fileContent); err != nil {
        return "", err
    }

    if err := os.WriteFile(uploadPath, fileContent, 0644); err != nil {
        return "", err
    }
    
    return filename, nil
}