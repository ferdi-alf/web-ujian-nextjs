package handlers

import (
	"backend/models"
	"backend/repositories"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func NewUjianHandler(db *sql.DB) *UjianHandler {
	return &UjianHandler{DB: db}
}

type UjianHandler struct {
	DB *sql.DB
}

func GetUjianTrackingData(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		jadwalData, err := repositories.GetJadwalUjian(db)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"message": "Error fetching data",
				"error":   err.Error(),
			})
		}
		
		result := models.ResponseDataUjian{
			X:   []models.TingkatData{},
			XI:  []models.TingkatData{},
			XII: []models.TingkatData{},
		}
		
		// Populasi result berdasarkan jadwal
		for tingkat, tingkatDataList := range jadwalData {
			switch tingkat {
			case models.TingkatX:
				result.X = tingkatDataList
			case models.TingkatXI:
				result.XI = tingkatDataList
			case models.TingkatXII:
				result.XII = tingkatDataList
			}
		}
		
		return c.JSON(result)
	}
}


// SubmitUjian handles the submission of student exam answers
func (h *UjianHandler) SubmitUjian(c *fiber.Ctx) error {
    // Log the start of request handling
    fmt.Println("Starting SubmitUjian handler")

    // Parse request body
    var request models.SubmitUjianRequest
    if err := c.BodyParser(&request); err != nil {
        log.Printf("Error parsing request body: %v", err)
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "success": false,
            "message": "Invalid request format",
        })
    }

    log.Printf("Received submission data: %+v", request)
    log.Printf("Answers received: %+v", request.Answers)

    // Validate request data
    if request.UjianID == "" || request.SiswaDetailID == "" || len(request.Answers) == 0 {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "success": false,
            "message": "Missing required fields",
        })
    }

    // Start a transaction
    tx, err := h.DB.Begin()
    if err != nil {
        log.Printf("Error starting transaction: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": "Database error",
        })
    }
    defer tx.Rollback() // Will be ignored if transaction is committed

    // 1. Save all student answers first
   // In your SubmitUjian handler function, modify the insert code:
for soalID, jawabanID := range request.Answers {
    // Generate a CUID-compatible ID for the answer
    answerID := fmt.Sprintf("cm%s", uuid.New().String()[:20])
    
    // Get current time for createdAt
    now := time.Now().UTC()
    
    // Debug the values being inserted
    log.Printf("Inserting answer: ID=%s, siswaDetailId=%s, ujianId=%s, soalId=%s, jawabanId=%s, createdAt=%v",
        answerID, request.SiswaDetailID, request.UjianID, soalID, jawabanID, now)
    
    // Insert answer into jawaban_siswa table
   result, err := tx.Exec(
    `INSERT INTO jawaban_siswa 
    ("id", "siswaDetailId", "ujianId", "soalId", "jawabanId", "createdAt") 
    VALUES ($1, $2, $3, $4, $5, $6)`,
    answerID, request.SiswaDetailID, request.UjianID, soalID, jawabanID, now,
)

    
    if err != nil {
        // Get exact MySQL error details
        log.Printf("Full error details for saving answer: %v", err)
        
        // Try to get a more specific error type if using MySQL
        
        
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": fmt.Sprintf("Error saving answers: %v", err),
        })
    }
    
    // Log the number of rows affected
    rowsAffected, _ := result.RowsAffected()
    log.Printf("Rows affected by insert: %d", rowsAffected)
}

    // 2. Calculate the results (correct/incorrect answers)
    var totalCorrect int
    var totalAnswers int = len(request.Answers)

    for soalID, jawabanID := range request.Answers {
        var isCorrect bool
		err := tx.QueryRow(
			`SELECT benar FROM jawaban WHERE "id" = $1 AND "soalId" = $2`, 
			jawabanID, soalID,
		).Scan(&isCorrect)


        
        if err != nil {
            log.Printf("Error checking answer correctness: %v", err)
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "success": false,
                "message": "Error calculating results",
            })
        }
        
        if isCorrect {
            totalCorrect++
        }
    }

    // 3. Count cheating incidents
    var totalCheating int
    err = tx.QueryRow(
    "SELECT COUNT(*) FROM kecurangan WHERE \"ujianId\" = $1 AND \"siswaDetailId\" = $2",
    request.UjianID, request.SiswaDetailID,
).Scan(&totalCheating)

    
    if err != nil {
        log.Printf("Error counting cheating incidents: %v", err)
        // Non-fatal error, continue with 0 cheating count
        totalCheating = 0
    }

    // 4. Calculate score
    totalIncorrect := totalAnswers - totalCorrect
    // Score calculation: (correct answers / total questions) * 100
    nilai := int((float64(totalCorrect) / float64(totalAnswers)) * 100)

    // Convert ints to strings for the Prisma schema
    nilaiStr := fmt.Sprintf("%d", nilai)
    benarStr := fmt.Sprintf("%d", totalCorrect)
    salahStr := fmt.Sprintf("%d", totalIncorrect)
    waktuPengerjaanStr := fmt.Sprintf("%d", request.WaktuPengerjaan)

    // 5. Create hasil record - make sure types match Prisma schema (using strings)
    hasilID := fmt.Sprintf("cm%s", uuid.New().String()[:20]) // Generate CUID-compatible ID
    
    // Debug the values being inserted for hasil
    log.Printf("Inserting hasil: ID=%s, siswaDetailId=%s, ujianId=%s, waktuPengerjaan=%s, nilai=%s, benar=%s, salah=%s",
        hasilID, request.SiswaDetailID, request.UjianID, waktuPengerjaanStr, nilaiStr, benarStr, salahStr)
    
   _, err = tx.Exec(
    `INSERT INTO hasil 
    ("id", "siswaDetailId", "ujianId", "waktuPengerjaan", "nilai", "benar", "salah") 
    VALUES ($1, $2, $3, $4, $5, $6, $7)`, // ✅ Gunakan $1, $2, ...
    hasilID, request.SiswaDetailID, request.UjianID, waktuPengerjaanStr, nilaiStr, benarStr, salahStr,
)

    
    if err != nil {
        log.Printf("Error saving hasil: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": "Error saving results",
        })
    }

    // Commit the transaction
    if err := tx.Commit(); err != nil {
        log.Printf("Error committing transaction: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": "Database error",
        })
    }

    // Send successful response
    return c.Status(fiber.StatusOK).JSON(models.SubmitUjianResponse{
        Success:         true,
        Message:         "Exam submitted successfully",
        HasilID:         hasilID,
        Nilai:           nilai,
        Benar:           totalCorrect,
        Salah:           totalIncorrect,
        TotalKecurangan: totalCheating,
        WaktuPengerjaan: request.WaktuPengerjaan,
    })
}



func (h *UjianHandler) GetHasilDetail(c *fiber.Ctx) error {
	hasilID := c.Params("id")
	log.Println("Menerima request untuk hasilID:", hasilID) // Debugging

	if hasilID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Missing hasil ID",
		})
	}

	// Perbaikan: Gunakan placeholder PostgreSQL ($1, $2)
	var hasil models.HasilDetail
	var createdAtFloat float64
	err := h.DB.QueryRow(
	`SELECT h."id", h."siswaDetailId", h."ujianId", h."waktuPengerjaan", h."nilai", h."benar", h."salah",
	        (SELECT COUNT(*) FROM kecurangan WHERE "ujianId" = h."ujianId" AND "siswaDetailId" = h."siswaDetailId") as totalKecurangan,
	        EXTRACT(EPOCH FROM h."createdAt") as createdAt,
	        mp."pelajaran", mp."tingkat" -- Ambil tingkat juga
	 FROM hasil h
	 JOIN ujian u ON h."ujianId" = u."id"
	 JOIN mata_pelajaran mp ON u."mataPelajaranId" = mp."id"
	 WHERE h."id" = $1`, 
	hasilID,
).Scan(
	&hasil.ID, &hasil.SiswaDetailID, &hasil.UjianID, 
	&hasil.WaktuPengerjaan, &hasil.Nilai, &hasil.Benar, &hasil.Salah,
	&hasil.TotalKecurangan, &createdAtFloat, 
	&hasil.MataPelajaran, &hasil.Tingkat, // Tambahkan tingkat
)


	// Konversi float64 ke int64 jika perlu
	hasil.CreatedAt = int64(createdAtFloat)

	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Hasil not found",
			})
		}
		log.Printf("Database error fetching hasil: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Database error",
		})
	}

	// Ambil mataPelajaranId dari tabel ujian
	var mataPelajaranID string
	err = h.DB.QueryRow(
		`SELECT "mataPelajaranId" FROM ujian WHERE "id" = $1`,
		hasil.UjianID,
	).Scan(&mataPelajaranID)

	if err != nil {
		log.Printf("Error fetching mataPelajaranId for ujianId %s: %v", hasil.UjianID, err)
		mataPelajaranID = "" // Default kosong jika error
	}

	// Ambil nama mata pelajaran dari tabel mata_pelajaran
	var mataPelajaran string
	if mataPelajaranID != "" {
		err = h.DB.QueryRow(
			`SELECT "pelajaran" FROM mata_pelajaran WHERE "id" = $1`,
			mataPelajaranID,
		).Scan(&mataPelajaran)

		if err != nil {
			log.Printf("Error fetching pelajaran for mataPelajaranId %s: %v", mataPelajaranID, err)
			mataPelajaran = "Unknown"
		}
	} else {
		mataPelajaran = "Unknown"
	}

	// Tambahkan nama mata pelajaran ke hasil
	hasil.MataPelajaran = mataPelajaran

	// Ambil detail kecurangan berdasarkan type
	rows, err := h.DB.Query(
	`SELECT "type", COUNT(*) as count 
	 FROM kecurangan 
	 WHERE "ujianId" = $1 AND "siswaDetailId" = $2 
	 GROUP BY "type"`,
	hasil.UjianID, hasil.SiswaDetailID,
)

	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error fetching cheating details: %v", err)
	} else {
		defer rows.Close()
		
		byType := []models.CheatingCount{}
		for rows.Next() {
			var cheatType models.TypeKecurangan
			var count int
			if err := rows.Scan(&cheatType, &count); err != nil {
				continue
			}
			byType = append(byType, models.CheatingCount{Type: cheatType, Count: count})
		}
		
		hasil.Kecurangan = models.CheatingDetail{
			TotalCount: hasil.TotalKecurangan,
			ByType:     byType,
		}
	}

	return c.Status(fiber.StatusOK).JSON(hasil)
}

