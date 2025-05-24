package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"backend/repositories"

	"github.com/gofiber/fiber/v2"
)

// GetUjianTerlewat handler untuk mengambil data ujian yang sudah terlewat
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