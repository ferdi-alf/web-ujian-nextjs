package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"backend/models"
	"backend/repositories"
	"backend/services"

	"github.com/gofiber/fiber/v2"
)

type UjianSusulanRequest struct {
    UjianIds []UjianSusulanItem `json:"ujianIds"`
}

type UjianSusulanItem struct {
    UjianId string `json:"ujianId"`
    Tingkat string `json:"tingkat"`
    SesiId  string `json:"sesiId"`
}

type UjianSusulanResponse struct {
    Success bool                   `json:"success"`
    Message string                 `json:"message"`
    Data    map[string]interface{} `json:"data,omitempty"`
}

func GetUjianTerlewat(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ujianTerlewat, err := repositories.GetUjianTerlewat(db)
		if err != nil {
			log.Printf("Error getting ujian terlewat: %v", err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "Gagal mengambil data ujian terlewat",
			})
		}

		return c.JSON(ujianTerlewat)
	}
}

func AddUjianSusulan(db *sql.DB, ujianTracker *services.UjianTracker) fiber.Handler {
    return func(c *fiber.Ctx) error {
        var request UjianSusulanRequest
        if err := c.BodyParser(&request); err != nil {
            return c.Status(http.StatusBadRequest).JSON(fiber.Map{
                "success": false,
                "message": "Invalid request body",
            })
        }
        
        if len(request.UjianIds) == 0 {
            return c.Status(http.StatusBadRequest).JSON(fiber.Map{
                "success": false,
                "message": "No ujian IDs provided",
            })
        }
        
        var processedUjian []string
        var errors []string
        
        tx, err := db.Begin()
        if err != nil {
            return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
                "success": false,
                "message": "Failed to start transaction",
            })
        }
        defer tx.Rollback()
        
        for _, item := range request.UjianIds {
            err := processUjianSusulanInTx(tx, ujianTracker, item)
            if err != nil {
                errors = append(errors, fmt.Sprintf("Error memproses ujian ID %s: %v", item.UjianId, err))
            } else {
                processedUjian = append(processedUjian, item.UjianId)
            }
        }
        
        if len(processedUjian) > 0 {
            if err := tx.Commit(); err != nil {
                return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
                    "success": false,
                    "message": "Failed to commit transaction",
                })
            }
            
            ujianTracker.UpdateTrackingData()
        }
        
        response := UjianSusulanResponse{
            Success: len(processedUjian) > 0,
            Message: fmt.Sprintf("Berhasil memproses %d ujian, %d gagal", len(processedUjian), len(errors)),
        }
        
        if len(errors) > 0 {
            response.Data = map[string]interface{}{
                "processedUjian": processedUjian,
                "errors":         errors,
            }
        } else if len(processedUjian) > 0 {
            response.Data = map[string]interface{}{
                "processedUjian": processedUjian,
            }
        }
        
        status := http.StatusOK
        if len(processedUjian) == 0 {
            status = http.StatusInternalServerError
        }
        
        return c.Status(status).JSON(response)
    }
}

func processUjianSusulanInTx(tx *sql.Tx, ujianTracker *services.UjianTracker, item UjianSusulanItem) error {
    tingkat := models.Tingkat(item.Tingkat)
    err := updateUjianStatusInTx(tx, item.UjianId)
    if err != nil {
        return fmt.Errorf("gagal memperbarui status ujian: %w", err)
    }
    ujianDetail, err := getUjianDetailInTx(tx, item.UjianId)
    if err != nil {
        return fmt.Errorf("gagal mendapatkan detail ujian: %w", err)
    }
    sesiId := item.SesiId
    if sesiId == "" {
        sesiId = ""
        log.Printf("DEBUG: Using empty sesi ID for grouping")
    }
    err = ujianTracker.AddUjianSusulan(tingkat, ujianDetail, sesiId)
    if err != nil {
        return fmt.Errorf("gagal menambahkan ujian susulan: %w", err)
    }
    return nil
}

func updateUjianStatusInTx(tx *sql.Tx, ujianId string) error {
    query := "UPDATE ujian SET status = 'active' WHERE id = $1"
    result, err := tx.Exec(query, ujianId)
    if err != nil {
        return fmt.Errorf("gagal memperbarui status ujian: %w", err)
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("DEBUG: Updated %d rows for ujian ID: %s in transaction", rowsAffected, ujianId)
    
    if rowsAffected == 0 {
        return fmt.Errorf("no rows affected - ujian ID might not exist: %s", ujianId)
    }
    
    return nil
}

func getUjianDetailInTx(tx *sql.Tx, ujianId string) (*models.UjianData, error) {
    log.Printf("DEBUG: Getting ujian detail for ID: %s in transaction", ujianId)
    
    query := `
        SELECT u.id, u."jamMulai", u."jamSelesai", u.status, u.token, u."waktuPengerjaan",
               mp.pelajaran
        FROM ujian u
        JOIN mata_pelajaran mp ON u."mataPelajaranId" = mp.id
        WHERE u.id = $1
    `
    var ujianData models.UjianData
    var ujianJamMulai, ujianJamSelesai, token sql.NullString
    var waktuPengerjaan sql.NullInt64
    err := tx.QueryRow(query, ujianId).Scan(
        &ujianData.ID,
        &ujianJamMulai,
        &ujianJamSelesai,
        &ujianData.Status,
        &token,
        &waktuPengerjaan,
        &ujianData.MataPelajaran,
    )
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("ujian not found with ID: %s", ujianId)
        }
        return nil, fmt.Errorf("gagal mendapatkan detail ujian: %w", err)
    }
    if ujianJamMulai.Valid {
        ujianData.JamMulai = ujianJamMulai.String
    }
    if ujianJamSelesai.Valid {
        ujianData.JamSelesai = ujianJamSelesai.String
    }
    if token.Valid {
        ujianData.Token = token.String
    }
    if waktuPengerjaan.Valid {
        ujianData.WaktuPengerjaan = int(waktuPengerjaan.Int64)
    } else {
        ujianData.WaktuPengerjaan = 90
    }
    ujianData.UjianBerikutnyaAda = false
    ujianData.HitungMundurAktif = false
    ujianData.SisaWaktuMulai = 0
    ujianData.IsUjianSusulan = true
    return &ujianData, nil
}


