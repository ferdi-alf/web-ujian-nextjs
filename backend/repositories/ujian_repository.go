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