// repositories/ujian_repository.go
package repositories

import (
	"backend/models"
	"database/sql"
	"fmt"
	"log"
	"sort"
	"time"
)

// GetJadwalUjian mengambil jadwal ujian untuk 3 hari ke depan
func GetJadwalUjian(db *sql.DB) (map[models.Tingkat][]models.TingkatData, error) {
    // Inisialisasi hasil
    result := make(map[models.Tingkat][]models.TingkatData)
    
    // Tanggal hari ini
    today := time.Now()
    
    // Query untuk mendapatkan jadwal dari hari ini sampai 3 hari ke depan
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
    
    // Maps untuk melacak jadwal yang sudah diproses berdasarkan tingkat dan tanggal
    jadwalMap := make(map[string]*models.TingkatData)
    // Maps untuk melacak sesi berdasarkan ID sesi
    sesiMap := make(map[string]*models.SesiData)
    // Maps untuk melacak tingkat dan tanggal yang ada
    tingkatTanggalMap := make(map[models.Tingkat]map[string]bool)
    
    // Iterasi hasil query
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
        
        // Konversi string ke enum Tingkat
        tingkat := models.Tingkat(tingkatStr)
        
        // Format tanggal
        tanggalStr := tanggal.Format("2006-01-02")
        
        // Hitung sisa hari
        sisaHari := int(tanggal.Sub(today).Hours() / 24)
        if sisaHari < 0 {
            sisaHari = 0
        }
        
        // Cek apakah tingkat sudah ada di map
        if _, exists := tingkatTanggalMap[tingkat]; !exists {
            tingkatTanggalMap[tingkat] = make(map[string]bool)
        }
        
        // Cek apakah jadwal untuk tingkat dan tanggal ini sudah ada
        jadwalKey := fmt.Sprintf("%s_%s", tanggalStr, tingkat)
        tingkatData, exist := jadwalMap[jadwalKey]
        if !exist {
            // Buat TingkatData baru
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
        
        // Cek apakah sesi sudah ada berdasarkan ID sesi
        sesiData, sesiExist := sesiMap[sesiID]
        if !sesiExist {
            // Konversi nilai nullable ke string kosong jika NULL
            jamMulai := ""
            if sesiJamMulai.Valid {
                jamMulai = sesiJamMulai.String
            }
            
            jamSelesai := ""
            if sesiJamSelesai.Valid {
                jamSelesai = sesiJamSelesai.String
            }
            
            // Buat SesiData baru
            newSesiData := models.SesiData{
                ID:                    sesiID,
                IsSesi:                sesiNum,
                JamMulai:              jamMulai,
                JamSelesai:            jamSelesai,
                HitungMundurSesiAktif: false, // akan dihitung nanti
                SisaWaktuSesi:         0,     // akan dihitung nanti
                AdaSesiBerikutnya:     false, // akan dihitung nanti
                Ujian:                 []models.UjianData{},
            }
            sesiData = &newSesiData
            sesiMap[sesiID] = sesiData
            
            // Tambahkan sesi ke tingkat data
            tingkatData.SesiUjian = append(tingkatData.SesiUjian, *sesiData)
        }
        
        // Buat ujian data
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
            UjianBerikutnyaAda: false, // akan dihitung nanti
            HitungMundurAktif:  false, // akan dihitung nanti
            SisaWaktuMulai:     0,     // akan dihitung nanti
            WaktuPengerjaan:    waktuPengerjaanInt,
        }
        
        // Tambahkan ujian ke sesi
        sesiData.Ujian = append(sesiData.Ujian, ujianData)
        
        // Update sesi di tingkat data
        // Cari indeks sesi yang perlu diupdate
        for i, s := range tingkatData.SesiUjian {
            if s.ID == sesiID {
                tingkatData.SesiUjian[i].Ujian = sesiData.Ujian
                break
            }
        }
    }
    
    // Finalisasi hasil dengan menyusun data berdasarkan tingkat
    for tingkat, tanggalMap := range tingkatTanggalMap {
        var tingkatDataArr []models.TingkatData
        
        // Urutkan tanggal
        var tanggalKeys []string
        for tanggal := range tanggalMap {
            tanggalKeys = append(tanggalKeys, tanggal)
        }
        sort.Strings(tanggalKeys)
        
        // Susun TingkatData berdasarkan tanggal
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



// PERBAIKAN: Fungsi untuk parse tanggal yang fleksibel
func parseFlexibleDate(dateStr string) (time.Time, error) {
    // Format yang mungkin diterima dari database
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

// PERBAIKAN: Update bagian parsing dalam GetUjianTerlewat
func GetUjianTerlewat(db *sql.DB) (models.ResponseUjianTerlewat, error) {
    result := models.ResponseUjianTerlewat{
        X:   []models.UjianTerlewat{},
        XI:  []models.UjianTerlewat{},
        XII: []models.UjianTerlewat{},
    }

    now := time.Now().In(time.Local)
    
    startDate := now.AddDate(0, 0, -7).Format("2006-01-02")
    endDate := now.Format("2006-01-02")
    
    log.Printf("DEBUG: Query parameters - startDate: %s, endDate: %s, currentTime: %s", 
        startDate, endDate, now.Format("15:04:05"))

    // Query untuk mengambil data ujian
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

        // Parse tanggal dengan fungsi yang fleksibel
        tanggal, err := parseFlexibleDate(tanggalRaw)
        if err != nil {
            log.Printf("DEBUG: Error parsing date %s: %v", tanggalRaw, err)
            continue
        }

        // Format ke string untuk konsistensi
        tanggalStr := tanggal.Format("2006-01-02")

        log.Printf("DEBUG: Row %d - tanggalRaw: %s, tanggalParsed: %s, tingkat: %s, sesi: %d, pelajaran: %s, status: %s", 
            totalRows, tanggalRaw, tanggalStr, tingkatStr, sesi, pelajaran, status.String)

        // Group data by tingkat and tanggal
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

    log.Printf("DEBUG: Total rows scanned: %d", totalRows)
    log.Printf("DEBUG: Grouped data - tingkat count: %d", len(ujianGrouped))

    // Ambil data tracking saat ini - PENTING untuk logika ujian terlewat
    currentTrackingData, err := GetJadwalUjian(db)
    if err != nil {
        log.Printf("DEBUG: Error getting current tracking data: %v", err)
        // Jika tidak bisa ambil data tracking, return empty result untuk safety
        return result, nil
    }

    // Process each tingkat and tanggal
    for tingkatStr, tanggalMap := range ujianGrouped {
        log.Printf("DEBUG: Processing tingkat: %s with %d dates", tingkatStr, len(tanggalMap))
        tingkat := models.Tingkat(tingkatStr)
        
        for tanggalStr, ujianList := range tanggalMap {
            tanggal, _ := parseFlexibleDate(tanggalStr + "T00:00:00Z")
            log.Printf("DEBUG: Processing date: %s with %d ujian", tanggalStr, len(ujianList))
            
            ujianTerlewat := processUjianForDate(db, now, tanggal, ujianList, currentTrackingData, tingkat)
            log.Printf("DEBUG: Found %d ujian terlewat for date %s, tingkat %s", 
                len(ujianTerlewat), tanggalStr, tingkatStr)
            
            // Tambahkan ke result berdasarkan tingkat
            switch tingkat {
            case models.TingkatX:
                result.X = append(result.X, ujianTerlewat...)
                log.Printf("DEBUG: Added %d ujian terlewat to tingkat X", len(ujianTerlewat))
            case models.TingkatXI:
                result.XI = append(result.XI, ujianTerlewat...)
                log.Printf("DEBUG: Added %d ujian terlewat to tingkat XI", len(ujianTerlewat))
            case models.TingkatXII:
                result.XII = append(result.XII, ujianTerlewat...)
                log.Printf("DEBUG: Added %d ujian terlewat to tingkat XII", len(ujianTerlewat))
            default:
                log.Printf("DEBUG: Unknown tingkat: %s", tingkatStr)
            }
        }
    }

    log.Printf("DEBUG: Final result - X: %d, XI: %d, XII: %d", 
        len(result.X), len(result.XI), len(result.XII))
    return result, nil
}

// Struct untuk data ujian
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

// PERBAIKAN UTAMA: Fungsi untuk memproses ujian pada tanggal tertentu
func processUjianForDate(db *sql.DB, now time.Time, tanggal time.Time, ujianList []UjianData, 
    currentTrackingData map[models.Tingkat][]models.TingkatData, tingkat models.Tingkat) []models.UjianTerlewat {
    
    var result []models.UjianTerlewat
    
    log.Printf("DEBUG: Processing %d ujian for date %s", len(ujianList), tanggal.Format("2006-01-02"))
    
    // Group ujian by sesi
    sesiMap := make(map[int][]UjianData)
    for _, ujian := range ujianList {
        sesiMap[ujian.Sesi] = append(sesiMap[ujian.Sesi], ujian)
    }
    
    log.Printf("DEBUG: Grouped into %d sesi", len(sesiMap))
    
    // Get sorted sesi numbers
    var sesiNumbers []int
    for sesi := range sesiMap {
        sesiNumbers = append(sesiNumbers, sesi)
    }
    sort.Ints(sesiNumbers)
    
    log.Printf("DEBUG: Sesi numbers: %v", sesiNumbers)
    
    // Jika bukan hari ini, semua ujian yang sudah selesai dianggap terlewat
    if !isToday(now, tanggal) {
        log.Printf("DEBUG: Processing past date: %s", tanggal.Format("2006-01-02"))
        for _, sesi := range sesiNumbers {
            ujianInSesi := sesiMap[sesi]
            var ujianTerlewatDetail []models.UjianTerlewatDetail
            
            for _, ujian := range ujianInSesi {
                if isUjianSelesai(now, tanggal, ujian) {
                    log.Printf("DEBUG: Past date ujian found - ID: %s, Pelajaran: %s", ujian.UjianID, ujian.Pelajaran)
                    ujianTerlewatDetail = append(ujianTerlewatDetail, models.UjianTerlewatDetail{
                        ID:        ujian.UjianID,
                        Pelajaran: ujian.Pelajaran,
                        Tingkat:   ujian.TingkatStr,
                    })
                }
            }
            
            if len(ujianTerlewatDetail) > 0 {
                log.Printf("DEBUG: Adding %d ujian terlewat from sesi %d (past date)", len(ujianTerlewatDetail), sesi)
                result = append(result, models.UjianTerlewat{
                    ID:    ujianInSesi[0].SesiID,
                    Sesi:  sesi,
                    Ujian: ujianTerlewatDetail,
                })
            }
        }
        return result
    }
    
    log.Printf("DEBUG: Processing today's date")
    
    // LOGIKA UTAMA: Untuk hari ini, ambil sesi yang SEDANG DITAMPILKAN dari tracking
    displayedSesiInfo := getDisplayedSesiFromTracking(currentTrackingData, tingkat, tanggal)
    
    log.Printf("DEBUG: Displayed sesi info: %+v", displayedSesiInfo)
    
    // Cek setiap sesi untuk ujian terlewat
    for _, sesi := range sesiNumbers {
        ujianInSesi := sesiMap[sesi]
        
        // KUNCI UTAMA: Cek apakah sesi ini sedang ditampilkan di tracking
        isSesiDisplayed := isSesiCurrentlyDisplayed(sesi, displayedSesiInfo)
        
        log.Printf("DEBUG: Sesi %d - isDisplayed: %t", sesi, isSesiDisplayed)
        
        // Jika sesi TIDAK sedang ditampilkan DAN sudah selesai, ambil ujian terlewat
        if !isSesiDisplayed {
            var ujianTerlewatDetail []models.UjianTerlewatDetail
            
            for _, ujian := range ujianInSesi {
                if isUjianSelesai(now, tanggal, ujian) {
                    log.Printf("DEBUG: Adding ujian terlewat - ID: %s, Pelajaran: %s, Sesi: %d", 
                        ujian.UjianID, ujian.Pelajaran, sesi)
                    ujianTerlewatDetail = append(ujianTerlewatDetail, models.UjianTerlewatDetail{
                        ID:        ujian.UjianID,
                        Pelajaran: ujian.Pelajaran,
                        Tingkat:   ujian.TingkatStr,
                    })
                }
            }
            
            if len(ujianTerlewatDetail) > 0 {
                log.Printf("DEBUG: Adding ujian terlewat from sesi %d (not displayed)", sesi)
                result = append(result, models.UjianTerlewat{
                    ID:    ujianInSesi[0].SesiID,
                    Sesi:  sesi,
                    Ujian: ujianTerlewatDetail,
                })
            }
        } else {
            log.Printf("DEBUG: Sesi %d is still displayed, skipping ujian terlewat check", sesi)
        }
    }
    
    return result
}

// PERBAIKAN: Struktur untuk menyimpan info sesi yang ditampilkan
type DisplayedSesiInfo struct {
    SesiNumbers      []int  // Nomor sesi yang sedang ditampilkan
    TampilkanUjian   bool   // Apakah ujian sedang ditampilkan
}

// PERBAIKAN: Fungsi untuk mendapatkan sesi yang sedang ditampilkan dari data tracking
func getDisplayedSesiFromTracking(currentTrackingData map[models.Tingkat][]models.TingkatData, 
    tingkat models.Tingkat, tanggal time.Time) DisplayedSesiInfo {
    
    info := DisplayedSesiInfo{
        SesiNumbers:    []int{},
        TampilkanUjian: false,
    }
    
    if currentTrackingData == nil {
        log.Printf("DEBUG: No current tracking data available")
        return info
    }
    
    tingkatData, exists := currentTrackingData[tingkat]
    if !exists {
        log.Printf("DEBUG: No tracking data for tingkat %s", tingkat)
        return info
    }
    
    todayStr := tanggal.Format("2006-01-02")
    
    // Cari data untuk tanggal yang sesuai
    for _, data := range tingkatData {
        if data.Tanggal == todayStr {
            log.Printf("DEBUG: Found tracking data for date %s, tingkat %s", todayStr, tingkat)
            
            // Ambil sesi yang sedang ditampilkan berdasarkan tampilkanUjian
            for _, sesi := range data.SesiUjian {
                if sesi.TampilkanUjian {
                    info.SesiNumbers = append(info.SesiNumbers, sesi.IsSesi)
                    info.TampilkanUjian = true
                    log.Printf("DEBUG: Sesi %d is currently displayed (tampilkanUjian: true)", sesi.IsSesi)
                }
            }
            break
        }
    }
    
    log.Printf("DEBUG: Final displayed sesi info - numbers: %v, tampilkanUjian: %t", 
        info.SesiNumbers, info.TampilkanUjian)
    
    return info
}

// PERBAIKAN: Fungsi untuk mengecek apakah sesi sedang ditampilkan
func isSesiCurrentlyDisplayed(sesiNumber int, displayedInfo DisplayedSesiInfo) bool {
    if !displayedInfo.TampilkanUjian {
        return false
    }
    
    for _, displayedSesi := range displayedInfo.SesiNumbers {
        if sesiNumber == displayedSesi {
            return true
        }
    }
    
    return false
}

// Fungsi untuk mengecek apakah ujian sudah selesai
func isUjianSelesai(now time.Time, tanggal time.Time, ujian UjianData) bool {
    // Jika status sudah selesai
    if ujian.Status == "selesai" {
        log.Printf("DEBUG: Ujian %s marked as 'selesai'", ujian.UjianID)
        return true
    }
    
    // Jika bukan hari ini dan waktu sudah lewat
    if !isToday(now, tanggal) {
        log.Printf("DEBUG: Ujian %s on past date %s", ujian.UjianID, tanggal.Format("2006-01-02"))
        return true
    }
    
    // Untuk hari ini, cek berdasarkan waktu
    if ujian.UjianJamSelesai == "" {
        log.Printf("DEBUG: Ujian %s has no end time", ujian.UjianID)
        return false
    }
    
    ujianSelesai, err := parseTimeToday(now, ujian.UjianJamSelesai)
    if err != nil {
        log.Printf("DEBUG: Cannot parse end time for ujian %s: %v", ujian.UjianID, err)
        return false
    }
    
    isFinished := now.After(ujianSelesai)
    log.Printf("DEBUG: Ujian %s - end time: %s, current: %s, finished: %t", 
        ujian.UjianID, ujianSelesai.Format("15:04:05"), now.Format("15:04:05"), isFinished)
    
    return isFinished
}

// Fungsi helper
func isToday(now time.Time, tanggalUjian time.Time) bool {
    return now.Year() == tanggalUjian.Year() &&
        now.Month() == tanggalUjian.Month() &&
        now.Day() == tanggalUjian.Day()
}

func parseTimeToday(now time.Time, timeStr string) (time.Time, error) {
    var t time.Time
    var err error
    
    // Coba parse dengan format HH:MM:SS
    t, err = time.Parse("15:04:05", timeStr)
    if err != nil {
        // Jika gagal, coba dengan format HH:MM
        t, err = time.Parse("15:04", timeStr)
        if err != nil {
            return time.Time{}, fmt.Errorf("cannot parse time %s: %v", timeStr, err)
        }
    }
    
    return time.Date(now.Year(), now.Month(), now.Day(), 
        t.Hour(), t.Minute(), t.Second(), 0, time.Local), nil
}