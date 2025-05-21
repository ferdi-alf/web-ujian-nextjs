// services/ujian_tracker.go
package services

import (
	"backend/models"
	"backend/repositories"
	"database/sql"
	"fmt"
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
			var sesiTerakhirSelesaiIndex int = -1
			var sesiBaruSelesaiIndex int = -1 // Tambahan: untuk sesi yang baru saja selesai
			var sesiSebelumBerikutnya int = -1 // Tambahan: untuk sesi sebelum sesi berikutnya
			
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
					} else if now.After(sesiSelesai) {
						// Cari sesi terakhir yang sudah selesai
						if sesiTerakhirSelesaiIndex == -1 || i > sesiTerakhirSelesaiIndex {
							sesiTerakhirSelesaiIndex = i
						}
						
						// Cek apakah sesi ini baru saja selesai (dalam 60 menit terakhir)
						menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
						if menitSetelahSelesai <= 60 {
							sesiBaruSelesaiIndex = i
						}
						
						
						// Identifikasi sesi sebelum sesi berikutnya (untuk transisi)
						if sesiBerikutnyaIndex != -1 && i < sesiBerikutnyaIndex {
							if sesiSebelumBerikutnya == -1 || i > sesiSebelumBerikutnya {
								sesiSebelumBerikutnya = i
							}
						}
					}
				}
			}
			if sesiBaruSelesaiIndex != -1 {
				fmt.Println("Sesi baru saja selesai:", tingkatData.SesiUjian[sesiBaruSelesaiIndex])
			}
			
			
			// Proses sesi satu per satu
			for i := range tingkatData.SesiUjian {
				sesi := &tingkatData.SesiUjian[i]
				
				// Inisialisasi nilai default
				sesi.IsNextSesi = 0
				sesi.TampilkanUjian = false
				
				// Cek status sesi
				if sesi.JamMulai != "" && sesi.JamSelesai != "" {
					sesiMulai, errMulai := parseTime(sesi.JamMulai)
					_, errSelesai := parseTime(sesi.JamSelesai)
					
					if errMulai != nil || errSelesai != nil {
						continue
					}
					
					// Set flag adaSesiBerikutnya dan nomor sesi berikutnya
					if i < len(tingkatData.SesiUjian)-1 {
						sesi.AdaSesiBerikutnya = true
						// Set IsNextSesi dengan nomor sesi berikutnya (bukan boolean)
						sesi.IsNextSesi = tingkatData.SesiUjian[i+1].IsSesi
					} else {
						sesi.AdaSesiBerikutnya = false
						sesi.IsNextSesi = 0 // tidak ada sesi berikutnya
					}
					
					// Hitung sisa waktu sesi dalam menit
					sisaWaktuSesi := int(sesiMulai.Sub(now).Minutes())
					
					// Check if this is the current active session
					if i == sesiAktifIndex {
						// Sesi ini sedang aktif
						sesi.HitungMundurSesiAktif = false
						sesi.SisaWaktuSesi = 0
						sesi.TampilkanUjian = true // Tampilkan ujian saat sesi aktif
						
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
						
						// Cek apakah ada sesi berikutnya dan tambahkan info tentang sesi berikutnya
						if sesiBerikutnyaIndex != -1 && sesi.AdaSesiBerikutnya {
							sesiBerikutnyaMulai, _ := parseTime(tingkatData.SesiUjian[sesiBerikutnyaIndex].JamMulai)
							sisaWaktuKeSesiBerikutnya := int(sesiBerikutnyaMulai.Sub(now).Minutes())
							
							// Jika sesi berikutnya kurang dari 15 menit lagi, siapkan informasi sesi berikutnya
							if sisaWaktuKeSesiBerikutnya <= 15 {
								// Persiapkan reset ujian untuk sesi aktif
								sesi.SisaWaktuResetUjian = sisaWaktuKeSesiBerikutnya
							}
						}
					} else if i == sesiBerikutnyaIndex {
						// Sesi berikutnya yang akan aktif
						sesiBerikutnyaMulai, _ := parseTime(sesi.JamMulai)
						sisaWaktuKeSesiBerikutnya := int(sesiBerikutnyaMulai.Sub(now).Minutes())
						
						// Tandai sebagai sesi berikutnya
						sesi.IsNextSesi = sesi.IsSesi
						
						// PERUBAHAN PENTING: Cek apakah sesi ini akan dimulai dalam waktu 30 menit
						if sisaWaktuKeSesiBerikutnya <= 30 {
							// Aktifkan hitung mundur 30 menit sebelum sesi
							sesi.HitungMundurSesiAktif = true
							sesi.SisaWaktuSesi = sisaWaktuKeSesiBerikutnya
							
							// PERUBAHAN: Tampilkan ujian jika kurang dari 5 menit sebelum sesi mulai
							if sisaWaktuKeSesiBerikutnya <= 5 {
								sesi.TampilkanUjian = true
								
								// Process ujian dalam sesi berikutnya yang akan dimulai dalam 5 menit
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
								// Jika lebih dari 5 menit sebelum sesi mulai, jangan tampilkan data ujian
								sesi.TampilkanUjian = false
							}
						} else {
							// Sesi berikutnya masih lama
							sesi.HitungMundurSesiAktif = false
							sesi.SisaWaktuSesi = sisaWaktuSesi
							sesi.TampilkanUjian = false
						}
					} else if sesiTerakhirSelesaiIndex != -1 && i == sesiTerakhirSelesaiIndex && sesiBerikutnyaIndex != -1 {
						// PERUBAHAN PENTING: Sesi terakhir yang sudah selesai dan ada sesi berikutnya
						sesiBerikutnyaMulai, _ := parseTime(tingkatData.SesiUjian[sesiBerikutnyaIndex].JamMulai)
						sisaWaktuKeSesiBerikutnya := int(sesiBerikutnyaMulai.Sub(now).Minutes())
						
						// PERUBAHAN: Tetap tampilkan data sesi terakhir sampai 5 menit sebelum sesi berikutnya
						if sisaWaktuKeSesiBerikutnya > 5 {
							sesi.TampilkanUjian = true
							
							// Jika sesi berikutnya akan dimulai dalam 30 menit, mulai hitung mundur
							if sisaWaktuKeSesiBerikutnya <= 30 {
								sesi.HitungMundurSesiAktif = true
								sesi.SisaWaktuSesi = sisaWaktuKeSesiBerikutnya
								sesi.IsNextSesi = tingkatData.SesiUjian[sesiBerikutnyaIndex].IsSesi
							} else {
								sesi.HitungMundurSesiAktif = false
								sesi.SisaWaktuSesi = 0
							}
							
							// Set waktu reset 5 menit sebelum sesi berikutnya
							sesi.SisaWaktuResetUjian = sisaWaktuKeSesiBerikutnya - 5
							
							// Process ujian - semua dalam status selesai
							for j := range sesi.Ujian {
								ujian := &sesi.Ujian[j]
								ujian.Status = "selesai"
								ujian.HitungMundurAktif = false
								ujian.SisaWaktuMulai = 0
							}
						} else {
							// Sudah kurang dari 5 menit ke sesi berikutnya, transisi ke sesi berikutnya
							// Tetapi masih tampilkan data sesi terakhir dengan tambahan flag untuk sesi berikutnya
							sesi.TampilkanUjian = false
							sesi.HitungMundurSesiAktif = true
							sesi.SisaWaktuSesi = sisaWaktuKeSesiBerikutnya
							sesi.IsNextSesi = tingkatData.SesiUjian[sesiBerikutnyaIndex].IsSesi
						}
					} else if sesiTerakhirSelesaiIndex != -1 && i == sesiTerakhirSelesaiIndex {
						// Sesi terakhir yang sudah selesai dan tidak ada sesi berikutnya
						sesiSelesai, _ := parseTime(sesi.JamSelesai)
						menitSetelahSesiSelesai := int(now.Sub(sesiSelesai).Minutes())
						
						// Tampilkan selama 2 jam setelah selesai
						if menitSetelahSesiSelesai <= 120 {
							sesi.TampilkanUjian = true
							sesi.SisaWaktuResetUjian = 120 - menitSetelahSesiSelesai
							sesi.HitungMundurSesiAktif = false
							sesi.SisaWaktuSesi = 0
							
							// Process ujian - semua dalam status selesai
							for j := range sesi.Ujian {
								ujian := &sesi.Ujian[j]
								ujian.Status = "selesai"
								ujian.HitungMundurAktif = false
								ujian.SisaWaktuMulai = 0
							}
						} else {
							sesi.TampilkanUjian = false
						}
					} else {
						// Sesi lain yang tidak aktif, tidak berikutnya, dan tidak terakhir
						sesi.HitungMundurSesiAktif = false
						sesi.TampilkanUjian = false
						
						if sisaWaktuSesi > 0 {
							sesi.SisaWaktuSesi = sisaWaktuSesi
						} else {
							sesi.SisaWaktuSesi = 0
						}
					}
				}
			}
			
			// Tentukan sesi mana yang harus ditampilkan
			var sesiUntukDitampilkan []models.SesiData
			
			// Jika ada sesi aktif, selalu tampilkan
			if sesiAktifIndex != -1 {
				sesiAktif := tingkatData.SesiUjian[sesiAktifIndex]
				sesiUntukDitampilkan = append(sesiUntukDitampilkan, sesiAktif)
			} else if sesiBerikutnyaIndex != -1 {
				// Tidak ada sesi aktif, tapi ada sesi berikutnya
				sesiBerikutnya := tingkatData.SesiUjian[sesiBerikutnyaIndex]
				sesiBerikutnyaMulai, _ := parseTime(sesiBerikutnya.JamMulai)
				sisaWaktuKeSesiBerikutnya := int(sesiBerikutnyaMulai.Sub(now).Minutes())
				
				// PERUBAHAN PENTING: Jika masih ada lebih dari 5 menit ke sesi berikutnya
				// dan ada sesi terakhir, tampilkan sesi terakhir dengan flag untuk sesi berikutnya
				if sisaWaktuKeSesiBerikutnya > 5 && sesiTerakhirSelesaiIndex != -1 {
					sesiTerakhir := tingkatData.SesiUjian[sesiTerakhirSelesaiIndex]
					
					// Tambahkan info sesi berikutnya ke sesi terakhir
					if sisaWaktuKeSesiBerikutnya <= 30 {
						sesiTerakhir.HitungMundurSesiAktif = true
						sesiTerakhir.SisaWaktuSesi = sisaWaktuKeSesiBerikutnya
						sesiTerakhir.IsNextSesi = sesiBerikutnya.IsSesi
					}
					
					sesiTerakhir.TampilkanUjian = true
					sesiUntukDitampilkan = append(sesiUntukDitampilkan, sesiTerakhir)
				} else {
					// Kurang dari 5 menit ke sesi berikutnya atau tidak ada sesi terakhir
					
					// Jika kurang dari 5 menit, tampilkan ujian sesi berikutnya
					if sisaWaktuKeSesiBerikutnya <= 5 {
						sesiBerikutnya.TampilkanUjian = true
					}
					
					// Tambahkan hitung mundur 30 menit sebelum sesi
					if sisaWaktuKeSesiBerikutnya <= 30 {
						sesiBerikutnya.HitungMundurSesiAktif = true
						sesiBerikutnya.SisaWaktuSesi = sisaWaktuKeSesiBerikutnya
					}
					
					sesiUntukDitampilkan = append(sesiUntukDitampilkan, sesiBerikutnya)
				}
			} else if sesiTerakhirSelesaiIndex != -1 {
				// Tidak ada sesi aktif atau berikutnya, cek sesi terakhir yang sudah selesai
				sesiTerakhir := tingkatData.SesiUjian[sesiTerakhirSelesaiIndex]
				sesiSelesai, _ := parseTime(sesiTerakhir.JamSelesai)
				menitSetelahSesiSelesai := int(now.Sub(sesiSelesai).Minutes())
				
				// Tampilkan selama 2 jam setelah selesai
				if menitSetelahSesiSelesai <= 120 {
					sesiTerakhir.TampilkanUjian = true
					sesiTerakhir.SisaWaktuResetUjian = 120 - menitSetelahSesiSelesai
					sesiUntukDitampilkan = append(sesiUntukDitampilkan, sesiTerakhir)
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