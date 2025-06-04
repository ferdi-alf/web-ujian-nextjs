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
	"strings"
	"sync"
	"time"
)

type UjianTracker struct {
    DB                   *sql.DB
    Broadcast            chan models.ResponseDataUjian
    mutex                sync.RWMutex
    UjianSusulan         map[models.Tingkat][]models.UjianSusulanData
}

func NewUjianTracker(db *sql.DB, broadcast chan models.ResponseDataUjian) *UjianTracker {
	return &UjianTracker{
		DB:       db,
		Broadcast: broadcast,
	}
}


func (ut *UjianTracker) UpdateTrackingData() {
    ut.cleanExpiredUjianSusulan()
    jadwalData, err := repositories.GetJadwalUjian(ut.DB)
    if err != nil {
        log.Printf("Error getting jadwal data: %v", err)
        return
    }

    now := time.Now().In(time.Local) 
    today := now.Format("2006-01-02")
    result := models.ResponseDataUjian{
        X:   []models.TingkatData{},
        XI:  []models.TingkatData{},
        XII: []models.TingkatData{},
    }
    
    fmt.Printf("Current time zone: %s\n", now.Location())
    fmt.Printf("Current time: %s\n", now.Format("2006-01-02 15:04:05 MST"))

    allTingkat := []models.Tingkat{models.TingkatX, models.TingkatXI, models.TingkatXII}
    for _, tingkat := range allTingkat {
        tingkatDataList, hasJadwal := jadwalData[tingkat]

        if hasJadwal {
            sort.Slice(tingkatDataList, func(i, j int) bool {
                tanggalI, _ := time.Parse("2006-01-02", tingkatDataList[i].Tanggal)
                tanggalJ, _ := time.Parse("2006-01-02", tingkatDataList[j].Tanggal)
                return tanggalI.Before(tanggalJ)
            })

            var ujianPertamaDalam3Hari *models.TingkatData = nil
            var adaUjianSetelahUjianPertama bool = false
            
            for i := range tingkatDataList {
                tingkatData := &tingkatDataList[i]
                
                tanggal, err := time.Parse("2006-01-02", tingkatData.Tanggal)
                if err != nil {
                    log.Printf("Error parsing tanggal: %v", err)
                    continue
                }
                
                tanggal = tanggal.In(time.Local)
                
                sisaHari := int(math.Ceil(tanggal.Sub(now).Hours() / 24))
                if sisaHari < 0 {
                    sisaHari = 0
                }
                tingkatData.SisaHari = sisaHari
                
                if ujianPertamaDalam3Hari == nil && sisaHari > 0 && sisaHari <= 3 {
                    ujianPertamaDalam3Hari = tingkatData
                }
                
                if ujianPertamaDalam3Hari != nil && tingkatData != ujianPertamaDalam3Hari {
                    tanggalPertama, _ := time.Parse("2006-01-02", ujianPertamaDalam3Hari.Tanggal)
                    if tanggal.After(tanggalPertama) && sisaHari <= 3 {
                        adaUjianSetelahUjianPertama = true
                    }
                }

                if sisaHari > 0 && sisaHari <= 3 {
                    tingkatData.NextUjianAda = true
                    if tingkatData == ujianPertamaDalam3Hari && !adaUjianSetelahUjianPertama {
                        tingkatData.PelacakUjianHariAktif = true
                    } else {
                        tingkatData.PelacakUjianHariAktif = false
                    }
                } else if sisaHari == 0 {
                    tingkatData.NextUjianAda = true
                    tingkatData.PelacakUjianHariAktif = false
                } else {
                    tingkatData.NextUjianAda = false
                    tingkatData.PelacakUjianHariAktif = false
                }
        
                
                if tanggal.Day() == now.Day() && tanggal.Month() == now.Month() && tanggal.Year() == now.Year() {
                    ut.checkAndCleanExpiredSessionsBeforeIntegration(tingkatData, tingkat, now)

                    sort.Slice(tingkatData.SesiUjian, func(i, j int) bool {
                        jamI, _ := parseTime(tingkatData.SesiUjian[i].JamMulai)
                        jamJ, _ := parseTime(tingkatData.SesiUjian[j].JamMulai)
                        return jamI.Before(jamJ)
                    })
                    
                    var sesiYangDitampilkan *models.SesiData = nil
                    
                    for j := range tingkatData.SesiUjian {
                        sesi := &tingkatData.SesiUjian[j]
                        
                        if sesi.JamMulai != "" && sesi.JamSelesai != "" {
                            sesiMulai, errMulai := parseTime(sesi.JamMulai)
                            sesiSelesai, errSelesai := parseTime(sesi.JamSelesai)
                            
                            if errMulai != nil || errSelesai != nil {
                                continue
                            }
                            
                            sesi.IsNextSesi = 0
                            sesi.TampilkanUjian = false
                            sesi.HitungMundurSesiAktif = false
                            sesi.SisaWaktuSesi = 0
                            sesi.SisaWaktuResetUjian = 0
                            
                            if j < len(tingkatData.SesiUjian)-1 {
                                sesi.AdaSesiBerikutnya = true
                                sesi.IsNextSesi = tingkatData.SesiUjian[j+1].IsSesi
                            } else {
                                sesi.AdaSesiBerikutnya = false
                                sesi.IsNextSesi = 0
                            }
                            
                            if now.After(sesiMulai) && now.Before(sesiSelesai) {
                                sesiYangDitampilkan = sesi
                                sesi.TampilkanUjian = true
                                ut.updateUjianStatusInSesi(sesi, now)
                                break
                            } else if now.Before(sesiMulai) {
                                // KONDISI 2: Sesi belum mulai, tapi kurang dari 5 menit
                                sisaWaktuKeSesi := int(math.Ceil(sesiMulai.Sub(now).Minutes()))
                                if sisaWaktuKeSesi <= 5 && sesiYangDitampilkan == nil {
                                    sesiYangDitampilkan = sesi
                                    sesi.TampilkanUjian = true
                                    
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
                                    
                                    if sisaWaktuKeSesi <= 30 {
                                        sesi.HitungMundurSesiAktif = true
                                        sesi.SisaWaktuSesi = sisaWaktuKeSesi
                                    }
                                    break
                                }
                            } else if now.After(sesiSelesai) && sesiYangDitampilkan == nil {
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
                                    sisaWaktuKeSesiBerikutnya := int(math.Ceil(waktuSesiBerikutnya.Sub(now).Minutes()))
                                    if sisaWaktuKeSesiBerikutnya > 5 {
                                        sesiYangDitampilkan = sesi
                                        sesi.TampilkanUjian = true
                                        sesi.SisaWaktuResetUjian = sisaWaktuKeSesiBerikutnya - 5
                                        
                                        if sisaWaktuKeSesiBerikutnya <= 30 {
                                            sesi.HitungMundurSesiAktif = true
                                            sesi.SisaWaktuSesi = sisaWaktuKeSesiBerikutnya
                                            sesi.IsNextSesi = sesiBerikutnya.IsSesi
                                        }
                                        
                                        if ut.shouldDisplaySesi(sesi, sesiMulai, sesiSelesai, now, tingkatData.SesiUjian, j) {
                                            sesiYangDitampilkan = sesi
                                            sesi.TampilkanUjian = true
                                            ut.updateFinishedSesiUjianStatus(sesi, now)
                                        }
                                    }
                                } else {
                                    menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
                                    if menitSetelahSelesai <= 120 {
                                        sesi.SisaWaktuResetUjian = 120 - menitSetelahSelesai
                                        if ut.shouldDisplaySesi(sesi, sesiMulai, sesiSelesai, now, tingkatData.SesiUjian, j) {
                                            sesiYangDitampilkan = sesi
                                            sesi.TampilkanUjian = true
                                            ut.updateFinishedSesiUjianStatus(sesi, now)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Filter sesi yang ditampilkan
                    var sesiUntukDitampilkan []models.SesiData
                    if sesiYangDitampilkan != nil {
                        sesiUntukDitampilkan = append(sesiUntukDitampilkan, *sesiYangDitampilkan)
                    }
                    tingkatData.SesiUjian = sesiUntukDitampilkan
                    
                    // SEKARANG baru tambahkan ujian susulan SETELAH cleaning
                    ut.integratedUjianSusulan(tingkatData, tingkat, today)
                    
                } else {
                    tingkatData.SesiUjian = []models.SesiData{}
                }
                
                shouldAddToResult := false
                
                if sisaHari == 0 && len(tingkatData.SesiUjian) > 0 {
                    shouldAddToResult = true
                }
                
                if tingkatData.PelacakUjianHariAktif {
                    shouldAddToResult = true
                }
        
                if shouldAddToResult {
                    var validSesi []models.SesiData
                    for _, sesi := range tingkatData.SesiUjian {
                        if sesi.TampilkanUjian {
                            validSesi = append(validSesi, sesi)
                        } else {
                            log.Printf("DEBUG: Filtering out expired sesi: %s", sesi.ID)
                        }
                    }
                    
                    tingkatData.SesiUjian = validSesi
                    if len(tingkatData.SesiUjian) > 0 {
                        switch tingkat {
                        case models.TingkatX:
                            result.X = append(result.X, *tingkatData)
                        case models.TingkatXI:
                            result.XI = append(result.XI, *tingkatData)
                        case models.TingkatXII:
                            result.XII = append(result.XII, *tingkatData)
                        }
                    } else {
                        log.Printf("DEBUG: No valid sesi to display for tingkat %s", tingkat)
                    }
                }
            }
        } else {
            ut.mutex.RLock()
            ujianList, exists := ut.UjianSusulan[tingkat]
            ut.mutex.RUnlock()
            if exists && len(ujianList) > 0 {
                var ujianHariIni []models.UjianSusulanData
                for _, ujian := range ujianList {
                    if ujian.WaktuDibuat.Format("2006-01-02") == today {
                        ujianHariIni = append(ujianHariIni, ujian)
                    }
                }
                if len(ujianHariIni) > 0 {
                    tingkatData := models.TingkatData{
                        Tanggal: today,
                        SisaHari: 0,
                        NextUjianAda: true,
                        PelacakUjianHariAktif: false,
                        SesiUjian: []models.SesiData{},
                    }
                    ut.integratedUjianSusulan(&tingkatData, tingkat, today)
                    if len(tingkatData.SesiUjian) > 0 {
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
            }
        }
    }
    ut.Broadcast <- result
}

func (ut *UjianTracker) integratedUjianSusulan(tingkatData *models.TingkatData, tingkat models.Tingkat, today string) {
    ut.mutex.RLock()
    ujianList, exists := ut.UjianSusulan[tingkat]
    ut.mutex.RUnlock()
    
    if !exists || len(ujianList) == 0 {
        return
    }
    
    now := time.Now().In(time.Local)
    
    var validUjian []models.UjianSusulanData
    for _, ujian := range ujianList {
        if ujian.WaktuDibuat.Format("2006-01-02") == today && 
           (now.Before(ujian.WaktuBerakhir) || now.Equal(ujian.WaktuBerakhir)) {
            validUjian = append(validUjian, ujian)
        }
    }
    
    if len(validUjian) == 0 {
        return
    }
    
    ujianBySesi := make(map[string][]models.UjianSusulanData)
    for _, ujian := range validUjian {
        ujianBySesi[ujian.SesiId] = append(ujianBySesi[ujian.SesiId], ujian)
    }
    
    for sesiID, ujianGroup := range ujianBySesi {
        integrated := false
        
        for i := range tingkatData.SesiUjian {
            sesi := &tingkatData.SesiUjian[i]
            if sesi.ID == sesiID && sesi.TampilkanUjian {
                for _, ujianSusulan := range ujianGroup {
                    ujianSusulan.UjianData.Status = "active"
                    ujianSusulan.UjianData.HitungMundurAktif = true
                    sisaWaktu := int(math.Ceil(ujianSusulan.WaktuBerakhir.Sub(now).Minutes()))
                    ujianSusulan.UjianData.SisaWaktuMulai = sisaWaktu
                    
                    sesi.Ujian = append(sesi.Ujian, ujianSusulan.UjianData)
                }
                integrated = true
                log.Printf("DEBUG: Integrated %d ujian susulan to existing sesi %s", len(ujianGroup), sesiID)
                break
            }
        }
        
        if !integrated {
            virtualSesi := models.SesiData{
                ID:                    fmt.Sprintf("virtual-%s-%d", sesiID, now.Unix()),
                IsSesi:               99, // Special marker untuk virtual sesi
                JamMulai:             now.Format("15:04"),
                JamSelesai:           now.Add(2 * time.Hour).Format("15:04"),
                TampilkanUjian:       true,
                HitungMundurSesiAktif: false,
                SisaWaktuSesi:        0,
                SisaWaktuResetUjian:  0,
                AdaSesiBerikutnya:    false,
                IsNextSesi:           0,
                Ujian:                []models.UjianData{},
            }
            
            for _, ujianSusulan := range ujianGroup {
                ujianSusulan.UjianData.Status = "active"
                ujianSusulan.UjianData.HitungMundurAktif = true
                sisaWaktu := int(math.Ceil(ujianSusulan.WaktuBerakhir.Sub(now).Minutes()))
                ujianSusulan.UjianData.SisaWaktuMulai = sisaWaktu
                
                virtualSesi.Ujian = append(virtualSesi.Ujian, ujianSusulan.UjianData)
            }
            
            tingkatData.SesiUjian = append(tingkatData.SesiUjian, virtualSesi)
            log.Printf("DEBUG: Created virtual sesi for %d ujian susulan (target sesi: %s)", len(ujianGroup), sesiID)
        }
    }
}

func (ut *UjianTracker) canAddUjianSusulanToSesi(sesiID string, tingkatData *models.TingkatData, now time.Time) bool {
    for _, sesi := range tingkatData.SesiUjian {
        if sesi.ID == sesiID {
            if sesi.JamMulai != "" && sesi.JamSelesai != "" {
                sesiMulai, errMulai := parseTime(sesi.JamMulai)
                sesiSelesai, errSelesai := parseTime(sesi.JamSelesai)
                
                if errMulai == nil && errSelesai == nil {
                    // Bisa tambah jika:
                    // 1. Sesi sedang berlangsung
                    if now.After(sesiMulai) && now.Before(sesiSelesai) {
                        return true
                    }
                    // 2. Sesi akan dimulai dalam 5 menit
                    if now.Before(sesiMulai) && int(math.Ceil(sesiMulai.Sub(now).Minutes())) <= 5 {
                        return true
                    }
                }
            }
        }
    }
    return false
}


func (ut *UjianTracker) isSesiCurrentlyActive(sesiList []models.SesiData, now time.Time) (*models.SesiData, bool) {
    for i := range sesiList {
        sesi := &sesiList[i]
        if sesi.JamMulai != "" && sesi.JamSelesai != "" {
            sesiMulai, errMulai := parseTime(sesi.JamMulai)
            sesiSelesai, errSelesai := parseTime(sesi.JamSelesai)
            
            if errMulai == nil && errSelesai == nil {
                // Sesi sedang berlangsung
                if now.After(sesiMulai) && now.Before(sesiSelesai) {
                    return sesi, true
                }
                // Atau sesi akan dimulai dalam 5 menit
                if now.Before(sesiMulai) && int(math.Ceil(sesiMulai.Sub(now).Minutes())) <= 5 {
                    return sesi, false
                }
            }
        }
    }
    return nil, false
}

func (ut *UjianTracker) shouldDisplaySesi(sesi *models.SesiData, sesiMulai, sesiSelesai time.Time, now time.Time, allSesi []models.SesiData, currentIndex int) bool {
    if strings.Contains(sesi.ID, "susulan") {
        return ut.shouldDisplaySesiUjianSusulan(sesi, now)
    }
    
    if now.After(sesiMulai) && now.Before(sesiSelesai) {
        return true
    } else if now.Before(sesiMulai) {
        sisaWaktuKeSesi := int(math.Ceil(sesiMulai.Sub(now).Minutes()))
        return sisaWaktuKeSesi <= 5
    } else if now.After(sesiSelesai) {
        // Cek apakah ada sesi berikutnya
        var sesiBerikutnya *models.SesiData = nil
        var waktuSesiBerikutnya time.Time
        
        for nextIdx := currentIndex + 1; nextIdx < len(allSesi); nextIdx++ {
            nextSesi := &allSesi[nextIdx]
            if nextSesi.JamMulai != "" && !strings.Contains(nextSesi.ID, "susulan") {
                waktuNext, err := parseTime(nextSesi.JamMulai)
                if err == nil {
                    sesiBerikutnya = nextSesi
                    waktuSesiBerikutnya = waktuNext
                    break
                }
            }
        }
        
        if sesiBerikutnya != nil {
            sisaWaktuKeSesiBerikutnya := int(math.Ceil(waktuSesiBerikutnya.Sub(now).Minutes()))
            shouldDisplay := sisaWaktuKeSesiBerikutnya > 5
            
            if !shouldDisplay {
                log.Printf("DEBUG: Should hide sesi %s - less than 5 minutes to next sesi (%d minutes remaining)", 
                    sesi.ID, sisaWaktuKeSesiBerikutnya)
            }
            
            return shouldDisplay
        } else {
            // Sesi terakhir - tampilkan maksimal 2 jam setelah selesai
            menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
            shouldDisplay := menitSetelahSelesai <= 120
            
            if !shouldDisplay {
                log.Printf("DEBUG: Should hide last sesi %s - more than 2 hours after end (%d minutes passed)", 
                    sesi.ID, menitSetelahSelesai)
            }
            
            return shouldDisplay
        }
    }
    
    return false
}

func (ut *UjianTracker) shouldDisplaySesiUjianSusulan(sesi *models.SesiData, now time.Time) bool {
    if len(sesi.Ujian) == 0 {
        return false
    }
    ujianPertama := sesi.Ujian[0]
    if !ujianPertama.IsUjianSusulan {
        return false
    }
    
    waktuMulai := ujianPertama.WaktuDibuat
    waktuSelesai := waktuMulai.Add(time.Duration(ujianPertama.WaktuPengerjaan) * time.Minute)
    shouldDisplay := now.Before(waktuSelesai) || now.Equal(waktuSelesai)
    
    if !shouldDisplay {
        log.Printf("DEBUG: Hiding ujian susulan sesi %s - waktu pengerjaan telah berakhir", sesi.ID)
    }
    
    return shouldDisplay
}

func (ut *UjianTracker) checkAndCleanExpiredSessionsBeforeIntegration(tingkatData *models.TingkatData, tingkat models.Tingkat, now time.Time) {
    activeSesi, isActive := ut.isSesiCurrentlyActive(tingkatData.SesiUjian, now)
    
    if isActive {
        log.Printf("DEBUG: Ada sesi aktif (%s), skip cleaning ujian susulan untuk allow new additions", activeSesi.ID)
        return
    }
    
    var nextSesiTime *time.Time
    var isLastSesi bool = true
    
    for _, sesi := range tingkatData.SesiUjian {
        if sesi.JamMulai != "" {
            sesiMulai, err := parseTime(sesi.JamMulai)
            if err == nil && now.Before(sesiMulai) {
                if nextSesiTime == nil || sesiMulai.Before(*nextSesiTime) {
                    nextSesiTime = &sesiMulai
                    isLastSesi = false
                }
            }
        }
    }
    
    var lastFinishedSesiTime *time.Time
    for _, sesi := range tingkatData.SesiUjian {
        if sesi.JamSelesai != "" {
            sesiSelesai, err := parseTime(sesi.JamSelesai)
            if err == nil && now.After(sesiSelesai) {
                if lastFinishedSesiTime == nil || sesiSelesai.After(*lastFinishedSesiTime) {
                    lastFinishedSesiTime = &sesiSelesai
                }
            }
        }
    }
    
    shouldClean := false
    reason := ""
    
    if nextSesiTime != nil {
        minutesToNext := int(math.Ceil(nextSesiTime.Sub(now).Minutes()))
        if minutesToNext <= 5 {
            shouldClean = true
            reason = fmt.Sprintf("Next sesi in %d minutes, cleaning ujian susulan", minutesToNext)
        }
    } else if lastFinishedSesiTime != nil && isLastSesi {
        minutesSinceEnd := int(now.Sub(*lastFinishedSesiTime).Minutes())
        if minutesSinceEnd >= 120 {
            shouldClean = true
            reason = fmt.Sprintf("Last sesi ended %d minutes ago, cleaning ujian susulan", minutesSinceEnd)
        }
    }
    
    if shouldClean {
        log.Printf("DEBUG: Pre-integration cleaning - %s", reason)
        ut.cleanAllUjianSusulanByTingkat(tingkat, reason)
    }
}


func (ut *UjianTracker) cleanAllUjianSusulanByTingkat(tingkat models.Tingkat, reason string) {
    ut.mutex.Lock()
    defer ut.mutex.Unlock()
    
    ujianList, exists := ut.UjianSusulan[tingkat]
    if !exists || len(ujianList) == 0 {
        return
    }
    
    // Kumpulkan semua ujian IDs sebelum dihapus
    var ujianIDsToReactivate []string
    for _, ujian := range ujianList {
        ujianIDsToReactivate = append(ujianIDsToReactivate, ujian.UjianData.ID)
    }
    
    cleanedCount := len(ujianList)
    delete(ut.UjianSusulan, tingkat)
    
    log.Printf("DEBUG: Cleaned ALL %d ujian susulan for tingkat %s - Reason: %s",
        cleanedCount, tingkat, reason)
    
    // Update status ujian ke 'active' setelah dibersihkan
    if len(ujianIDsToReactivate) > 0 {
        if err := updateUjianStatusList(ut.DB, ujianIDsToReactivate); err != nil {
            log.Printf("ERROR: Gagal update status ujian setelah clean by tingkat %s: %v", tingkat, err)
        } else {
            log.Printf("DEBUG: Successfully reactivated %d ujian after cleaning tingkat %s", 
                len(ujianIDsToReactivate), tingkat)
        }
    }
}
func (ut *UjianTracker) cleanExpiredUjianSusulan() {
    ut.mutex.Lock()
    defer ut.mutex.Unlock()
    now := time.Now()
    cleanedCount := 0
    var ujianIDsToReactivate []string

    for tingkat, ujianList := range ut.UjianSusulan {
        var activeUjian []models.UjianSusulanData
        for _, ujian := range ujianList {
            waktuExpired := ujian.WaktuBerakhir
            if now.Before(waktuExpired) || now.Equal(waktuExpired) {
                activeUjian = append(activeUjian, ujian)
            } else {
                log.Printf("DEBUG: Cleaning expired ujian susulan: %s (expired at %s)",
                    ujian.UjianData.ID, waktuExpired.Format("15:04:05"))
                cleanedCount++
                ujianIDsToReactivate = append(ujianIDsToReactivate, ujian.UjianData.ID)
            }
        }
        
        if len(activeUjian) == 0 {
            delete(ut.UjianSusulan, tingkat)
        } else {
            ut.UjianSusulan[tingkat] = activeUjian
        }
    }
    if cleanedCount > 0 {
        log.Printf("DEBUG: Cleaned %d expired ujian susulan", cleanedCount)
        if err := updateUjianStatusList(ut.DB, ujianIDsToReactivate); err != nil {
            log.Printf("ERROR: Gagal update status ujian: %v", err)
        }
    }
}

func updateUjianStatusList(db *sql.DB, ujianIDs []string) error {
    tx, err := db.Begin()
    if err != nil {
        return fmt.Errorf("gagal mulai transaksi: %w", err)
    }

    for _, id := range ujianIDs {
        if err := updateUjianStatusInTx(tx, id); err != nil {
            tx.Rollback()
            return fmt.Errorf("gagal update status ujian ID %s: %w", id, err)
        }
    }

    return tx.Commit()
}

func updateUjianStatusInTx(tx *sql.Tx, ujianId string) error {
    query := "UPDATE ujian SET status = 'selesai' WHERE id = $1"
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




func (ut *UjianTracker) AddUjianSusulan(tingkat models.Tingkat, ujianData models.UjianData, durasiMenit int, sesiID string) error {
    ut.mutex.Lock()
    defer ut.mutex.Unlock()
    
    now := time.Now().In(time.Local)
    
    // Jika ini adalah penambahan untuk sesi yang sedang aktif, reset cleaning terlebih dahulu
    jadwalData, err := repositories.GetJadwalUjian(ut.DB)
    if err == nil {
        if tingkatDataList, exists := jadwalData[tingkat]; exists {
            today := now.Format("2006-01-02")
            for _, tingkatData := range tingkatDataList {
                if tingkatData.Tanggal == today {
                    // Cek apakah sesi target sedang aktif
                    if ut.canAddUjianSusulanToSesi(sesiID, &tingkatData, now) {
                        log.Printf("DEBUG: Allowing ujian susulan addition to active sesi %s", sesiID)
                        // Lanjutkan proses penambahan tanpa cleaning
                        break
                    }
                }
            }
        }
    }
    
    waktuBerakhir := now.Add(time.Duration(durasiMenit) * time.Minute)
    
    ujianSusulan := models.UjianSusulanData{
        UjianData:     ujianData,
        WaktuDibuat:   now,
        WaktuBerakhir: waktuBerakhir,
        SesiId:        sesiID,
    }
    
    if ut.UjianSusulan == nil {
        ut.UjianSusulan = make(map[models.Tingkat][]models.UjianSusulanData)
    }
    
    ut.UjianSusulan[tingkat] = append(ut.UjianSusulan[tingkat], ujianSusulan)
    
    log.Printf("DEBUG: Added ujian susulan %s to tingkat %s, sesi %s, berlaku sampai %s", 
        ujianData.ID, tingkat, sesiID, waktuBerakhir.Format("15:04:05"))
    
    return nil
}

func (ut *UjianTracker) updateUjianStatusInSesi(sesi *models.SesiData, now time.Time) {
    var validUjian []models.UjianData
    for k := range sesi.Ujian {
        ujian := &sesi.Ujian[k]
        oldStatus := ujian.Status
        
        if ujian.IsUjianSusulan {
            ujianMulai := ujian.WaktuDibuat
            ujianSelesai := ujianMulai.Add(time.Duration(ujian.WaktuPengerjaan) * time.Minute)
            
            if now.After(ujianSelesai) {
                log.Printf("DEBUG: Ujian susulan %s sudah expired, akan dihapus dari sesi", ujian.ID)
                continue
            } else if now.After(ujianMulai) {
                ujian.Status = "active"
                ujian.HitungMundurAktif = false
                ujian.SisaWaktuMulai = 0
            }
            ujian.JamMulai = ujianMulai.Format("15:04")
            ujian.JamSelesai = ujianSelesai.Format("15:04")
            
        } else {
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
            ujian.Status = newStatus
        }

        if oldStatus != ujian.Status {
            err := updateUjianStatus(ut.DB, ujian, ujian.Status)
            if err != nil {
                log.Printf("Error updating ujian status: %v", err)
            }
        }
        
        validUjian = append(validUjian, *ujian)
    }

	sesi.Ujian = validUjian
}


func (ut *UjianTracker) updateFinishedSesiUjianStatus(sesi *models.SesiData, now time.Time) {
    for k := range sesi.Ujian {
        ujian := &sesi.Ujian[k]
        oldStatus := ujian.Status
        newStatus := "selesai"
        ujian.HitungMundurAktif = false
        ujian.SisaWaktuMulai = 0

        if ujian.IsUjianSusulan {
            ujianMulai := ujian.WaktuDibuat
            ujianSelesai := ujianMulai.Add(time.Duration(ujian.WaktuPengerjaan) * time.Minute)
            
            if now.After(ujianSelesai) {
                newStatus = "selesai"
            } else if now.After(ujianMulai) {
                newStatus = "active"
            } else {
                newStatus = "pending"
            }
        } else {
            newStatus = "selesai"
        }
        
        ujian.Status = newStatus
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
	start := time.Now() 

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

	duration := time.Since(start) 
	log.Printf("Ujian %s status updated to %s with token %s (took %s)", ujian.ID, newStatus, token, duration)
	return nil
}

func parseTime(timeStr string) (time.Time, error) {
	now := time.Now()
	timeFormat := "15:04"
	t, err := time.Parse(timeFormat, timeStr)
	if err != nil {
		return time.Time{}, err
	}
	location := time.Local 
	return time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, location), nil
}


func (ut *UjianTracker) StartTracking() {
	
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