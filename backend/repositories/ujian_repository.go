// repositories/ujian_repository.go
package repositories

import (
	"backend/models"
	"database/sql"
	"fmt"
	"log"
	"math"
	"sort"
	"time"
)

// GetJadwalUjian mengambil jadwal ujian untuk 3 hari ke depan
func GetJadwalUjian(db *sql.DB) (map[models.Tingkat][]models.TingkatData, error) {
    result := make(map[models.Tingkat][]models.TingkatData)
    today := time.Now()
    query := `
        SELECT j.id, j.tanggal, j.tingkat,  
        s.id as sesi_id, s.sesi, s."jamMulai" as sesi_jam_mulai, s."jamSelesai" as sesi_jam_selesai, 
        u.id as ujian_id, u."jamMulai", u."jamSelesai", u.status, u.token, u."waktuPengerjaan",  
        mp.pelajaran 
        FROM jadwal j 
        JOIN sesi s ON j.id = s."jadwalId" 
        JOIN ujian u ON s.id = u."sesiId" 
        JOIN mata_pelajaran mp ON u."mataPelajaranId" = mp.id 
        WHERE j.tanggal >= $1 AND j.tanggal <= $2 
        ORDER BY j.tanggal, j.tingkat, s.sesi, u."jamMulai"
    `
    endDate := today.AddDate(0, 0, 3)
    rows, err := db.Query(query, today.Format("2006-01-02"), endDate.Format("2006-01-02"))
    if err != nil {
        return nil, fmt.Errorf("error querying jadwal: %v", err)
    }
    defer rows.Close()
    jadwalMap := make(map[string]*models.TingkatData)
    sesiMap := make(map[string]*models.SesiData)
    tingkatTanggalMap := make(map[models.Tingkat]map[string]bool)
    for rows.Next() {
        var jadwalID, sesiID, ujianID, mataPelajaran string
        var tanggal time.Time
        var tingkatStr, status string
        var sesiNum int
        var sesiJamMulai, sesiJamSelesai, ujianJamMulai, ujianJamSelesai, token sql.NullString
        var waktuPengerjaan sql.NullInt64
        err := rows.Scan(
            &jadwalID, &tanggal, &tingkatStr,
            &sesiID, &sesiNum, &sesiJamMulai, &sesiJamSelesai,
            &ujianID, &ujianJamMulai, &ujianJamSelesai, &status, &token, &waktuPengerjaan,
            &mataPelajaran,
        )
        if err != nil {
            log.Printf("Error scanning row: %v", err)
            continue
        }
        tingkat := models.Tingkat(tingkatStr)
        tanggalStr := tanggal.Format("2006-01-02")
        sisaHari := int(tanggal.Sub(today).Hours() / 24)
        if sisaHari < 0 {
            sisaHari = 0
        }
        if _, exists := tingkatTanggalMap[tingkat]; !exists {
            tingkatTanggalMap[tingkat] = make(map[string]bool)
        }
        jadwalKey := fmt.Sprintf("%s_%s", tanggalStr, tingkat)
        tingkatData, exist := jadwalMap[jadwalKey]
        if !exist {
            newTingkatData := models.TingkatData{
                Tanggal:               tanggalStr,
                SisaHari:              sisaHari,
                NextUjianAda:          true,
                PelacakUjianHariAktif: sisaHari <= 3 && sisaHari > 0,
                SesiUjian:             []models.SesiData{},
            }
            tingkatData = &newTingkatData
            jadwalMap[jadwalKey] = tingkatData
            tingkatTanggalMap[tingkat][tanggalStr] = true
        }
        sesiData, sesiExist := sesiMap[sesiID]
        if !sesiExist {
            jamMulai := ""
            if sesiJamMulai.Valid {
                jamMulai = sesiJamMulai.String
            }
            jamSelesai := ""
            if sesiJamSelesai.Valid {
                jamSelesai = sesiJamSelesai.String
            }
            newSesiData := models.SesiData{
                ID:                    sesiID,
                IsSesi:                sesiNum,
                JamMulai:              jamMulai,
                JamSelesai:            jamSelesai,
                HitungMundurSesiAktif: false,
                SisaWaktuSesi:         0,    
                AdaSesiBerikutnya:     false,
                Ujian:                 []models.UjianData{},
            }
            sesiData = &newSesiData
            sesiMap[sesiID] = sesiData
            tingkatData.SesiUjian = append(tingkatData.SesiUjian, *sesiData)
        }
        ujianJamMulaiStr := ""
        if ujianJamMulai.Valid {
            ujianJamMulaiStr = ujianJamMulai.String
        }
        ujianJamSelesaiStr := ""
        if ujianJamSelesai.Valid {
            ujianJamSelesaiStr = ujianJamSelesai.String
        }
        tokenStr := ""
        if token.Valid {
            tokenStr = token.String
        }
        waktuPengerjaanInt := 0
        if waktuPengerjaan.Valid {
            waktuPengerjaanInt = int(waktuPengerjaan.Int64)
        }
        ujianData := models.UjianData{
            ID:                 ujianID,
            MataPelajaran:      mataPelajaran,
            JamMulai:           ujianJamMulaiStr,
            JamSelesai:         ujianJamSelesaiStr,
            Status:             status,
            Token:              tokenStr,
            UjianBerikutnyaAda: false,
            HitungMundurAktif:  false,
            SisaWaktuMulai:     0,    
            WaktuPengerjaan:    waktuPengerjaanInt,
        }
        sesiData.Ujian = append(sesiData.Ujian, ujianData)
        for i, s := range tingkatData.SesiUjian {
            if s.ID == sesiID {
                tingkatData.SesiUjian[i].Ujian = sesiData.Ujian
                break
            }
        }
    }
    for tingkat, tanggalMap := range tingkatTanggalMap {
        var tingkatDataArr []models.TingkatData
        var tanggalKeys []string
        for tanggal := range tanggalMap {
            tanggalKeys = append(tanggalKeys, tanggal)
        }
        sort.Strings(tanggalKeys)
        for _, tanggal := range tanggalKeys {
            key := fmt.Sprintf("%s_%s", tanggal, tingkat)
            if tingkatData, ok := jadwalMap[key]; ok {
                tingkatDataArr = append(tingkatDataArr, *tingkatData)
            }
        }
        result[tingkat] = tingkatDataArr
    }
    return result, nil
}



func parseFlexibleDate(dateStr string) (time.Time, error) {
    formats := []string{
        "2006-01-02T15:04:05Z",        // ISO dengan timezone Z
        "2006-01-02T15:04:05.000Z",    // ISO dengan millisecond
        "2006-01-02T15:04:05",         // ISO tanpa timezone
        "2006-01-02 15:04:05",         // Standard datetime
        "2006-01-02",                  // Date only
    }
    
    for _, format := range formats {
        if t, err := time.Parse(format, dateStr); err == nil {
            return t, nil
        }
    }
    
    return time.Time{}, fmt.Errorf("cannot parse date: %s", dateStr)
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

func GetUjianTerlewat(db *sql.DB) (models.ResponseUjianTerlewat, error) {
    result := models.ResponseUjianTerlewat{
        X:   []models.UjianTerlewat{},
        XI:  []models.UjianTerlewat{},
        XII: []models.UjianTerlewat{},
    }

    now := time.Now().In(time.Local)
    
    startDate := now.AddDate(0, 0, -7).Format("2006-01-02")
    endDate := now.Format("2006-01-02")

    query := `
        SELECT 
            j.tanggal,
            j.tingkat,
            s.id as sesi_id,
            s.sesi,
            s."jamMulai" as sesi_jam_mulai,
            s."jamSelesai" as sesi_jam_selesai,
            u.id as ujian_id,
            u."jamMulai" as ujian_jam_mulai,
            u."jamSelesai" as ujian_jam_selesai,
            u.status,
            mp.pelajaran
        FROM jadwal j
        JOIN sesi s ON j.id = s."jadwalId"
        JOIN ujian u ON s.id = u."sesiId"
        JOIN mata_pelajaran mp ON u."mataPelajaranId" = mp.id
        WHERE 
            DATE(j.tanggal) >= $1 
            AND DATE(j.tanggal) <= $2
        ORDER BY j.tanggal DESC, j.tingkat, s.sesi, u."jamMulai"
    `

    log.Printf("DEBUG: Executing main query...")
    rows, err := db.Query(query, startDate, endDate)
    if err != nil {
        log.Printf("DEBUG: Error in main query: %v", err)
        return result, fmt.Errorf("error querying ujian: %v", err)
    }
    defer rows.Close()

    ujianGrouped := make(map[string]map[string][]UjianData)
    totalRows := 0

    for rows.Next() {
        totalRows++
        var tanggalRaw, tingkatStr, sesiID, pelajaran, ujianID string
        var sesi int
        var sesiJamMulai, sesiJamSelesai, ujianJamMulai, ujianJamSelesai, status sql.NullString

        err := rows.Scan(
            &tanggalRaw, &tingkatStr, &sesiID, &sesi,
            &sesiJamMulai, &sesiJamSelesai,
            &ujianID, &ujianJamMulai, &ujianJamSelesai, &status,
            &pelajaran,
        )
        if err != nil {
            log.Printf("DEBUG: Error scanning row %d: %v", totalRows, err)
            continue
        }

        tanggal, err := parseFlexibleDate(tanggalRaw)
        if err != nil {
            log.Printf("DEBUG: Error parsing date %s: %v", tanggalRaw, err)
            continue
        }

        tanggalStr := tanggal.Format("2006-01-02")
        tingkatKey := tingkatStr
        tanggalKey := tanggalStr
        
        if ujianGrouped[tingkatKey] == nil {
            ujianGrouped[tingkatKey] = make(map[string][]UjianData)
        }
        
        ujianData := UjianData{
            Tanggal:         tanggal,
            TingkatStr:      tingkatStr,
            SesiID:          sesiID,
            Sesi:            sesi,
            SesiJamMulai:    sesiJamMulai.String,
            SesiJamSelesai:  sesiJamSelesai.String,
            UjianID:         ujianID,
            UjianJamMulai:   ujianJamMulai.String,
            UjianJamSelesai: ujianJamSelesai.String,
            Status:          status.String,
            Pelajaran:       pelajaran,
        }
        
        ujianGrouped[tingkatKey][tanggalKey] = append(ujianGrouped[tingkatKey][tanggalKey], ujianData)
    }


    currentTrackingData, err := GetJadwalUjian(db)
    if err != nil {
        log.Printf("DEBUG: Error getting current tracking data: %v", err)
        return result, nil
    }

    for tingkatStr, tanggalMap := range ujianGrouped {
        tingkat := models.Tingkat(tingkatStr)
        
        for tanggalStr, ujianList := range tanggalMap {
            tanggal, _ := parseFlexibleDate(tanggalStr + "T00:00:00Z")
            
            ujianTerlewat := processUjianForDate(db, now, tanggal, ujianList, currentTrackingData, tingkat)
            switch tingkat {
            case models.TingkatX:
                result.X = append(result.X, ujianTerlewat...)
            case models.TingkatXI:
                result.XI = append(result.XI, ujianTerlewat...)
            case models.TingkatXII:
                result.XII = append(result.XII, ujianTerlewat...)
            default:
            }
        }
    }

    return result, nil
}

type UjianData struct {
    Tanggal         time.Time
    TingkatStr      string
    SesiID          string
    Sesi            int
    SesiJamMulai    string
    SesiJamSelesai  string
    UjianID         string
    UjianJamMulai   string
    UjianJamSelesai string
    Status          string
    Pelajaran       string
}

func processUjianForDate(db *sql.DB, now time.Time, tanggal time.Time, ujianList []UjianData, 
    currentTrackingData map[models.Tingkat][]models.TingkatData, tingkat models.Tingkat) []models.UjianTerlewat {
    
    var result []models.UjianTerlewat
    
    sesiMap := make(map[int][]UjianData)
    for _, ujian := range ujianList {
        sesiMap[ujian.Sesi] = append(sesiMap[ujian.Sesi], ujian)
    }
    
    var sesiNumbers []int
    for sesi := range sesiMap {
        sesiNumbers = append(sesiNumbers, sesi)
    }
    sort.Ints(sesiNumbers)
    
    if !isToday(now, tanggal) {
        for _, sesi := range sesiNumbers {
            ujianInSesi := sesiMap[sesi]
            var ujianTerlewatDetail []models.UjianTerlewatDetail
            
            for _, ujian := range ujianInSesi {
                if isUjianSelesai(now, tanggal, ujian) {
                    ujianTerlewatDetail = append(ujianTerlewatDetail, models.UjianTerlewatDetail{
                        ID:        ujian.UjianID,
                        Pelajaran: ujian.Pelajaran,
                        Tingkat:   ujian.TingkatStr,
                    })
                }
            }
            
            if len(ujianTerlewatDetail) > 0 {
                result = append(result, models.UjianTerlewat{
                    ID:    ujianInSesi[0].SesiID,
                    Sesi:  sesi,
                    Ujian: ujianTerlewatDetail,
                })
            }
        }
        return result
    }
    
    sesiTransisiInfo := analyzeSesiTransition(ujianList, now)
    
    for _, sesi := range sesiNumbers {
        ujianInSesi := sesiMap[sesi]
        isSesiMasihTampil := isSesiStillDisplayed(sesi, sesiTransisiInfo, ujianInSesi, now)
        
        if !isSesiMasihTampil {
            var ujianTerlewatDetail []models.UjianTerlewatDetail
            
            for _, ujian := range ujianInSesi {
                if isUjianSelesai(now, tanggal, ujian) {
                    ujianTerlewatDetail = append(ujianTerlewatDetail, models.UjianTerlewatDetail{
                        ID:        ujian.UjianID,
                        Pelajaran: ujian.Pelajaran,
                        Tingkat:   ujian.TingkatStr,
                    })
                }
            }
            
            if len(ujianTerlewatDetail) > 0 {
                result = append(result, models.UjianTerlewat{
                    ID:    ujianInSesi[0].SesiID,
                    Sesi:  sesi,
                    Ujian: ujianTerlewatDetail,
                })
            }
        } else {
        }
    }
    
    return result
}

type SesiTransitionInfo struct {
    SesiAktifIndex       int    // Index sesi yang sedang aktif (-1 jika tidak ada)
    SesiBerikutnyaIndex  int    // Index sesi berikutnya (-1 jika tidak ada)
    SesiTerakhirIndex    int    // Index sesi terakhir yang sudah selesai (-1 jika tidak ada)
    IsLastSession        bool   // Apakah sesi terakhir adalah sesi final hari itu
    SesiNumbers          []int  // Semua nomor sesi yang tersedia
    SesiDataMap          map[int][]UjianData // Map sesi ke data ujian
}

func analyzeSesiTransition(ujianList []UjianData, now time.Time) SesiTransitionInfo {
    info := SesiTransitionInfo{
        SesiAktifIndex:      -1,
        SesiBerikutnyaIndex: -1,
        SesiTerakhirIndex:   -1,
        IsLastSession:       false,
        SesiNumbers:         []int{},
        SesiDataMap:         make(map[int][]UjianData),
    }
    
    sesiMap := make(map[int][]UjianData)
    for _, ujian := range ujianList {
        sesiMap[ujian.Sesi] = append(sesiMap[ujian.Sesi], ujian)
    }
    
    var sesiNumbers []int
    for sesi := range sesiMap {
        sesiNumbers = append(sesiNumbers, sesi)
    }
    sort.Ints(sesiNumbers)
    
    info.SesiNumbers = sesiNumbers
    info.SesiDataMap = sesiMap
    
    if len(sesiNumbers) == 0 {
        return info
    }
    
    for i, sesi := range sesiNumbers {
        ujianInSesi := sesiMap[sesi]
        if len(ujianInSesi) == 0 {
            continue
        }
        
        sesiMulai, errMulai := parseTime(ujianInSesi[0].SesiJamMulai)
        sesiSelesai, errSelesai := parseTime(ujianInSesi[0].SesiJamSelesai)
        
        if errMulai != nil || errSelesai != nil {
            continue
        }
        
  
        if now.After(sesiMulai) && now.Before(sesiSelesai) {
            info.SesiAktifIndex = i
        } else if now.Before(sesiMulai) {
            if info.SesiBerikutnyaIndex == -1 {
                info.SesiBerikutnyaIndex = i
            }
        } else if now.After(sesiSelesai) {
            info.SesiTerakhirIndex = i
        }
    }
    
    if info.SesiTerakhirIndex != -1 {
        info.IsLastSession = (info.SesiTerakhirIndex == len(sesiNumbers)-1)
    }
    
    return info
}

func isSesiStillDisplayed(sesiNumber int, transisiInfo SesiTransitionInfo, ujianInSesi []UjianData, now time.Time) bool {
    if len(ujianInSesi) == 0 {
        return false
    }
    sesiIndex := -1
    for i, s := range transisiInfo.SesiNumbers {
        if s == sesiNumber {
            sesiIndex = i
            break
        }
    }
    if sesiIndex == -1 {
        return false
    }
    if transisiInfo.SesiAktifIndex != -1 {
        return sesiIndex == transisiInfo.SesiAktifIndex
    }
    if transisiInfo.SesiBerikutnyaIndex != -1 {
        sesiBerikutnya := transisiInfo.SesiNumbers[transisiInfo.SesiBerikutnyaIndex]
        ujianSesiBerikutnya := transisiInfo.SesiDataMap[sesiBerikutnya]
        if len(ujianSesiBerikutnya) > 0 {
            sesiBerikutnyaMulai, err := parseTime(ujianSesiBerikutnya[0].SesiJamMulai)
            if err != nil {
                return false
            }
            sisaWaktuKeSesiBerikutnya := int(math.Ceil(sesiBerikutnyaMulai.Sub(now).Minutes()))
            if sisaWaktuKeSesiBerikutnya <= 5 {
                return sesiIndex == transisiInfo.SesiBerikutnyaIndex
            } else if transisiInfo.SesiTerakhirIndex != -1 && sesiIndex == transisiInfo.SesiTerakhirIndex {
                if transisiInfo.IsLastSession {
                    sesiSelesai, err := parseTime(ujianInSesi[0].SesiJamSelesai)
                    if err != nil {
                        return false
                    }
                    
                    menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
                    return menitSetelahSelesai <= 120 
                } else {
                    return sisaWaktuKeSesiBerikutnya > 5
                }
            }
        }
    } else if transisiInfo.SesiTerakhirIndex != -1 && sesiIndex == transisiInfo.SesiTerakhirIndex {
        if transisiInfo.IsLastSession {
            sesiSelesai, err := parseTime(ujianInSesi[0].SesiJamSelesai)
            if err != nil {
                return false
            }
            
            menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
            return menitSetelahSelesai <= 120 }
    }
    return false
}

func isUjianSelesai(now time.Time, tanggal time.Time, ujian UjianData) bool {
    if ujian.Status == "selesai" {
        return true
    }
    if !isToday(now, tanggal) {
        return true
    }
    if ujian.UjianJamSelesai == "" {
        return false
    }
    
    ujianSelesai, err := parseTime(ujian.UjianJamSelesai)
    if err != nil {
        return false
    }
    
    isFinished := now.After(ujianSelesai)
    log.Printf("DEBUG: Ujian %s - end time: %s, current: %s, finished: %t", 
        ujian.UjianID, ujianSelesai.Format("15:04:05"), now.Format("15:04:05"), isFinished)
    
    return isFinished
}

func isToday(now time.Time, tanggalUjian time.Time) bool {
    return now.Year() == tanggalUjian.Year() &&
        now.Month() == tanggalUjian.Month() &&
        now.Day() == tanggalUjian.Day()
}