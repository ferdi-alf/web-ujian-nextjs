// services/ujian_tracker.go
package services

import (
	"backend/models"
	"backend/repositories"
	"database/sql"
	"log"
	"time"
)

// UjianTracker mengelola status dan hitung mundur ujian
type UjianTracker struct {
	DB       *sql.DB
	Broadcast chan models.ResponseDataUjian
}

// NewUjianTracker membuat instance baru UjianTracker
func NewUjianTracker(db *sql.DB, broadcast chan models.ResponseDataUjian) *UjianTracker {
	return &UjianTracker{
		DB:       db,
		Broadcast: broadcast,
	}
}

// parseTime membantu parsing waktu
func parseTime(timeStr string) (time.Time, error) {
	now := time.Now()
	timeFormat := "15:04"
	t, err := time.Parse(timeFormat, timeStr)
	if err != nil {
		return time.Time{}, err
	}
	
	return time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, now.Location()), nil
}

// UpdateTrackingData memperbarui status dan hitung mundur
func (ut *UjianTracker) UpdateTrackingData() {
	jadwalData, err := repositories.GetJadwalUjian(ut.DB)
	if err != nil {
		log.Printf("Error getting jadwal data: %v", err)
		return
	}
	
	now := time.Now()
	result := models.ResponseDataUjian{
		X:   []models.TingkatData{},
		XI:  []models.TingkatData{},
		XII: []models.TingkatData{},
	}
	
	// Proses data untuk tiap tingkat
	for tingkat, tingkatDataList := range jadwalData {
		for _, tingkatData := range tingkatDataList {
			// Parse tanggal jadwal
			tanggal, err := time.Parse("2006-01-02", tingkatData.Tanggal)
			if err != nil {
				log.Printf("Error parsing tanggal: %v", err)
				continue
			}
			
			// Tandai nextUjianAda dan pelacakUjianHariAktif
			sisaHari := int(tanggal.Sub(now).Hours() / 24)
			if sisaHari < 0 {
				sisaHari = 0
			}
			
			tingkatData.SisaHari = sisaHari
			tingkatData.NextUjianAda = true
			tingkatData.PelacakUjianHariAktif = sisaHari <= 3 && sisaHari > 0
			
			// Jika hari ini, hitung status sesi dan ujian
			if tanggal.Day() == now.Day() && tanggal.Month() == now.Month() && tanggal.Year() == now.Year() {
				for i := range tingkatData.SesiUjian {
					sesi := &tingkatData.SesiUjian[i]
					
					// Cek status sesi
					if sesi.JamMulai != "" {
						sesiMulai, err := parseTime(sesi.JamMulai)
						if err != nil {
							continue
						}
						
						// Hitung sisa waktu sesi dalam menit
						sisaWaktuSesi := int(sesiMulai.Sub(now).Minutes())
						
						// Aktifkan hitung mundur 60 menit sebelum sesi
						if sisaWaktuSesi > 0 && sisaWaktuSesi <= 60 {
							sesi.HitungMundurSesiAktif = true
							sesi.SisaWaktuSesi = sisaWaktuSesi
						} else {
							sesi.HitungMundurSesiAktif = false
							if sisaWaktuSesi > 0 {
								sesi.SisaWaktuSesi = sisaWaktuSesi
							} else {
								sesi.SisaWaktuSesi = 0
							}
						}
						
						// Cek apakah ada sesi berikutnya
						if i < len(tingkatData.SesiUjian)-1 {
							sesi.AdaSesiBerikutnya = true
						} else {
							sesi.AdaSesiBerikutnya = false
						}
						
						// Process ujian dalam sesi
						for j := range sesi.Ujian {
							ujian := &sesi.Ujian[j]
							
							// Parse waktu ujian
							ujianMulai, err := parseTime(ujian.JamMulai)
							if err != nil {
								continue
							}
							
							// Hitung sisa waktu ujian dalam menit
							sisaWaktuUjian := int(ujianMulai.Sub(now).Minutes())
							
							// Update status ujian
							if sisaWaktuUjian <= 0 {
								// Ujian sudah mulai
								ujianSelesai, err := parseTime(ujian.JamSelesai)
								if err == nil && now.After(ujianSelesai) {
									ujian.Status = "selesai"
								} else {
									ujian.Status = "active"
								}
								ujian.HitungMundurAktif = false
								ujian.SisaWaktuMulai = 0
							} else if sisaWaktuUjian <= 30 {
								// 30 menit sebelum ujian
								ujian.Status = "pending"
								ujian.HitungMundurAktif = true
								ujian.SisaWaktuMulai = sisaWaktuUjian
							} else {
								ujian.Status = "pending"
								ujian.HitungMundurAktif = false
								ujian.SisaWaktuMulai = sisaWaktuUjian
							}
							
							// Cek ujian berikutnya
							if j < len(sesi.Ujian)-1 {
								ujian.UjianBerikutnyaAda = true
							} else {
								ujian.UjianBerikutnyaAda = false
							}
						}
					}
				}
			}
			
			// Tambahkan data ke result sesuai tingkat
			switch tingkat {
			case models.TingkatX:
				result.X = append(result.X, tingkatData)
			case models.TingkatXI:
				result.XI = append(result.XI, tingkatData)
			case models.TingkatXII:
				result.XII = append(result.XII, tingkatData)
			}
		}
	}
	
	// Broadcast data terbaru ke clients
	ut.Broadcast <- result
}

// StartTracking memulai proses tracking ujian
func (ut *UjianTracker) StartTracking() {
	// Pertama kali update
	ut.UpdateTrackingData()
	
	// Setup ticker untuk update setiap detik
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-ticker.C:
				ut.UpdateTrackingData()
			}
		}
	}()
}