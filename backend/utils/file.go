// utils/file.go
package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)
func SaveImage(file *multipart.FileHeader) (string, error) {
    // Use absolute path from the backend directory
    uploadDir := "../web-ulangan/public/image-soal"
    
    // Ensure directory exists with proper permissions
    if err := os.MkdirAll(uploadDir, 0755); err != nil {
        return "", fmt.Errorf("error creating directory: %v", err)
    }

    // Generate unique filename
    ext := filepath.Ext(file.Filename)
    newFileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
    
    // Get absolute file path
    absFilePath, err := filepath.Abs(filepath.Join(uploadDir, newFileName))
    if err != nil {
        return "", fmt.Errorf("error getting absolute path: %v", err)
    }

    // Open source file
    src, err := file.Open()
    if err != nil {
        return "", fmt.Errorf("error opening source file: %v", err)
    }
    defer src.Close()

    // Create destination file
    dst, err := os.Create(absFilePath)
    if err != nil {
        return "", fmt.Errorf("error creating destination file: %v", err)
    }
    defer dst.Close()

    // Copy file contents
    if _, err = io.Copy(dst, src); err != nil {
        return "", fmt.Errorf("error copying file: %v", err)
    }

    // Return web-accessible path
    return fmt.Sprintf("/image-soal/%s", newFileName), nil
}