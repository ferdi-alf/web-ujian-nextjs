package repositories

import (
	"backend/models"
	"database/sql"
	"fmt"
	"log"
)

func GetHasilUjian(db *sql.DB) ([]models.HasilUjianDetail, error) {
	query := `
	SELECT 
		h."id", 
		sd."name" AS siswa_nama, -- Pastikan pakai "name"
		k."tingkat" AS kelas_tingkat, 
		k."jurusan" AS kelas_jurusan, 
		mp."pelajaran", 
		h."nilai", 
		h."benar", 
		h."salah", 
		h."waktuPengerjaan", 
		sd."nis", 
		(SELECT COUNT(*) FROM kecurangan kc WHERE kc."ujianId" = h."ujianId" AND kc."siswaDetailId" = h."siswaDetailId") as totalKecurangan
	FROM hasil h
	JOIN siswa_detail sd ON h."siswaDetailId" = sd."id"
	JOIN kelas k ON sd."kelasId" = k."id"
	JOIN ujian u ON h."ujianId" = u."id"
	JOIN mata_pelajaran mp ON u."mataPelajaranId" = mp."id";
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Println("Error Query Database:", err)
		return nil, err
	}
	defer rows.Close()

	var hasil []models.HasilUjianDetail

	for rows.Next() {
    var h models.HasilUjianDetail
    var tingkatRaw string
    var jurusanRaw string

    if err := rows.Scan(
        &h.ID, &h.SiswaNama, &tingkatRaw, &jurusanRaw,
        &h.MataPelajaran, &h.Nilai, &h.Benar, &h.Salah,
        &h.WaktuPengerjaan, &h.NIS, &h.TotalKecurangan,
    ); err != nil {
        log.Println("Error scanning:", err)
        continue
    }

    // Simpan tingkat dan kelas
    h.Tingkat = tingkatRaw
    h.Kelas = fmt.Sprintf("%s-%s", tingkatRaw, jurusanRaw)

    // Debugging log
    log.Println("Data masuk:", h)

    hasil = append(hasil, h)
}


	return hasil, nil
}
