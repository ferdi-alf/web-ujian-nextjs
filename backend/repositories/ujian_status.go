package repositories

import (
	"database/sql"
	"fmt"
)


func UpdateUjianStatus(db *sql.DB, ujianID string, status string, token string) error {
	query := `UPDATE ujian SET status = $1, token = $2 WHERE id = $3`
	_, err := db.Exec(query, status, token, ujianID)
	if err != nil {
		return fmt.Errorf("error updating ujian status: %w", err)
	}
	return nil
}