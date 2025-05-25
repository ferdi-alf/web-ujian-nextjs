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

// parseTime membantu parsing waktu - sama dengan di ujian tracker
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
    
    // LOGIKA UTAMA: Untuk hari ini, gunakan logika transisi sesi yang sama dengan ujian tracker
    sesiTransisiInfo := analyzeSesiTransition(ujianList, now)
    
    log.Printf("DEBUG: Sesi transition info: %+v", sesiTransisiInfo)
    
    // Cek setiap sesi untuk ujian terlewat
    for _, sesi := range sesiNumbers {
        ujianInSesi := sesiMap[sesi]
        
        // KUNCI UTAMA: Cek apakah sesi ini masih dalam masa tampil berdasarkan logika transisi
        isSesiMasihTampil := isSesiStillDisplayed(sesi, sesiTransisiInfo, ujianInSesi, now)
        
        log.Printf("DEBUG: Sesi %d - masih tampil: %t", sesi, isSesiMasihTampil)
        
        // Jika sesi TIDAK tampil lagi DAN sudah selesai, ambil ujian terlewat
        if !isSesiMasihTampil {
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
                log.Printf("DEBUG: Adding ujian terlewat from sesi %d (not displayed anymore)", sesi)
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

// PERBAIKAN: Struktur untuk menyimpan info transisi sesi
type SesiTransitionInfo struct {
    SesiAktifIndex       int    // Index sesi yang sedang aktif (-1 jika tidak ada)
    SesiBerikutnyaIndex  int    // Index sesi berikutnya (-1 jika tidak ada)
    SesiTerakhirIndex    int    // Index sesi terakhir yang sudah selesai (-1 jika tidak ada)
    IsLastSession        bool   // Apakah sesi terakhir adalah sesi final hari itu
    SesiNumbers          []int  // Semua nomor sesi yang tersedia
    SesiDataMap          map[int][]UjianData // Map sesi ke data ujian
}

// PERBAIKAN: Fungsi untuk menganalisis transisi sesi (sama logika dengan ujian tracker)
func analyzeSesiTransition(ujianList []UjianData, now time.Time) SesiTransitionInfo {
    info := SesiTransitionInfo{
        SesiAktifIndex:      -1,
        SesiBerikutnyaIndex: -1,
        SesiTerakhirIndex:   -1,
        IsLastSession:       false,
        SesiNumbers:         []int{},
        SesiDataMap:         make(map[int][]UjianData),
    }
    
    // Group by sesi
    sesiMap := make(map[int][]UjianData)
    for _, ujian := range ujianList {
        sesiMap[ujian.Sesi] = append(sesiMap[ujian.Sesi], ujian)
    }
    
    // Get sorted sesi numbers
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
    
    // Analisis status setiap sesi
    for i, sesi := range sesiNumbers {
        ujianInSesi := sesiMap[sesi]
        if len(ujianInSesi) == 0 {
            continue
        }
        
        // Ambil waktu sesi dari ujian pertama (asumsi semua ujian dalam sesi sama)
        sesiMulai, errMulai := parseTime(ujianInSesi[0].SesiJamMulai)
        sesiSelesai, errSelesai := parseTime(ujianInSesi[0].SesiJamSelesai)
        
        if errMulai != nil || errSelesai != nil {
            continue
        }
        
        log.Printf("DEBUG: Analyzing sesi %d: mulai=%s, selesai=%s, now=%s", 
            sesi, sesiMulai.Format("15:04"), sesiSelesai.Format("15:04"), now.Format("15:04"))
        
        // Cek status sesi
        if now.After(sesiMulai) && now.Before(sesiSelesai) {
            // Sesi sedang aktif
            info.SesiAktifIndex = i
            log.Printf("DEBUG: Sesi %d is currently active", sesi)
        } else if now.Before(sesiMulai) {
            // Sesi belum mulai
            if info.SesiBerikutnyaIndex == -1 {
                info.SesiBerikutnyaIndex = i
                log.Printf("DEBUG: Sesi %d is next session", sesi)
            }
        } else if now.After(sesiSelesai) {
            // Sesi sudah selesai
            info.SesiTerakhirIndex = i
            log.Printf("DEBUG: Sesi %d is finished", sesi)
        }
    }
    
    // Tentukan apakah sesi terakhir adalah sesi final
    if info.SesiTerakhirIndex != -1 {
        info.IsLastSession = (info.SesiTerakhirIndex == len(sesiNumbers)-1)
        log.Printf("DEBUG: Last session index: %d, is final session: %t", 
            info.SesiTerakhirIndex, info.IsLastSession)
    }
    
    return info
}

// PERBAIKAN: Fungsi untuk mengecek apakah sesi masih ditampilkan (logika sama dengan ujian tracker)
func isSesiStillDisplayed(sesiNumber int, transisiInfo SesiTransitionInfo, ujianInSesi []UjianData, now time.Time) bool {
    if len(ujianInSesi) == 0 {
        return false
    }
    
    // Cari index sesi ini
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
    
    // Jika ada sesi aktif, hanya sesi aktif yang tampil
    if transisiInfo.SesiAktifIndex != -1 {
        return sesiIndex == transisiInfo.SesiAktifIndex
    }
    
    // Jika tidak ada sesi aktif tapi ada sesi berikutnya
    if transisiInfo.SesiBerikutnyaIndex != -1 {
        sesiBerikutnya := transisiInfo.SesiNumbers[transisiInfo.SesiBerikutnyaIndex]
        ujianSesiBerikutnya := transisiInfo.SesiDataMap[sesiBerikutnya]
        
        if len(ujianSesiBerikutnya) > 0 {
            sesiBerikutnyaMulai, err := parseTime(ujianSesiBerikutnya[0].SesiJamMulai)
            if err != nil {
                return false
            }
            
            sisaWaktuKeSesiBerikutnya := int(math.Ceil(sesiBerikutnyaMulai.Sub(now).Minutes()))
            
            // LOGIKA KUNCI: Sama dengan ujian tracker
            if sisaWaktuKeSesiBerikutnya <= 5 {
                // Kurang dari 5 menit ke sesi berikutnya, tampilkan sesi berikutnya
                return sesiIndex == transisiInfo.SesiBerikutnyaIndex
            } else if transisiInfo.SesiTerakhirIndex != -1 && sesiIndex == transisiInfo.SesiTerakhirIndex {
                // Lebih dari 5 menit, tampilkan sesi terakhir yang sudah selesai
                if transisiInfo.IsLastSession {
                    // Sesi terakhir adalah sesi final, tampilkan selama 2 jam
                    sesiSelesai, err := parseTime(ujianInSesi[0].SesiJamSelesai)
                    if err != nil {
                        return false
                    }
                    
                    menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
                    return menitSetelahSelesai <= 120 // 2 jam
                } else {
                    // Sesi terakhir bukan sesi final, tampilkan sampai 5 menit sebelum sesi berikutnya
                    return sisaWaktuKeSesiBerikutnya > 5
                }
            }
        }
    } else if transisiInfo.SesiTerakhirIndex != -1 && sesiIndex == transisiInfo.SesiTerakhirIndex {
        // Tidak ada sesi berikutnya, cek sesi terakhir
        if transisiInfo.IsLastSession {
            // Sesi terakhir adalah sesi final, tampilkan selama 2 jam
            sesiSelesai, err := parseTime(ujianInSesi[0].SesiJamSelesai)
            if err != nil {
                return false
            }
            
            menitSetelahSelesai := int(now.Sub(sesiSelesai).Minutes())
            return menitSetelahSelesai <= 120 // 2 jam
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
    
    ujianSelesai, err := parseTime(ujian.UjianJamSelesai)
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