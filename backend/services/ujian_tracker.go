// services/ujian_tracker.go
package services

import (
	"backend/models"
	"backend/repositories"
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"math"
	"sort"
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

func generateRandomToken(length int) (string, error) {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	b := make([]byte, length)

	_, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("error generating random token: %w", err)
	}

	for i := range b {
		b[i] = charset[b[i]%byte(len(charset))]
	}

	return string(b), nil
}

func updateUjianStatus(db *sql.DB, ujian *models.UjianData, newStatus string) error {
	start := time.Now() // ⏱️ Mulai hitung waktu

	var token string
	if newStatus == "active" {
		var err error
		token, err = generateRandomToken(5)
		if err != nil {
			log.Printf("Error generating token: %v", err)
			token = ""
		}
	} else {
		token = ujian.Token
	}

	err := repositories.UpdateUjianStatus(db, ujian.ID, newStatus, token)
	if err != nil {
		return fmt.Errorf("error updating ujian status: %w", err)
	}

	ujian.Status = newStatus
	ujian.Token = token

	duration := time.Since(start) // ⏱️ Hitung durasi
	log.Printf("Ujian %s status updated to %s with token %s (took %s)", ujian.ID, newStatus, token, duration)

	return nil
}

// parseTime membantu parsing waktu
func parseTime(timeStr string) (time.Time, error) {
	now := time.Now()
	timeFormat := "15:04"
	t, err := time.Parse(timeFormat, timeStr)
	if err != nil {
		return time.Time{}, err
	}
	
	// PERBAIKAN: Pastikan menggunakan zona waktu lokal yang konsisten
	location := time.Local // atau bisa menggunakan time.UTC jika semua waktu dalam UTC
	
	return time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, location), nil
}

func (ut *UjianTracker) UpdateTrackingData() {
	jadwalData, err := repositories.GetJadwalUjian(ut.DB)
	if err != nil {
		log.Printf("Error getting jadwal data: %v", err)
		return
	}
	
	// PERBAIKAN: Pastikan menggunakan zona waktu yang konsisten
	now := time.Now().In(time.Local) // atau time.UTC jika database menyimpan waktu dalam UTC
	result := models.ResponseDataUjian{
		X:   []models.TingkatData{},
		XI:  []models.TingkatData{},
		XII: []models.TingkatData{},
	}
	
	// Tambahkan debug log untuk memastikan waktu konsisten
	fmt.Printf("Current time zone: %s\n", now.Location())
	fmt.Printf("Current time: %s\n", now.Format("2006-01-02 15:04:05 MST"))
	
	// Proses data untuk tiap tingkat
	for tingkat, tingkatDataList := range jadwalData {
		// PERBAIKAN: Urutkan data berdasarkan tanggal untuk logika pelacakan yang benar
		sort.Slice(tingkatDataList, func(i, j int) bool {
			tanggalI, _ := time.Parse("2006-01-02", tingkatDataList[i].Tanggal)
			tanggalJ, _ := time.Parse("2006-01-02", tingkatDataList[j].Tanggal)
			return tanggalI.Before(tanggalJ)
		})
		
		// PERBAIKAN: Variabel untuk melacak status pelacakan ujian
		var ujianPertamaDalam3Hari *models.TingkatData = nil
		var adaUjianSetelahUjianPertama bool = false
		
		// Cari ujian pertama dalam 3 hari ke depan
		for i := range tingkatDataList {
			tingkatData := &tingkatDataList[i]
			
			// Parse tanggal jadwal
			tanggal, err := time.Parse("2006-01-02", tingkatData.Tanggal)
			if err != nil {
				log.Printf("Error parsing tanggal: %v", err)
				continue
			}
			
			// PERBAIKAN: Pastikan tanggal juga menggunakan zona waktu yang sama
			tanggal = tanggal.In(time.Local)
			
			// Hitung sisa hari
			sisaHari := int(math.Ceil(tanggal.Sub(now).Hours() / 24))
			if sisaHari < 0 {
				sisaHari = 0
			}
			
			// Cari ujian pertama dalam 3 hari ke depan
			if ujianPertamaDalam3Hari == nil && sisaHari > 0 && sisaHari <= 3 {
				ujianPertamaDalam3Hari = tingkatData
			}
			
			// Cek apakah ada ujian setelah ujian pertama
			if ujianPertamaDalam3Hari != nil && tingkatData != ujianPertamaDalam3Hari {
				tanggalPertama, _ := time.Parse("2006-01-02", ujianPertamaDalam3Hari.Tanggal)
				if tanggal.After(tanggalPertama) && sisaHari <= 3 {
					adaUjianSetelahUjianPertama = true
				}
			}
		}
		
		for i := range tingkatDataList {
			tingkatData := &tingkatDataList[i]
			
			// Parse tanggal jadwal
			tanggal, err := time.Parse("2006-01-02", tingkatData.Tanggal)
			if err != nil {
				log.Printf("Error parsing tanggal: %v", err)
				continue
			}
			
			// PERBAIKAN: Pastikan tanggal juga menggunakan zona waktu yang sama
			tanggal = tanggal.In(time.Local)
			
			// Hitung sisa hari
			sisaHari := int(math.Ceil(tanggal.Sub(now).Hours() / 24))
			if sisaHari < 0 {
				sisaHari = 0
			}
			
			tingkatData.SisaHari = sisaHari
			
			// PERBAIKAN: Logika nextUjianAda dan pelacakUjianHariAktif
			if sisaHari > 0 && sisaHari <= 3 {
				// Ada ujian dalam 3 hari ke depan
				tingkatData.NextUjianAda = true
				
				// PERBAIKAN: pelacakUjianHariAktif hanya aktif untuk ujian PERTAMA dalam 3 hari
				// dan TIDAK ada ujian lain setelahnya dalam 3 hari
				if tingkatData == ujianPertamaDalam3Hari && !adaUjianSetelahUjianPertama {
					tingkatData.PelacakUjianHariAktif = true
				} else {
					tingkatData.PelacakUjianHariAktif = false
				}
			} else if sisaHari == 0 {
				// Ujian hari ini
				tingkatData.NextUjianAda = true
				tingkatData.PelacakUjianHariAktif = false
			} else {
				// Tidak ada ujian dalam 3 hari ke depan
				tingkatData.NextUjianAda = false
				tingkatData.PelacakUjianHariAktif = false
			}
			
			// PERBAIKAN: Hanya proses sesi jika ujian hari ini
			if tanggal.Day() == now.Day() && tanggal.Month() == now.Month() && tanggal.Year() == now.Year() {
				// PERBAIKAN: Logika yang lebih sederhana untuk menentukan sesi mana yang ditampilkan
				
				// Urutkan sesi berdasarkan jam mulai
				sort.Slice(tingkatData.SesiUjian, func(i, j int) bool {
					jamI, _ := parseTime(tingkatData.SesiUjian[i].JamMulai)
					jamJ, _ := parseTime(tingkatData.SesiUjian[j].JamMulai)
					return jamI.Before(jamJ)
				})
				
				var sesiYangDitampilkan *models.SesiData = nil
				
				// Cari sesi yang sedang berlangsung atau akan berlangsung
				for j := range tingkatData.SesiUjian {
					sesi := &tingkatData.SesiUjian[j]
					
					if sesi.JamMulai != "" && sesi.JamSelesai != "" {
						sesiMulai, errMulai := parseTime(sesi.JamMulai)
						sesiSelesai, errSelesai := parseTime(sesi.JamSelesai)
						
						if errMulai != nil || errSelesai != nil {
							continue
						}
						
						// Reset nilai default
						sesi.IsNextSesi = 0
						sesi.TampilkanUjian = false
						sesi.HitungMundurSesiAktif = false
						sesi.SisaWaktuSesi = 0
						sesi.SisaWaktuResetUjian = 0
						
						// Set flag sesi berikutnya
						if j < len(tingkatData.SesiUjian)-1 {
							sesi.AdaSesiBerikutnya = true
							sesi.IsNextSesi = tingkatData.SesiUjian[j+1].IsSesi
						} else {
							sesi.AdaSesiBerikutnya = false
							sesi.IsNextSesi = 0
						}
						
						// Cek status sesi berdasarkan waktu sekarang
						if now.After(sesiMulai) && now.Before(sesiSelesai) {
							// SESI SEDANG BERLANGSUNG
							sesiYangDitampilkan = sesi
							sesi.TampilkanUjian = true
							
							// Process ujian dalam sesi aktif
							for k := range sesi.Ujian {
								ujian := &sesi.Ujian[k]
								oldStatus := ujian.Status
								
								ujianMulai, err := parseTime(ujian.JamMulai)
								ujianSelesai, err2 := parseTime(ujian.JamSelesai)
								
								if err != nil || err2 != nil {
									continue
								}
								
								var newStatus string
								if now.After(ujianSelesai) {
									newStatus = "selesai"
									ujian.HitungMundurAktif = false
									ujian.SisaWaktuMulai = 0
								} else if now.After(ujianMulai) {
									newStatus = "active"
									ujian.HitungMundurAktif = false
									ujian.SisaWaktuMulai = 0
								} else {
									sisaWaktuUjian := int(math.Ceil(ujianMulai.Sub(now).Minutes()))
									newStatus = "pending"
									if sisaWaktuUjian <= 30 {
										ujian.HitungMundurAktif = true
									} else {
										ujian.HitungMundurAktif = false
									}
									ujian.SisaWaktuMulai = sisaWaktuUjian
								}

								if oldStatus != newStatus {
									err := updateUjianStatus(ut.DB, ujian, newStatus)
									if err != nil {
										log.Printf("Error updating ujian status: %v", err)
									}
								}

								// Cek ujian berikutnya
								if k < len(sesi.Ujian)-1 {
									ujian.UjianBerikutnyaAda = true
								} else {
									ujian.UjianBerikutnyaAda = false
								}
							}
							break // Keluar dari loop karena sudah menemukan sesi aktif
							
						} else if now.Before(sesiMulai) {
							// SESI BELUM DIMULAI - cek apakah kurang dari 5 menit
							sisaWaktuKeSesi := int(math.Ceil(sesiMulai.Sub(now).Minutes()))
							
							if sisaWaktuKeSesi <= 5 && sesiYangDitampilkan == nil {
								// Tampilkan sesi yang akan dimulai dalam 5 menit
								sesiYangDitampilkan = sesi
								sesi.TampilkanUjian = true
								
								// Process ujian dalam sesi berikutnya
								for k := range sesi.Ujian {
									ujian := &sesi.Ujian[k]
									oldStatus := ujian.Status
									
									ujianMulai, err := parseTime(ujian.JamMulai)
									if err != nil {
										continue
									}
									
									newStatus := "pending"
									sisaWaktuUjian := int(math.Ceil(ujianMulai.Sub(now).Minutes()))
									ujian.SisaWaktuMulai = sisaWaktuUjian
									
									if sisaWaktuUjian <= 30 {
										ujian.HitungMundurAktif = true
									} else {
										ujian.HitungMundurAktif = false
									}

									if oldStatus != newStatus {
										err := updateUjianStatus(ut.DB, ujian, newStatus)
										if err != nil {
											log.Printf("Error updating ujian status: %v", err)
										}
									}
									
									if k < len(sesi.Ujian)-1 {
										ujian.UjianBerikutnyaAda = true
									} else {
										ujian.UjianBerikutnyaAda = false
									}
								}
								
								// Aktifkan hitung mundur jika kurang dari 30 menit
								if sisaWaktuKeSesi <= 30 {
									sesi.HitungMundurSesiAktif = true
									sesi.SisaWaktuSesi = sisaWaktuKeSesi
								}
								break // Keluar dari loop
							}
							
						} else if now.After(sesiSelesai) && sesiYangDitampilkan == nil {
							// SESI SUDAH SELESAI - cek apakah perlu ditampilkan
							
							// Cari sesi berikutnya
							var sesiBerikutnya *models.SesiData = nil
							var waktuSesiBerikutnya time.Time
							
							for nextIdx := j + 1; nextIdx < len(tingkatData.SesiUjian); nextIdx++ {
								nextSesi := &tingkatData.SesiUjian[nextIdx]
								if nextSesi.JamMulai != "" {
									waktuNext, err := parseTime(nextSesi.JamMulai)
									if err == nil {
										sesiBerikutnya = nextSesi
										waktuSesiBerikutnya = waktuNext
										break
									}
								}
							}
							
							if sesiBerikutnya != nil {
								// Ada sesi berikutnya
								sisaWaktuKeSesiBerikutnya := int(math.Ceil(waktuSesiBerikutnya.Sub(now).Minutes()))
								
								// Tampilkan sesi terakhir sampai 5 menit sebelum sesi berikutnya
								if sisaWaktuKeSesiBerikutnya > 5 {
									sesiYangDitampilkan = sesi
									sesi.TampilkanUjian = true
									sesi.SisaWaktuResetUjian = sisaWaktuKeSesiBerikutnya - 5
									
									// Set hitung mundur untuk sesi berikutnya
									if sisaWaktuKeSesiBerikutnya <= 30 {
										sesi.HitungMundurSesiAktif = true
										sesi.SisaWaktuSesi = sisaWaktuKeSesiBerikutnya
										sesi.IsNextSesi = sesiBerikutnya.IsSesi
									}
									
									// Set semua ujian sebagai selesai
									for k := range sesi.Ujian {
										ujian := &sesi.Ujian[k]
										oldStatus := ujian.Status
										newStatus := "selesai"
										ujian.HitungMundurAktif = false
										ujian.SisaWaktuMulai = 0
										
										if oldStatus != newStatus {
											err := updateUjianStatus(ut.DB, ujian, newStatus)
											if err != nil {
												log.Printf("Error updating ujian status: %v", err)
											}
										}
									}
								}
							} else {
								// Tidak ada sesi berikutnya (sesi terakhir)
								menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
								
								// Tampilkan selama 2 jam setelah selesai
								if menitSetelahSelesai <= 120 {
									sesiYangDitampilkan = sesi
									sesi.TampilkanUjian = true
									sesi.SisaWaktuResetUjian = 120 - menitSetelahSelesai
									
									// Set semua ujian sebagai selesai
									for k := range sesi.Ujian {
										ujian := &sesi.Ujian[k]
										oldStatus := ujian.Status
										newStatus := "selesai"
										ujian.HitungMundurAktif = false
										ujian.SisaWaktuMulai = 0
										
										if oldStatus != newStatus {
											err := updateUjianStatus(ut.DB, ujian, newStatus)
											if err != nil {
												log.Printf("Error updating ujian status: %v", err)
											}
										}
									}
								}
							}
						}
					}
				}
				
				// PERBAIKAN: Hanya tampilkan satu sesi yang relevan
				var sesiUntukDitampilkan []models.SesiData
				if sesiYangDitampilkan != nil {
					sesiUntukDitampilkan = append(sesiUntukDitampilkan, *sesiYangDitampilkan)
				}
				tingkatData.SesiUjian = sesiUntukDitampilkan
				
			} else {
				// PERBAIKAN: Jika bukan hari ini, kosongkan sesi ujian
				tingkatData.SesiUjian = []models.SesiData{}
			}
			
			// PERBAIKAN: Hanya tambahkan ke result jika ada data yang relevan
			shouldAddToResult := false
			
			// Tambahkan jika ujian hari ini dan ada sesi yang ditampilkan
			if sisaHari == 0 && len(tingkatData.SesiUjian) > 0 {
				shouldAddToResult = true
			}
			
			// Tambahkan jika pelacak ujian aktif (ujian dalam 3 hari ke depan)
			if tingkatData.PelacakUjianHariAktif {
				shouldAddToResult = true
			}
			
			if shouldAddToResult {
				// Tambahkan data ke result sesuai tingkat
				switch tingkat {
				case models.TingkatX:
					result.X = append(result.X, *tingkatData)
				case models.TingkatXI:
					result.XI = append(result.XI, *tingkatData)
				case models.TingkatXII:
					result.XII = append(result.XII, *tingkatData)
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