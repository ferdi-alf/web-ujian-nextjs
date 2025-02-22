package validators

import (
	"backend/models" // Ganti dengan path module kamu
	"errors"
	"fmt"
	"mime/multipart"
	"path/filepath"
)

// Constants for validation
const (
	MaxFileSize       = 5 * 1024 * 1024 // 5MB
	MinPilihanLength  = 5
	MinSoalDataLength = 1
)

// AcceptedImageTypes contains valid image MIME types
var AcceptedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

// ValidateSoalInput validates the entire soal input
func ValidateSoalInput(tingkat, pelajaran string, soalData []models.SoalInput, files map[string][]*multipart.FileHeader) error {
	// Validate tingkat
	if !isValidTingkat(tingkat) {
		return errors.New("tingkat harus X, XI, atau XII")
	}

	// Validate pelajaran
	if pelajaran == "" {
		return errors.New("pelajaran tidak boleh kosong")
	}

	// Validate soalData length
	if len(soalData) < MinSoalDataLength {
		return errors.New("minimal harus ada 1 soal")
	}

	// Validate each soal
	for i, soal := range soalData {
		if err := validateSingleSoal(soal, i, files); err != nil {
			return err
		}
	}

	return nil
}

// isValidTingkat checks if tingkat is one of the allowed values
func isValidTingkat(tingkat string) bool {
	validTingkat := map[string]bool{
		"X":   true,
		"XI":  true,
		"XII": true,
	}
	return validTingkat[tingkat]
}

// validateSingleSoal validates a single soal entry
func validateSingleSoal(soal models.SoalInput, index int, files map[string][]*multipart.FileHeader) error {
	// Validate soal text
	if soal.Soal == "" {
		return fmt.Errorf("soal %d tidak boleh kosong", index+1)
	}

	// Validate image if present
	fileKey := fmt.Sprintf("gambar_%d", index)
	if fileHeaders, exists := files[fileKey]; exists && len(fileHeaders) > 0 {
		file := fileHeaders[0]
		
		// Validate file size
		if file.Size > MaxFileSize {
			return fmt.Errorf("ukuran file untuk soal %d terlalu besar. Maksimal 5MB", index+1)
		}
		
		// Open file to check type
		f, err := file.Open()
		if err != nil {
			return fmt.Errorf("gagal membuka file untuk soal %d: %v", index+1, err)
		}
		defer f.Close()
		
		// Get file extension
		ext := filepath.Ext(file.Filename)
		fileType := ""
		
		switch ext {
		case ".jpg", ".jpeg":
			fileType = "image/jpeg"
		case ".png":
			fileType = "image/png"
		case ".webp":
			fileType = "image/webp"
		}
		
		if !AcceptedImageTypes[fileType] {
			return fmt.Errorf("format file untuk soal %d harus jpeg, jpg, png, atau webp", index+1)
		}
	}

	// Validate pilihan
	if len(soal.Pilihan) != MinPilihanLength {
		return fmt.Errorf("soal %d harus memiliki tepat 5 pilihan jawaban", index+1)
	}

	// Check for empty pilihan text
	for j, pilihan := range soal.Pilihan {
		if pilihan.Text == "" {
			return fmt.Errorf("pilihan jawaban %d untuk soal %d tidak boleh kosong", j+1, index+1)
		}
	}

	// Check if at least one answer is marked as correct
	hasCorrectAnswer := false
	for _, pilihan := range soal.Pilihan {
		if pilihan.Benar {
			hasCorrectAnswer = true
			break
		}
	}

	if !hasCorrectAnswer {
		return fmt.Errorf("soal %d harus memiliki minimal satu jawaban benar", index+1)
	}

	return nil
}