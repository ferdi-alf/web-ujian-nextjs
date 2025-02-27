// handlers/api_handler.go
package handlers

import (
	"database/sql"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type APIHandler struct {
	DB *sql.DB
}

func NewAPIHandler(db *sql.DB) *APIHandler {
	return &APIHandler{DB: db}
}

// SetupAPIRoutes registers all the API routes
func SetupAPIRoutes(app *fiber.App, db *sql.DB) {
	apiHandler := NewAPIHandler(db)
	
	// Add API routes
	app.Get("/api/siswa/:id", apiHandler.GetSiswaDetail)
	app.Get("/api/ujian/:id", apiHandler.GetUjianDetail)
}

// GetSiswaDetail returns detailed information about a student
func (h *APIHandler) GetSiswaDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	
	// Validate ID (optional but recommended)
	if _, err := uuid.Parse(id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID format",
		})
	}
	
	// Query to get student details including kelas information
	query := `
		SELECT 
			sd.id, 
			sd.name, 
			sd.nis, 
			sd.kelamin, 
			sd.nomor_ujian, 
			k.id as kelas_id, 
			k.name as kelas_name, 
			k.jurusan
		FROM 
			siswa_detail sd
		JOIN 
			kelas k ON sd.kelasId = k.id
		WHERE 
			sd.id = $1
	`
	
	var siswa struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		NIS        string `json:"nis"`
		Kelamin    string `json:"kelamin"`
		NomorUjian string `json:"nomor_ujian"`
		Kelas      struct {
			ID      string `json:"id"`
			Name    string `json:"name"`
			Jurusan string `json:"jurusan"`
		} `json:"kelas"`
	}
	
	row := h.DB.QueryRow(query, id)
	
	err := row.Scan(
		&siswa.ID,
		&siswa.Name,
		&siswa.NIS,
		&siswa.Kelamin,
		&siswa.NomorUjian,
		&siswa.Kelas.ID,
		&siswa.Kelas.Name,
		&siswa.Kelas.Jurusan,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Student not found",
			})
		}
		
		log.Printf("Database error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve student details",
		})
	}
	
	return c.JSON(siswa)
}

// GetUjianDetail returns detailed information about an exam
func (h *APIHandler) GetUjianDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	
	// Validate ID (optional but recommended)
	if _, err := uuid.Parse(id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID format",
		})
	}
	
	// Query to get exam details including mata pelajaran information
	query := `
		SELECT 
			u.id, 
			u.waktuPengerjaan, 
			u.token, 
			u.status, 
			mp.id as mata_pelajaran_id, 
			mp.pelajaran, 
			mp.tingkat
		FROM 
			ujian u
		JOIN 
			mata_pelajaran mp ON u.mataPelajaranId = mp.id
		WHERE 
			u.id = $1
	`
	
	var ujian struct {
		ID             string `json:"id"`
		WaktuPengerjaan int    `json:"waktuPengerjaan"`
		Token          string `json:"token,omitempty"`
		Status         string `json:"status"`
		MataPelajaran  struct {
			ID        string `json:"id"`
			Pelajaran string `json:"pelajaran"`
			Tingkat   string `json:"tingkat"`
		} `json:"mataPelajaran"`
	}
	
	row := h.DB.QueryRow(query, id)
	
	err := row.Scan(
		&ujian.ID,
		&ujian.WaktuPengerjaan,
		&ujian.Token,
		&ujian.Status,
		&ujian.MataPelajaran.ID,
		&ujian.MataPelajaran.Pelajaran,
		&ujian.MataPelajaran.Tingkat,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Exam not found",
			})
		}
		
		log.Printf("Database error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve exam details",
		})
	}
	
	return c.JSON(ujian)
}