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

func (ut *UjianTracker) integratedUjianSusulan(tingkatData *models.TingkatData, tingkat models.Tingkat, today string) {
    ut.mutex.RLock()
    ujianList, exists := ut.UjianSusulan[tingkat]
    ut.mutex.RUnlock()

    if !exists || len(ujianList) == 0 {
        return
    }
    now := time.Now()
    var ujianHariIni []models.UjianSusulanData
    for _, ujian := range ujianList {
        ujianDate := ujian.WaktuDibuat.Format("2006-01-02")
        waktuExpired := ujian.WaktuBerakhir.Add(2 * time.Hour)
        
        if ujianDate == today && now.Before(waktuExpired) {
            ujianHariIni = append(ujianHariIni, ujian)
        } else if !now.Before(waktuExpired) {
            log.Printf("DEBUG: Skipping expired ujian susulan %s", ujian.UjianData.ID)
        }
    }

    if len(ujianHariIni) == 0 {
        return
    }

    log.Printf("DEBUG: Processing %d valid ujian susulan for today in tingkat %s", len(ujianHariIni), tingkat)
    var targetSesi *models.SesiData = nil
    var targetSesiIndex int = -1
    
    // Cek sesi reguler yang masih aktif
    for i := range tingkatData.SesiUjian {
        sesi := &tingkatData.SesiUjian[i]
        
        // Skip sesi ujian susulan
        if strings.Contains(sesi.ID, "susulan") {
            continue
        }
        
        if sesi.JamMulai == "" || sesi.JamSelesai == "" {
            continue
        }
        
        sesiMulai, errMulai := parseTime(sesi.JamMulai)
        sesiSelesai, errSelesai := parseTime(sesi.JamSelesai)
        
        if errMulai != nil || errSelesai != nil {
            continue
        }
        
        // Cek apakah sesi ini masih harus ditampilkan
        if ut.shouldDisplaySesi(sesi, sesiMulai, sesiSelesai, now, tingkatData.SesiUjian, i) {
            targetSesi = sesi
            targetSesiIndex = i
            break
        }
    }

    if targetSesi != nil {
        log.Printf("DEBUG: Adding ujian susulan to existing target sesi: %s", targetSesi.ID)
        ut.addUjianSusulanToTargetSesi(tingkatData, targetSesiIndex, ujianHariIni, now)
    } else {
        log.Printf("DEBUG: Creating standalone sesi for ujian susulan")
        ut.createSesiForUjianSusulan(tingkatData, ujianHariIni, now)
    }
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
        var sesiBerikutnya *models.SesiData = nil
        var waktuSesiBerikutnya time.Time
        
        for nextIdx := currentIndex + 1; nextIdx < len(allSesi); nextIdx++ {
            nextSesi := &allSesi[nextIdx]
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
            shouldDisplay := sisaWaktuKeSesiBerikutnya > 5
            
            if !shouldDisplay {
                log.Printf("DEBUG: Hiding sesi %s - less than 5 minutes to next sesi (%d minutes remaining)", 
                    sesi.ID, sisaWaktuKeSesiBerikutnya)
            }
            
            return shouldDisplay
        } else {
            menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
            shouldDisplay := menitSetelahSelesai <= 120
            
            if !shouldDisplay {
                log.Printf("DEBUG: Hiding last sesi %s - more than 2 hours after end (%d minutes passed)", 
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

func (ut *UjianTracker) addUjianSusulanToTargetSesi(tingkatData *models.TingkatData, sesiIndex int, ujianHariIni []models.UjianSusulanData, now time.Time) {
    if sesiIndex < 0 || sesiIndex >= len(tingkatData.SesiUjian) {
        log.Printf("ERROR: Invalid sesi index: %d", sesiIndex)
        return
    }
    targetSesi := &tingkatData.SesiUjian[sesiIndex]
    log.Printf("DEBUG: Adding %d ujian susulan to target sesi %s", len(ujianHariIni), targetSesi.ID)
    addedCount := 0
    for _, ujianSusulan := range ujianHariIni {
        ujianData := ujianSusulan.UjianData
        if ut.isUjianSusulanExpired(&ujianData, now) {
            log.Printf("DEBUG: Ujian susulan %s sudah expired, skip adding", ujianData.ID)
            continue
        }
        isDuplicate := false
        existingIndex := -1
        for i, existingUjian := range targetSesi.Ujian {
            if existingUjian.ID == ujianData.ID {
                isDuplicate = true
                existingIndex = i
                log.Printf("DEBUG: Ujian %s already exists in sesi, updating status only", ujianData.ID)
                break
            }
        }
        
        if isDuplicate {
            existingUjian := &tingkatData.SesiUjian[sesiIndex].Ujian[existingIndex]
            originalToken := existingUjian.Token
            ut.updateUjianSusulanStatusForSesi(existingUjian, targetSesi, now)
            existingUjian.Token = originalToken
            log.Printf("DEBUG: Updated existing ujian susulan %s, token preserved: %s", existingUjian.ID, originalToken)
            
        } else {
            ut.updateUjianSusulanStatusForSesi(&ujianData, targetSesi, now)
            
            tingkatData.SesiUjian[sesiIndex].Ujian = append(tingkatData.SesiUjian[sesiIndex].Ujian, ujianData)
            addedCount++
            log.Printf("DEBUG: Successfully added new ujian susulan %s to sesi with token: %s", ujianData.ID, ujianData.Token)
        }
    }
    var validUjian []models.UjianData
    for _, ujian := range tingkatData.SesiUjian[sesiIndex].Ujian {
        if ujian.IsUjianSusulan {
            if !ut.isUjianSusulanExpired(&ujian, now) {
                validUjian = append(validUjian, ujian)
            } else {
                log.Printf("DEBUG: Removing expired ujian susulan %s from sesi", ujian.ID)
            }
        } else {
            validUjian = append(validUjian, ujian)
        }
    }
    
    tingkatData.SesiUjian[sesiIndex].Ujian = validUjian

    for i := range tingkatData.SesiUjian[sesiIndex].Ujian {
        ujian := &tingkatData.SesiUjian[sesiIndex].Ujian[i]
        ujian.UjianBerikutnyaAda = (i < len(tingkatData.SesiUjian[sesiIndex].Ujian)-1)
    }
    
    log.Printf("DEBUG: Final sesi %s now has %d ujian (added %d new ujian susulan)", 
        targetSesi.ID, len(tingkatData.SesiUjian[sesiIndex].Ujian), addedCount)
}

func (ut *UjianTracker) updateUjianSusulanStatusForSesi(ujian *models.UjianData, sesi *models.SesiData, now time.Time) {
    if ujian.IsUjianSusulan {
        ujianMulai := ujian.WaktuDibuat
        ujianSelesai := ujianMulai.Add(time.Duration(ujian.WaktuPengerjaan) * time.Minute)
        ujian.JamMulai = ujianMulai.Format("15:04")
        ujian.JamSelesai = ujianSelesai.Format("15:04")
        if now.After(ujianSelesai) {
            ujian.Status = "selesai"
            ujian.HitungMundurAktif = false
            ujian.SisaWaktuMulai = 0
        } else if now.After(ujianMulai) {
            ujian.Status = "active"
            ujian.HitungMundurAktif = false
            ujian.SisaWaktuMulai = 0
        } else {
            ujian.Status = "pending"
            sisaWaktu := int(math.Ceil(ujianMulai.Sub(now).Minutes()))
            ujian.SisaWaktuMulai = sisaWaktu
            ujian.HitungMundurAktif = sisaWaktu <= 30
        }
        
        log.Printf("DEBUG: Ujian susulan %s status individual: %s (mulai: %s, selesai: %s)", 
            ujian.ID, ujian.Status, ujianMulai.Format("15:04"), ujianSelesai.Format("15:04"))
        return
    }
    sesiMulai, err1 := parseTime(sesi.JamMulai)
    sesiSelesai, err2 := parseTime(sesi.JamSelesai)
    
    if err1 != nil || err2 != nil {
        log.Printf("ERROR: Cannot parse sesi time")
        return
    }
    ujian.JamMulai = sesi.JamMulai
    ujian.JamSelesai = sesi.JamSelesai
    
    if now.After(sesiSelesai) {
        ujian.Status = "selesai"
        ujian.HitungMundurAktif = false
        ujian.SisaWaktuMulai = 0
    } else if now.After(sesiMulai) {
        ujian.Status = "active"
        ujian.HitungMundurAktif = false
        ujian.SisaWaktuMulai = 0
    } else {
        ujian.Status = "pending"
        sisaWaktu := int(math.Ceil(sesiMulai.Sub(now).Minutes()))
        ujian.SisaWaktuMulai = sisaWaktu
        ujian.HitungMundurAktif = sisaWaktu <= 30
    }
}

func (ut *UjianTracker) isUjianSusulanExpired(ujian *models.UjianData, now time.Time) bool {
    if !ujian.IsUjianSusulan {
        return false
    }
    
    ujianSelesai := ujian.WaktuDibuat.Add(time.Duration(ujian.WaktuPengerjaan) * time.Minute)
    return now.After(ujianSelesai)
}

func (ut *UjianTracker) createSesiForUjianSusulan(tingkatData *models.TingkatData, ujianHariIni []models.UjianSusulanData, now time.Time) {
    if len(ujianHariIni) == 0 {
        log.Printf("DEBUG: No ujian to process")
        return
    }

    var waktuPengerjaanTerlama int = 0
    var ujianTerlama *models.UjianSusulanData
    
    for i := range ujianHariIni {
        if ujianHariIni[i].UjianData.WaktuPengerjaan > waktuPengerjaanTerlama {
            waktuPengerjaanTerlama = ujianHariIni[i].UjianData.WaktuPengerjaan
            ujianTerlama = &ujianHariIni[i]
        }
    }
    
    waktuMulaiUjianTerlama := ujianTerlama.WaktuDibuat
    waktuBerakhirUjianTerlama := waktuMulaiUjianTerlama.Add(time.Duration(waktuPengerjaanTerlama) * time.Minute)
    
    if now.After(waktuBerakhirUjianTerlama) {
        log.Printf("DEBUG: Ujian susulan sudah berakhir berdasarkan waktu pengerjaan, tidak membuat sesi baru")
        return
    }
    
    sesiId := fmt.Sprintf("susulan_gabungan_%s_%d_%d", ujianTerlama.Tingkat, waktuMulaiUjianTerlama.Unix(), waktuPengerjaanTerlama)
    
    waktuMulaiSesi := ujianTerlama.WaktuDibuat
    waktuBerakhirSesi := waktuMulaiSesi.Add(time.Duration(waktuPengerjaanTerlama) * time.Minute)
    
    newSesi := models.SesiData{
        ID:                    sesiId,
        IsSesi:                1,
        JamMulai:              waktuMulaiSesi.Format("15:04"),
        JamSelesai:            waktuBerakhirSesi.Format("15:04"),
        HitungMundurSesiAktif: false,
        SisaWaktuSesi:         0,
        SisaWaktuResetUjian:   0,
        AdaSesiBerikutnya:     false,
        IsNextSesi:            0,
        TampilkanUjian:        false,
        Ujian:                 []models.UjianData{}, 
    }
    
    log.Printf("DEBUG: Created combined sesi %s with duration %d minutes", sesiId, waktuPengerjaanTerlama)
    
    var ujianList []models.UjianData
    
    for i, ujianSusulan := range ujianHariIni {
        ujianData := ujianSusulan.UjianData
        
        ujianData.IsUjianSusulan = true
        ujianData.UjianBerikutnyaAda = (i < len(ujianHariIni)-1)
        ujianData.JamMulai = waktuMulaiSesi.Format("15:04")
        ujianData.JamSelesai = waktuBerakhirSesi.Format("15:04")
        ujianData.WaktuPengerjaan = waktuPengerjaanTerlama
        
        // Update status berdasarkan waktu sekarang
        if now.After(waktuBerakhirSesi) {
            ujianData.Status = "selesai"
            ujianData.HitungMundurAktif = false
            ujianData.SisaWaktuMulai = 0
        } else if now.After(waktuMulaiSesi) {
            ujianData.Status = "active"
            ujianData.HitungMundurAktif = false
            ujianData.SisaWaktuMulai = 0
        } else {
            ujianData.Status = "pending"
            sisaWaktu := int(math.Ceil(waktuMulaiSesi.Sub(now).Minutes()))
            ujianData.SisaWaktuMulai = sisaWaktu
            ujianData.HitungMundurAktif = sisaWaktu <= 30
        }
        
        ujianList = append(ujianList, ujianData)
        log.Printf("DEBUG: Added ujian %s to combined sesi (status: %s)", ujianData.ID, ujianData.Status)
    }

    newSesi.Ujian = ujianList
    
    ut.updateSesiSusulanStatusWithDuration(&newSesi, *ujianTerlama, now, waktuPengerjaanTerlama)
    
    if newSesi.TampilkanUjian {
        tingkatData.SesiUjian = append(tingkatData.SesiUjian, newSesi)
        
        sort.Slice(tingkatData.SesiUjian, func(i, j int) bool {
            jamI, _ := parseTime(tingkatData.SesiUjian[i].JamMulai)
            jamJ, _ := parseTime(tingkatData.SesiUjian[j].JamSelesai)
            return jamI.Before(jamJ)
        })
        
        log.Printf("DEBUG: Added sesi ujian susulan to tingkatData")
    } else {
        log.Printf("DEBUG: Sesi ujian susulan not added - already expired")
    }
}

func (ut *UjianTracker) updateSesiSusulanStatusWithDuration(sesi *models.SesiData, ujianSusulan models.UjianSusulanData, now time.Time, durationMinutes int) {
    sesiMulai := ujianSusulan.WaktuDibuat
    sesiSelesai := sesiMulai.Add(time.Duration(durationMinutes) * time.Minute)
    
    log.Printf("DEBUG: updateSesiSusulanStatusWithDuration - Mulai: %s, Selesai: %s", 
        sesiMulai.Format("15:04:05"), sesiSelesai.Format("15:04:05"))
    
    if now.After(sesiSelesai) {
        sesi.TampilkanUjian = false
        sesi.HitungMundurSesiAktif = false
        sesi.SisaWaktuSesi = 0
        sesi.SisaWaktuResetUjian = 0
        log.Printf("DEBUG: Sesi ujian susulan sudah berakhir - langsung hilang")
        
    } else if now.After(sesiMulai) {
        sesi.TampilkanUjian = true
        sesi.HitungMundurSesiAktif = false
        sesi.SisaWaktuSesi = 0
        sisaWaktuPengerjaan := int(math.Ceil(sesiSelesai.Sub(now).Minutes()))
        sesi.SisaWaktuResetUjian = sisaWaktuPengerjaan
        log.Printf("DEBUG: Sesi ujian susulan sedang berlangsung, selesai dalam %d menit", sisaWaktuPengerjaan)
        
    } else {
        sesi.TampilkanUjian = true
        sisaWaktu := int(math.Ceil(sesiMulai.Sub(now).Minutes()))
        
        if sisaWaktu <= 30 {
            sesi.HitungMundurSesiAktif = true
            sesi.SisaWaktuSesi = sisaWaktu
        } else {
            sesi.HitungMundurSesiAktif = false
            sesi.SisaWaktuSesi = 0
        }
        sesi.SisaWaktuResetUjian = 0
        log.Printf("DEBUG: Sesi ujian susulan belum dimulai, mulai dalam %d menit", sisaWaktu)
    }
}

func (ut *UjianTracker) AddUjianSusulan(tingkat models.Tingkat, ujianData *models.UjianData, sesiId string) error {
    ut.mutex.Lock()
    defer ut.mutex.Unlock()
    now := time.Now()
    if sesiId == "" {
        sesiId = fmt.Sprintf("susulan_%s_%d_%s", tingkat, now.Unix(), ujianData.ID)
    }
    if ut.UjianSusulan != nil {
        if existingList, exists := ut.UjianSusulan[tingkat]; exists {
            for _, existing := range existingList {
                if existing.UjianData.ID == ujianData.ID {
                    log.Printf("WARNING: Ujian susulan dengan ID %s sudah ada, skip adding", ujianData.ID)
                    return fmt.Errorf("ujian susulan dengan ID %s sudah ada", ujianData.ID)
                }
            }
        }
    }
    
    waktuPengerjaan := time.Duration(ujianData.WaktuPengerjaan) * time.Minute
    ujianData.IsUjianSusulan = true
    ujianData.Status = "active"
    ujianData.HitungMundurAktif = false
    ujianData.SisaWaktuMulai = 0
    ujianData.UjianBerikutnyaAda = false
    ujianData.JamMulai = now.Format("15:04")
    ujianData.JamSelesai = now.Add(waktuPengerjaan).Format("15:04")
    ujianData.WaktuDibuat = now
    ujianData.WaktuBerakhir = now.Add(waktuPengerjaan)

    sesiData := models.SesiData{
        ID:                    sesiId,
        IsSesi:                1,
        JamMulai:              now.Format("15:04"),
        JamSelesai:            now.Add(waktuPengerjaan).Format("15:04"),
        HitungMundurSesiAktif: false,
        SisaWaktuSesi:         0,
        SisaWaktuResetUjian:   ujianData.WaktuPengerjaan,
        AdaSesiBerikutnya:     false,
        IsNextSesi:            0,
        TampilkanUjian:        true,
        Ujian:                 []models.UjianData{},
    }

    ujianSusulan := models.UjianSusulanData{
        Tingkat:       tingkat,
        UjianData:     *ujianData,
        SesiData:      sesiData,
        WaktuDibuat:   now,
        WaktuBerakhir: now.Add(waktuPengerjaan),
    }

    if ut.UjianSusulan == nil {
        ut.UjianSusulan = make(map[models.Tingkat][]models.UjianSusulanData)
    }

    ut.UjianSusulan[tingkat] = append(ut.UjianSusulan[tingkat], ujianSusulan)

    log.Printf("Ujian susulan ditambahkan untuk tingkat %s, ujian ID: %s, status: %s, waktu pengerjaan: %d menit", 
        tingkat, ujianData.ID, ujianData.Status, ujianData.WaktuPengerjaan)
    
    return nil
}

func (ut *UjianTracker) cleanExpiredUjianSusulan() {
    ut.mutex.Lock()
    defer ut.mutex.Unlock()
    now := time.Now()
    cleanedCount := 0
    
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
            }
        }
        
        if len(activeUjian) == 0 {
            delete(ut.UjianSusulan, tingkat)
        } else {
            ut.UjianSusulan[tingkat] = activeUjian
        }
    }
    
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
            } else {
                ujian.Status = "pending"
                sisaWaktu := int(math.Ceil(ujianMulai.Sub(now).Minutes()))
                ujian.SisaWaktuMulai = sisaWaktu
                ujian.HitungMundurAktif = sisaWaktu <= 30
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
			if tanggal.Format("2006-01-02") == today {
				ut.integratedUjianSusulan(tingkatData, tingkat, today)
			}
			
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
							} else {
								menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
								if menitSetelahSelesai <= 120 {
									sesiYangDitampilkan = sesi
									sesi.TampilkanUjian = true
									sesi.SisaWaktuResetUjian = 120 - menitSetelahSelesai
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
							}
						}
					}
				}
				
				var sesiUntukDitampilkan []models.SesiData
				if sesiYangDitampilkan != nil {
					sesiUntukDitampilkan = append(sesiUntukDitampilkan, *sesiYangDitampilkan)
				}
				tingkatData.SesiUjian = sesiUntukDitampilkan
				
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
		}else {
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