package handlers

import (
	"backend/models"
	"database/sql"
	"encoding/json"
	"fmt"

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
    tingkat := c.FormValue("tingkat")
    pelajaran := c.FormValue("pelajaran")
    soalDataStr := c.FormValue("soalData")

    fmt.Printf("Received data:\nTingkat: %s\nPelajaran: %s\nSoalData: %s\n", tingkat, pelajaran, soalDataStr)

    var soalDataArr []models.SoalInput
    if err := json.Unmarshal([]byte(soalDataStr), &soalDataArr); err != nil {
        return c.Status(400).JSON(fiber.Map{
            "success": false,
            "message": "Format data soal tidak valid: " + err.Error(),
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

    // **1️⃣ Cek apakah tingkat & pelajaran sudah ada**
    var mataPelajaranID string
    err = tx.QueryRow(`
        SELECT id FROM mata_pelajaran WHERE tingkat = $1 AND pelajaran = $2
    `, tingkat, pelajaran).Scan(&mataPelajaranID)

    if err == sql.ErrNoRows {
        // **2️⃣ Jika belum ada, buat mata pelajaran baru**
        mataPelajaranID = uuid.New().String()
        _, err = tx.Exec(`
            INSERT INTO mata_pelajaran (id, tingkat, pelajaran)
            VALUES ($1, $2, $3)
        `, mataPelajaranID, tingkat, pelajaran)

        if err != nil {
            return c.Status(500).JSON(fiber.Map{
                "success": false,
                "message": "Gagal menyimpan mata pelajaran: " + err.Error(),
            })
        }
    } else if err != nil {
        return c.Status(500).JSON(fiber.Map{
            "success": false,
            "message": "Gagal mengecek mata pelajaran: " + err.Error(),
        })
    }

    fmt.Printf("Menggunakan mataPelajaranID: %s\n", mataPelajaranID) // Debugging

    // **3️⃣ Insert soal dan jawaban**
    for _, soalInput := range soalDataArr {
        soalID := uuid.New().String()
        _, err = tx.Exec(`
            INSERT INTO soal (id, gambar, soal, "mataPelajaranId")
            VALUES ($1, $2, $3, $4)
        `, soalID, soalInput.Gambar, soalInput.Soal, mataPelajaranID)

        if err != nil {
            return c.Status(500).JSON(fiber.Map{
                "success": false,
                "message": "Gagal menyimpan soal: " + err.Error(),
            })
        }

        for _, pilihan := range soalInput.Pilihan {
            _, err = tx.Exec(`
                INSERT INTO jawaban (id, "soalId", jawaban, benar)
                VALUES ($1, $2, $3, $4)
            `, uuid.New().String(), soalID, pilihan.Text, pilihan.Benar)

            if err != nil {
                return c.Status(500).JSON(fiber.Map{
                    "success": false,
                    "message": "Gagal menyimpan jawaban: " + err.Error(),
                })
            }
        }
    }

    if err := tx.Commit(); err != nil {
        return c.Status(500).JSON(fiber.Map{
            "success": false,
            "message": "Gagal menyimpan data: " + err.Error(),
        })
    }

    return c.JSON(fiber.Map{
        "success": true,
        "message": "Data berhasil disimpan",
    })
}
