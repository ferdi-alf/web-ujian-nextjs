package handlers

import (
	"backend/models"
	"backend/utils"
	validators "backend/validations"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type SoalHandler struct {
    DB *sql.DB
}

func NewSoalHandler(db *sql.DB) *SoalHandler {
    return &SoalHandler{DB: db}
}

func (h *SoalHandler) AddSoal(c *fiber.Ctx) error {
    // Log the start of request handling
    fmt.Println("Starting AddSoal handler")

    // Get multipart form
    form, err := c.MultipartForm()
    if err != nil {
        fmt.Printf("Error getting multipart form: %v\n", err)
        return c.Status(400).JSON(fiber.Map{
            "success": false,
            "message": "Error getting form data: " + err.Error(),
        })
    }

    // Log received files
    fmt.Println("Received files:")
    for key, files := range form.File {
        for _, file := range files {
            fmt.Printf("File: %s, Key: %s, Size: %d bytes\n", file.Filename, key, file.Size)
        }
    }

    tingkat := c.FormValue("tingkat")
    pelajaran := c.FormValue("pelajaran")
    soalDataStr := c.FormValue("soalData")

    fmt.Printf("Received data - Tingkat: %s, Pelajaran: %s\n", tingkat, pelajaran)
    fmt.Printf("SoalData string: %s\n", soalDataStr)

    var soalDataArr []models.SoalInput
    if err := json.Unmarshal([]byte(soalDataStr), &soalDataArr); err != nil {
        fmt.Printf("Error unmarshaling soalData: %v\n", err)
        return c.Status(400).JSON(fiber.Map{
            "success": false,
            "message": "Format data soal tidak valid: " + err.Error(),
        })
    }

    fmt.Printf("Successfully parsed %d soal items\n", len(soalDataArr))

     if err := validators.ValidateSoalInput(tingkat, pelajaran, soalDataArr, form.File); err != nil {
        fmt.Printf("Validation error: %v\n", err)
        return c.Status(400).JSON(fiber.Map{
            "success": false,
            "message": err.Error(),
        })
    }

    tx, err := h.DB.Begin()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{
            "success": false,
            "message": "Gagal memulai transaksi: " + err.Error(),
        })
    }
    defer tx.Rollback()

    // Cek mata pelajaran
    var mataPelajaranID string
    err = tx.QueryRow(`
        SELECT id FROM mata_pelajaran WHERE tingkat = $1 AND pelajaran = $2
    `, tingkat, pelajaran).Scan(&mataPelajaranID)

    if err == sql.ErrNoRows {
        mataPelajaranID = uuid.New().String()
        _, err = tx.Exec(`
            INSERT INTO mata_pelajaran (id, tingkat, pelajaran)
            VALUES ($1, $2, $3)
        `, mataPelajaranID, tingkat, pelajaran)

        if err != nil {
            fmt.Printf("Error inserting mata pelajaran: %v\n", err)
            return c.Status(500).JSON(fiber.Map{
                "success": false,
                "message": "Gagal menyimpan mata pelajaran: " + err.Error(),
            })
        }
    }

    // Proses setiap soal
    for i, soalInput := range soalDataArr {
        soalID := uuid.New().String()
        
        // Handle gambar jika ada
        var imagePath *string
        fileKey := fmt.Sprintf("gambar_%d", i)
        
        // Log attempt to get file
        fmt.Printf("Attempting to get file with key: %s\n", fileKey)
        
        file, err := c.FormFile(fileKey)
        if err != nil {
            if err != http.ErrMissingFile {
                fmt.Printf("Error getting file %s: %v\n", fileKey, err)
            } else {
                fmt.Printf("No file found for key: %s\n", fileKey)
            }
        } else {
            fmt.Printf("Found file: %s for key: %s\n", file.Filename, fileKey)
            savedPath, err := utils.SaveImage(file)
            if err != nil {
                fmt.Printf("Error saving image: %v\n", err)
                return c.Status(500).JSON(fiber.Map{
                    "success": false,
                    "message": "Gagal menyimpan gambar: " + err.Error(),
                })
            }
            imagePath = &savedPath
            fmt.Printf("Successfully saved image to: %s\n", savedPath)
        }

        // Insert soal dengan path gambar
        _, err = tx.Exec(`
            INSERT INTO soal (id, gambar, soal, "mataPelajaranId")
            VALUES ($1, $2, $3, $4)
        `, soalID, imagePath, soalInput.Soal, mataPelajaranID)

        if err != nil {
            fmt.Printf("Error inserting soal: %v\n", err)
            return c.Status(500).JSON(fiber.Map{
                "success": false,
                "message": "Gagal menyimpan soal: " + err.Error(),
            })
        }

        // Insert jawaban
        for j, pilihan := range soalInput.Pilihan {
            _, err = tx.Exec(`
                INSERT INTO jawaban (id, "soalId", jawaban, benar)
                VALUES ($1, $2, $3, $4)
            `, uuid.New().String(), soalID, pilihan.Text, pilihan.Benar)

            if err != nil {
                fmt.Printf("Error inserting jawaban %d for soal %d: %v\n", j, i, err)
                return c.Status(500).JSON(fiber.Map{
                    "success": false,
                    "message": "Gagal menyimpan jawaban: " + err.Error(),
                })
            }
        }
    }

    if err := tx.Commit(); err != nil {
        fmt.Printf("Error committing transaction: %v\n", err)
        return c.Status(500).JSON(fiber.Map{
            "success": false,
            "message": "Gagal menyimpan data: " + err.Error(),
        })
    }

    fmt.Println("Successfully completed AddSoal handler")
    return c.JSON(fiber.Map{
        "success": true,
        "message": fmt.Sprintf("Berhasil menambahkan %d soal ke %s tingkat %s", 
            len(soalDataArr), pelajaran, tingkat),
    })
}