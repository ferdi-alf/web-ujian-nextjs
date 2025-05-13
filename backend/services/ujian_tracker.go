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
				// Identifikasi sesi aktif atau yang akan aktif berdasarkan waktu sekarang
				var sesiAktifIndex int = -1
				var sesiBerikutnyaIndex int = -1
				
				// Cek status semua sesi terlebih dahulu
				for i := range tingkatData.SesiUjian {
					sesi := &tingkatData.SesiUjian[i]
					
					if sesi.JamMulai != "" && sesi.JamSelesai != "" {
						sesiMulai, errMulai := parseTime(sesi.JamMulai)
						sesiSelesai, errSelesai := parseTime(sesi.JamSelesai)
						
						if errMulai != nil || errSelesai != nil {
							continue
						}
						
						// Jika waktu sekarang berada antara jam mulai dan selesai, ini adalah sesi aktif
						if now.After(sesiMulai) && now.Before(sesiSelesai) {
							sesiAktifIndex = i
						} else if now.Before(sesiMulai) {
							// Jika waktu sekarang sebelum jam mulai, ini adalah sesi berikutnya
							if sesiBerikutnyaIndex == -1 {
								sesiBerikutnyaIndex = i
							} else {
								// Bandingkan dengan sesi berikutnya yang sudah ditemukan sebelumnya
								waktuBerikutnyaSebelumnya, errBerikutnya := parseTime(tingkatData.SesiUjian[sesiBerikutnyaIndex].JamMulai)
								if errBerikutnya == nil && sesiMulai.Before(waktuBerikutnyaSebelumnya) {
									sesiBerikutnyaIndex = i
								}
							}
						}
					}
				}
				
				// Variabel untuk menyimpan apakah kita perlu menampilkan sesi berikutnya
				var tampilkanSesiBerikutnya bool = false
				var sesiBerikutnyaMulai time.Time
				
				// Proses sesi satu per satu
				for i := range tingkatData.SesiUjian {
					sesi := &tingkatData.SesiUjian[i]
					
					// Cek status sesi
					if sesi.JamMulai != "" && sesi.JamSelesai != "" {
						sesiMulai, errMulai := parseTime(sesi.JamMulai)
						_, errSelesai := parseTime(sesi.JamSelesai)
						
						if errMulai != nil || errSelesai != nil {
							continue
						}
						
						// Set flag adaSesiBerikutnya
						if i < len(tingkatData.SesiUjian)-1 {
							sesi.AdaSesiBerikutnya = true
						} else {
							sesi.AdaSesiBerikutnya = false
						}
						
						// Hitung sisa waktu sesi dalam menit
						sisaWaktuSesi := int(sesiMulai.Sub(now).Minutes())
						
						// Check if this is the current active session
						if i == sesiAktifIndex {
							// Sesi ini sedang aktif
							sesi.HitungMundurSesiAktif = false
							sesi.SisaWaktuSesi = 0
							
							// Process ujian dalam sesi aktif
							for j := range sesi.Ujian {
								ujian := &sesi.Ujian[j]
								
								// Parse waktu ujian
								ujianMulai, err := parseTime(ujian.JamMulai)
								ujianSelesai, err2 := parseTime(ujian.JamSelesai)
								
								if err != nil || err2 != nil {
									continue
								}
								
								// Cek status ujian berdasarkan waktu sekarang
								if now.After(ujianSelesai) {
									// Ujian sudah selesai
									ujian.Status = "selesai"
									ujian.HitungMundurAktif = false
									ujian.SisaWaktuMulai = 0
								} else if now.After(ujianMulai) {
									// Ujian sedang aktif
									ujian.Status = "active"
									ujian.HitungMundurAktif = false
									ujian.SisaWaktuMulai = 0
								} else {
									// Ujian belum mulai
									sisaWaktuUjian := int(ujianMulai.Sub(now).Minutes())
									ujian.Status = "pending"
									// Aktifkan hitung mundur jika kurang dari 30 menit
									if sisaWaktuUjian <= 30 {
										ujian.HitungMundurAktif = true
									} else {
										ujian.HitungMundurAktif = false
									}
									ujian.SisaWaktuMulai = sisaWaktuUjian
								}
								
								// Cek ujian berikutnya
								if j < len(sesi.Ujian)-1 {
									ujian.UjianBerikutnyaAda = true
								} else {
									ujian.UjianBerikutnyaAda = false
								}
							}
						} else if i == sesiBerikutnyaIndex {
							// Cek apakah sesi ini akan dimulai dalam waktu 30 menit
							if sisaWaktuSesi <= 30 {
								tampilkanSesiBerikutnya = true
								sesiBerikutnyaMulai = sesiMulai
								
								// Aktifkan hitung mundur 30 menit sebelum sesi
								sesi.HitungMundurSesiAktif = true
								sesi.SisaWaktuSesi = sisaWaktuSesi
								
								// Process ujian dalam sesi yang akan datang
								for j := range sesi.Ujian {
									ujian := &sesi.Ujian[j]
									
									// Parse waktu ujian
									ujianMulai, err := parseTime(ujian.JamMulai)
									if err != nil {
										continue
									}
									
									// Semua ujian dalam status pending
									ujian.Status = "pending"
									
									// Hitung sisa waktu ujian dalam menit
									sisaWaktuUjian := int(ujianMulai.Sub(now).Minutes())
									ujian.SisaWaktuMulai = sisaWaktuUjian
									
									// Aktifkan hitung mundur jika kurang dari 30 menit
									if sisaWaktuUjian <= 30 {
										ujian.HitungMundurAktif = true
									} else {
										ujian.HitungMundurAktif = false
									}
									
									// Cek ujian berikutnya
									if j < len(sesi.Ujian)-1 {
										ujian.UjianBerikutnyaAda = true
									} else {
										ujian.UjianBerikutnyaAda = false
									}
								}
							} else {
								// Sesi berikutnya masih lama
								sesi.HitungMundurSesiAktif = false
								sesi.SisaWaktuSesi = sisaWaktuSesi
							}
						} else {
							// Sesi ini tidak aktif dan bukan berikutnya
							sesi.HitungMundurSesiAktif = false
							
							if sisaWaktuSesi > 0 {
								sesi.SisaWaktuSesi = sisaWaktuSesi
							} else {
								sesi.SisaWaktuSesi = 0
							}
						}
					}
				}
				
				// Kasus khusus: jika sesi terakhir sudah selesai (tidak ada sesi aktif atau berikutnya)
				if sesiAktifIndex == -1 && sesiBerikutnyaIndex == -1 {
					// Cari sesi terakhir yang sudah selesai
					var lastFinishedSessionIndex int = -1
					
					for i := len(tingkatData.SesiUjian) - 1; i >= 0; i-- {
						sesi := tingkatData.SesiUjian[i]
						sesiSelesai, err := parseTime(sesi.JamSelesai)
						if err == nil && now.After(sesiSelesai) {
							lastFinishedSessionIndex = i
							break
						}
					}
					
					if lastFinishedSessionIndex != -1 {
						sesi := &tingkatData.SesiUjian[lastFinishedSessionIndex]
						sesiSelesai, _ := parseTime(sesi.JamSelesai)
						
						// Pertahankan data selama 2 jam setelah sesi terakhir berakhir
						menitkeSesiSelesai := int(now.Sub(sesiSelesai).Minutes())
						
						// Jika belum 2 jam (120 menit), tampilkan data sesi terakhir
						if menitkeSesiSelesai <= 120 {
							// Tambahkan field baru untuk menunjukkan sisa waktu reset
							sesi.SisaWaktuResetUjian = 120 - menitkeSesiSelesai
							
							// Semua ujian dalam sesi ini ditandai selesai
							for j := range sesi.Ujian {
								sesi.Ujian[j].Status = "selesai"
								sesi.Ujian[j].HitungMundurAktif = false
								sesi.Ujian[j].SisaWaktuMulai = 0
							}
							
							// Jika lebih dari 2 jam, tingkatData akan dikosongkan secara otomatis
							// karena tidak ada yang ditambahkan ke result
						}
					}
				}
				
				// Tentukan sesi mana yang harus ditampilkan
				var sesiUntukDitampilkan []models.SesiData
				
				// Jika sesi berikutnya akan dimulai dalam 15 menit dan kita sudah melewati sesi aktif
				if tampilkanSesiBerikutnya && sesiAktifIndex != -1 {
					sisaWaktuSesiBerikutnya := int(sesiBerikutnyaMulai.Sub(now).Minutes())
					
					// Jika sesi aktif sudah hampir selesai (15 menit sebelum sesi berikutnya)
					if sisaWaktuSesiBerikutnya <= 15 {
						// Tampilkan sesi berikutnya saja
						sesiUntukDitampilkan = append(sesiUntukDitampilkan, tingkatData.SesiUjian[sesiBerikutnyaIndex])
					} else {
						// Tampilkan sesi aktif
						sesiUntukDitampilkan = append(sesiUntukDitampilkan, tingkatData.SesiUjian[sesiAktifIndex])
					}
				} else if sesiAktifIndex != -1 {
					// Tampilkan sesi aktif
					sesiUntukDitampilkan = append(sesiUntukDitampilkan, tingkatData.SesiUjian[sesiAktifIndex])
				} else if tampilkanSesiBerikutnya {
					// Tampilkan sesi berikutnya
					sesiUntukDitampilkan = append(sesiUntukDitampilkan, tingkatData.SesiUjian[sesiBerikutnyaIndex])
				} else if sesiAktifIndex == -1 && sesiBerikutnyaIndex == -1 {
					// Cari sesi terakhir yang sudah selesai (untuk kasus 2 jam setelah sesi terakhir)
					for i := len(tingkatData.SesiUjian) - 1; i >= 0; i-- {
						sesi := tingkatData.SesiUjian[i]
						sesiSelesai, err := parseTime(sesi.JamSelesai)
						if err == nil && now.After(sesiSelesai) {
							// Cek apakah masih dalam 2 jam setelah sesi berakhir
							menitkeSesiSelesai := int(now.Sub(sesiSelesai).Minutes())
							if menitkeSesiSelesai <= 120 {
								sesiUntukDitampilkan = append(sesiUntukDitampilkan, sesi)
							}
							break
						}
					}
				}
				
				// Update tingkatData dengan sesi yang akan ditampilkan
				tingkatData.SesiUjian = sesiUntukDitampilkan
			}
			
			// Tambahkan data ke result sesuai tingkat
			switch tingkat {
			case models.TingkatX:
				if len(tingkatData.SesiUjian) > 0 {
					result.X = append(result.X, tingkatData)
				}
			case models.TingkatXI:
				if len(tingkatData.SesiUjian) > 0 {
					result.XI = append(result.XI, tingkatData)
				}
			case models.TingkatXII:
				if len(tingkatData.SesiUjian) > 0 {
					result.XII = append(result.XII, tingkatData)
				}
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