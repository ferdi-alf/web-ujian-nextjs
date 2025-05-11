package handlers

import (
	"backend/models"
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

type UjianHandler struct {
	DB *sql.DB
}

type UjianDashboardData struct {
    Type           string      `json:"type"`
	HasUpcomingExam bool        `json:"hasUpcomingExam"`
	DaysUntil      int         `json:"daysUntil"`
	FirstExamDate  string      `json:"firstExamDate,omitempty"`
	CurrentSession *SessionData `json:"currentSession,omitempty"`
	NextSession    *SessionData `json:"nextSession,omitempty"`
	ExamData       *ExamData    `json:"examData,omitempty"`
}

type SessionData struct {
	Sesi      int       `json:"sesi"`
	JamMulai  string    `json:"jamMulai"`
	JamSelesai string   `json:"jamSelesai"`
	Tanggal   time.Time `json:"tanggal"`
	CountDown int       `json:"countDown"` // dalam menit
}

// ExamData menyimpan data ujian per tingkat
type ExamData struct {
	X  []ExamDetails `json:"X"`
	XI []ExamDetails `json:"XI"`
	XII []ExamDetails `json:"XII"`
}

// ExamDetails menyimpan detail tiap ujian
type ExamDetails struct {
	ID             string `json:"id"`
	MataPelajaran  string `json:"mataPelajaran"`
	Status         string `json:"status"`
	JamMulai       string `json:"jamMulai"`
	JamSelesai     string `json:"jamSelesai"`
	CountDownMenit int    `json:"countDownMenit,omitempty"`
}

var (
    ujianClients = make(map[*websocket.Conn] bool)
    ujianRegister = make(chan *websocket.Conn)
    ujianUnregister = make(chan *websocket.Conn)
	ujianBroadcast = make(chan *UjianDashboardData)
	ujianMutex     = sync.Mutex{}
)

func NewUjianHandler(db *sql.DB) *UjianHandler {
	return &UjianHandler{DB: db}
}

func SetupWebSocketUjian(app *fiber.App, db *sql.DB) {
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws/api/data-ujian", websocket.New(func(c *websocket.Conn) {
		ujianRegister <- c
		defer func() {
			ujianUnregister <- c
		}()

		initialData, err := getUjianData(db)
		if err != nil {
			log.Printf("Error getting initial data: %v", err)
		} else {
			err = c.WriteJSON(initialData)
			if err != nil {
				log.Printf("Error sending initial data: %v", err)
			}
		}

		for {
			_, _, err := c.ReadMessage()
			if err != nil {
				break
			}
		}
	}))
	
	go handleUjianWebSocket()
	go runUjianChecker(db)
}

func handleUjianWebSocket() {
    for{
        select{
        case connection := <-ujianRegister:
            ujianMutex.Lock()
            ujianClients[connection] = true
            ujianMutex.Unlock()

        case connection := <-ujianUnregister:
			ujianMutex.Lock()
			delete(ujianClients, connection)
			ujianMutex.Unlock()

        case message := <-ujianBroadcast:
            ujianMutex.Lock()
            for connection := range ujianClients {
                err := connection.WriteJSON(message)
                if err != nil {
                    log.Printf("Error writing to websocket: %v", err)
                    delete(ujianClients, connection)
                    connection.Close()
                }
            }
            ujianMutex.Unlock()
        }
    }
}

// Pengecekan ujian berkala
func runUjianChecker(db *sql.DB) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    log.Println("Starting ujian checker routine...")

    for {
        select {
        case <-ticker.C:
            log.Println("Checking exam data...")
            ujianData, err := getUjianData(db)
            if err != nil {
                log.Printf("Error checking exam data: %v", err)
                continue
            }

            log.Printf("Broadcasting exam data: %+v", ujianData)
            ujianBroadcast <- ujianData
        }
    }
}

// getUjianData mendapatkan data ujian terbaru
func getUjianData(db *sql.DB) (*UjianDashboardData, error) {
    now := time.Now()
    
    // 1. Check for upcoming exams (3-1 days ahead)
    upcomingData, err := getUpcomingExamData(db, now)
    if err != nil {
        return nil, err
    }
    
    // Jika ada ujian yang akan datang dalam 3-1 hari, kembalikan data tsb
    if upcomingData.HasUpcomingExam {
        return upcomingData, nil
    }
    
    // 2. Periksa apakah ada ujian hari ini
    todayExams, err := checkTodayExams(db, now)
    if err != nil {
        return nil, err
    }
    
    return todayExams, nil
}

// Perbaikan untuk PostgreSQL
func getUpcomingExamData(db *sql.DB, now time.Time) (*UjianDashboardData, error) {
    query := `
    SELECT
        j.tanggal, s."jamMulai", s.sesi
    FROM
        jadwal j
    JOIN
        sesi s ON s."jadwalId" = j.id
    JOIN
        ujian u ON u."sesiId" = s.id
    WHERE
        j.tanggal BETWEEN $1 AND $2
    ORDER BY
        j.tanggal ASC, s.sesi ASC
    LIMIT 1
    `

    threeDaysLater := now.AddDate(0, 0, 3)

    var examDate time.Time
    var jamMulai string
    var sesi int

    // Perhatikan penggunaan $1 dan $2 dalam parameter query
    err := db.QueryRow(query, now.Format("2006-01-02"), threeDaysLater.Format("2006-01-02")).Scan(&examDate, &jamMulai, &sesi)

    if err == sql.ErrNoRows {
        return &UjianDashboardData{
            Type:           "upcoming_exam_check",
            HasUpcomingExam: false,
            DaysUntil:      -1,
        }, nil
    } else if err != nil {
        return nil, err
    }

    firstExamStartTime, err := convertToTimeObject(examDate, jamMulai)
    if err != nil {
        return nil, err
    }

    // Hitung hari yang tersisa
    if firstExamStartTime.Sub(now).Minutes() < 30 {
        return &UjianDashboardData{
            Type:           "upcoming_exam_check",
            HasUpcomingExam: false, // Nonaktifkan karena ujian akan dimulai
            DaysUntil:      0,
        }, nil
    }

    // Perbaikan perhitungan days until
    // Gunakan date secara khusus, bukan waktu dalam jam
    examDay := time.Date(examDate.Year(), examDate.Month(), examDate.Day(), 0, 0, 0, 0, examDate.Location())
    today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
    
    // Hitung selisih dalam hari
    daysUntil := int(examDay.Sub(today).Hours() / 24)

    if daysUntil > 3 {
        return &UjianDashboardData{
            Type:           "upcoming_exam_check",
            HasUpcomingExam: false,
            DaysUntil:      -1,
        }, nil
    }

    return &UjianDashboardData{
        Type:           "upcoming_exam_check",
        HasUpcomingExam: true,
        DaysUntil:      daysUntil,
        FirstExamDate:  examDate.Format("2006-01-02"),
    }, nil
}

func checkTodayExams(db *sql.DB, now time.Time)  (*UjianDashboardData, error) {
    loc, err := time.LoadLocation("Asia/Jakarta")
    if err != nil {
        loc = time.Local
    }
    todayStr := now.In(loc).Format("2006-01-02")

     // 1. Cek apakah ada sesi ujian aktif saat ini
     currentSession, err := getCurrentSession(db, now)
     if err != nil && err != sql.ErrNoRows {
         return nil, err
     }
     
     // 2. Cek sesi berikutnya jika berlaku
     nextSession, err := getNextSession(db, now)
     if err != nil && err != sql.ErrNoRows {
         return nil, err
     }
     
     // 3. Ambil data ujian untuk hari ini berdasarkan tingkat
     examData, err := getTodayExamData(db, todayStr)
     if err != nil {
         return nil, err
     }

     return &UjianDashboardData{
        Type:           "today_exam_data",
        HasUpcomingExam: false,
        DaysUntil:      0,
        CurrentSession: currentSession,
        NextSession:    nextSession,
        ExamData:       examData,
    }, nil
}

func getCurrentSession(db *sql.DB, now time.Time) (*SessionData, error) {
    loc, err := time.LoadLocation("Asia/Jakarta")
    if err != nil {
        loc = time.Local
    }

    nowInWIB := now.In(loc)
    todayStr := nowInWIB.Format("2006-01-02")

    query := `
    SELECT 
        j.tanggal, s.sesi, s."jamMulai", s."jamSelesai"
    FROM 
        jadwal j
    JOIN 
        sesi s ON s."jadwalId" = j.id
    WHERE 
        j.tanggal = $1
        AND cast($2 as time) BETWEEN cast(s."jamMulai" as time) AND cast(s."jamSelesai" as time)
    ORDER BY 
        s.sesi ASC
    LIMIT 1
    `

    var tanggal time.Time
    var sesi int
    var jamMulai, jamSelesai string

    currentTime := nowInWIB.Format("15:04:05")
    err = db.QueryRow(query, todayStr, currentTime).Scan(&tanggal, &sesi, &jamMulai, &jamSelesai)
    if err != nil {
        return nil, err
    }

    SessionData := &SessionData{
        Sesi: sesi,
        JamMulai:  jamMulai,
        JamSelesai: jamSelesai,
        Tanggal:   tanggal,
        CountDown: 0,
    }

    return SessionData, nil
}

func getNextSession(db *sql.DB, now time.Time) (*SessionData, error) {
    loc, err := time.LoadLocation("Asia/Jakarta")
    if err != nil {
        loc = time.Local
    }
    nowInWIB := now.In(loc)
    todayStr := nowInWIB.Format("2006-01-02")
    currentTime := nowInWIB.Format("15:04:05")

    query := `
    SELECT 
        j.tanggal, s.sesi, s."jamMulai", s."jamSelesai"
    FROM 
        jadwal j
    JOIN 
        sesi s ON s."jadwalId" = j.id
    WHERE 
        j.tanggal = $1
        AND cast(s."jamMulai" as time) > cast($2 as time)
    ORDER BY 
        s."jamMulai" ASC
    LIMIT 1
    `

    var tanggal time.Time
    var sesi int
    var jamMulai, jamSelesai string

    err = db.QueryRow(query, todayStr, currentTime).Scan(&tanggal, &sesi, &jamMulai, &jamSelesai)
    if err != nil {
        return nil, err
    }

    nextSessionTime, err := convertToTimeObject(tanggal, jamMulai)
    if err != nil {
        return nil, err
    }

    countDown := int(nextSessionTime.Sub(nowInWIB).Minutes())

    if countDown > 60 {
        countDown = 60
    }

    sessionData := &SessionData{
        Sesi:      sesi,
        JamMulai:  jamMulai,
        JamSelesai: jamSelesai,
        Tanggal:   tanggal,
        CountDown: countDown,
    }
    
    return sessionData, nil

}

func getTodayExamData(db *sql.DB, todayStr string) (*ExamData, error) {
    loc, err := time.LoadLocation("Asia/Jakarta")
    if err != nil {
        loc = time.Local
    }
    now := time.Now().In(loc)
    // currentTime := now.Format("15:04:05")
    
    // Query untuk mengambil ujian hari ini per tingkat
    query := `
    SELECT 
        u.id, 
        u.status, 
        u."jamMulai", 
        u."jamSelesai", 
        mp.pelajaran,
        mp.tingkat
    FROM 
        ujian u
    JOIN 
        mata_pelajaran mp ON u."mataPelajaranId" = mp.id
    JOIN 
        sesi s ON u."sesiId" = s.id
    JOIN 
        jadwal j ON s."jadwalId" = j.id
    WHERE 
        j.tanggal = $1
    ORDER BY 
        u."jamMulai" ASC
    `
    
    rows, err := db.Query(query, todayStr)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    examData := &ExamData{
        X:  []ExamDetails{},
        XI: []ExamDetails{},
        XII: []ExamDetails{},
    }
    
    for rows.Next() {
        var id, status, jamMulai, jamSelesai, pelajaran, tingkat string
        
        err := rows.Scan(&id, &status, &jamMulai, &jamSelesai, &pelajaran, &tingkat)
        if err != nil {
            return nil, err
        }
        
        // Hitung countdown dalam menit jika status pending dan jamMulai valid
        countDownMenit := 0
        if status == "pending" && jamMulai != "" {
            examTime, timeErr := convertToTimeObject(now, jamMulai)
            if timeErr == nil {
                countDownMenit = int(examTime.Sub(now).Minutes())
                
                // Ubah status menjadi "active" jika kurang dari 30 menit
                if countDownMenit <= 30 && countDownMenit > 0 {
                    countDownMenit = countDownMenit
                } else {
                    countDownMenit = 0
                }
            }
        }
        
        examDetail := ExamDetails{
            ID:             id,
            MataPelajaran:  pelajaran,
            Status:         status,
            JamMulai:       jamMulai,
            JamSelesai:     jamSelesai,
            CountDownMenit: countDownMenit,
        }
        
        switch tingkat {
        case "X":
            examData.X = append(examData.X, examDetail)
        case "XI":
            examData.XI = append(examData.XI, examDetail)
        case "XII":
            examData.XII = append(examData.XII, examDetail)
        }
    }
    
    return examData, nil
}


func convertToTimeObject(date time.Time, timeStr string) (time.Time, error) {
    loc, err := time.LoadLocation("Asia/Jakarta")
    if err != nil {
        loc = time.Local
    }
    
    year, month, day := date.Date()

    timeLayout := "15:04"
    t, err := time.Parse(timeLayout, timeStr)
    if err != nil {
        return time.Time{}, err
    }

    return time.Date(year, month, day, t.Hour(), t.Minute(), 0, 0, loc), nil
}



// SubmitUjian handles the submission of student exam answers
func (h *UjianHandler) SubmitUjian(c *fiber.Ctx) error {
    // Log the start of request handling
    fmt.Println("Starting SubmitUjian handler")

    // Parse request body
    var request models.SubmitUjianRequest
    if err := c.BodyParser(&request); err != nil {
        log.Printf("Error parsing request body: %v", err)
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "success": false,
            "message": "Invalid request format",
        })
    }

    log.Printf("Received submission data: %+v", request)
    log.Printf("Answers received: %+v", request.Answers)

    // Validate request data
    if request.UjianID == "" || request.SiswaDetailID == "" || len(request.Answers) == 0 {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "success": false,
            "message": "Missing required fields",
        })
    }

    // Start a transaction
    tx, err := h.DB.Begin()
    if err != nil {
        log.Printf("Error starting transaction: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": "Database error",
        })
    }
    defer tx.Rollback() // Will be ignored if transaction is committed

    // 1. Save all student answers first
   // In your SubmitUjian handler function, modify the insert code:
for soalID, jawabanID := range request.Answers {
    // Generate a CUID-compatible ID for the answer
    answerID := fmt.Sprintf("cm%s", uuid.New().String()[:20])
    
    // Get current time for createdAt
    now := time.Now().UTC()
    
    // Debug the values being inserted
    log.Printf("Inserting answer: ID=%s, siswaDetailId=%s, ujianId=%s, soalId=%s, jawabanId=%s, createdAt=%v",
        answerID, request.SiswaDetailID, request.UjianID, soalID, jawabanID, now)
    
    // Insert answer into jawaban_siswa table
   result, err := tx.Exec(
    `INSERT INTO jawaban_siswa 
    ("id", "siswaDetailId", "ujianId", "soalId", "jawabanId", "createdAt") 
    VALUES ($1, $2, $3, $4, $5, $6)`,
    answerID, request.SiswaDetailID, request.UjianID, soalID, jawabanID, now,
)

    
    if err != nil {
        // Get exact MySQL error details
        log.Printf("Full error details for saving answer: %v", err)
        
        // Try to get a more specific error type if using MySQL
        
        
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": fmt.Sprintf("Error saving answers: %v", err),
        })
    }
    
    // Log the number of rows affected
    rowsAffected, _ := result.RowsAffected()
    log.Printf("Rows affected by insert: %d", rowsAffected)
}

    // 2. Calculate the results (correct/incorrect answers)
    var totalCorrect int
    var totalAnswers int = len(request.Answers)

    for soalID, jawabanID := range request.Answers {
        var isCorrect bool
		err := tx.QueryRow(
			`SELECT benar FROM jawaban WHERE "id" = $1 AND "soalId" = $2`, 
			jawabanID, soalID,
		).Scan(&isCorrect)


        
        if err != nil {
            log.Printf("Error checking answer correctness: %v", err)
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "success": false,
                "message": "Error calculating results",
            })
        }
        
        if isCorrect {
            totalCorrect++
        }
    }

    // 3. Count cheating incidents
    var totalCheating int
    err = tx.QueryRow(
    "SELECT COUNT(*) FROM kecurangan WHERE \"ujianId\" = $1 AND \"siswaDetailId\" = $2",
    request.UjianID, request.SiswaDetailID,
).Scan(&totalCheating)

    
    if err != nil {
        log.Printf("Error counting cheating incidents: %v", err)
        // Non-fatal error, continue with 0 cheating count
        totalCheating = 0
    }

    // 4. Calculate score
    totalIncorrect := totalAnswers - totalCorrect
    // Score calculation: (correct answers / total questions) * 100
    nilai := int((float64(totalCorrect) / float64(totalAnswers)) * 100)

    // Convert ints to strings for the Prisma schema
    nilaiStr := fmt.Sprintf("%d", nilai)
    benarStr := fmt.Sprintf("%d", totalCorrect)
    salahStr := fmt.Sprintf("%d", totalIncorrect)
    waktuPengerjaanStr := fmt.Sprintf("%d", request.WaktuPengerjaan)

    // 5. Create hasil record - make sure types match Prisma schema (using strings)
    hasilID := fmt.Sprintf("cm%s", uuid.New().String()[:20]) // Generate CUID-compatible ID
    
    // Debug the values being inserted for hasil
    log.Printf("Inserting hasil: ID=%s, siswaDetailId=%s, ujianId=%s, waktuPengerjaan=%s, nilai=%s, benar=%s, salah=%s",
        hasilID, request.SiswaDetailID, request.UjianID, waktuPengerjaanStr, nilaiStr, benarStr, salahStr)
    
   _, err = tx.Exec(
    `INSERT INTO hasil 
    ("id", "siswaDetailId", "ujianId", "waktuPengerjaan", "nilai", "benar", "salah") 
    VALUES ($1, $2, $3, $4, $5, $6, $7)`, // ✅ Gunakan $1, $2, ...
    hasilID, request.SiswaDetailID, request.UjianID, waktuPengerjaanStr, nilaiStr, benarStr, salahStr,
)

    
    if err != nil {
        log.Printf("Error saving hasil: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": "Error saving results",
        })
    }

    // Commit the transaction
    if err := tx.Commit(); err != nil {
        log.Printf("Error committing transaction: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": "Database error",
        })
    }

    // Send successful response
    return c.Status(fiber.StatusOK).JSON(models.SubmitUjianResponse{
        Success:         true,
        Message:         "Exam submitted successfully",
        HasilID:         hasilID,
        Nilai:           nilai,
        Benar:           totalCorrect,
        Salah:           totalIncorrect,
        TotalKecurangan: totalCheating,
        WaktuPengerjaan: request.WaktuPengerjaan,
    })
}


func (h *UjianHandler) GetHasilDetail(c *fiber.Ctx) error {
	hasilID := c.Params("id")
	log.Println("Menerima request untuk hasilID:", hasilID) // Debugging

	if hasilID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Missing hasil ID",
		})
	}

	// Perbaikan: Gunakan placeholder PostgreSQL ($1, $2)
	var hasil models.HasilDetail
	var createdAtFloat float64
	err := h.DB.QueryRow(
	`SELECT h."id", h."siswaDetailId", h."ujianId", h."waktuPengerjaan", h."nilai", h."benar", h."salah",
	        (SELECT COUNT(*) FROM kecurangan WHERE "ujianId" = h."ujianId" AND "siswaDetailId" = h."siswaDetailId") as totalKecurangan,
	        EXTRACT(EPOCH FROM h."createdAt") as createdAt,
	        mp."pelajaran", mp."tingkat" -- Ambil tingkat juga
	 FROM hasil h
	 JOIN ujian u ON h."ujianId" = u."id"
	 JOIN mata_pelajaran mp ON u."mataPelajaranId" = mp."id"
	 WHERE h."id" = $1`, 
	hasilID,
).Scan(
	&hasil.ID, &hasil.SiswaDetailID, &hasil.UjianID, 
	&hasil.WaktuPengerjaan, &hasil.Nilai, &hasil.Benar, &hasil.Salah,
	&hasil.TotalKecurangan, &createdAtFloat, 
	&hasil.MataPelajaran, &hasil.Tingkat, // Tambahkan tingkat
)


	// Konversi float64 ke int64 jika perlu
	hasil.CreatedAt = int64(createdAtFloat)

	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Hasil not found",
			})
		}
		log.Printf("Database error fetching hasil: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Database error",
		})
	}

	// Ambil mataPelajaranId dari tabel ujian
	var mataPelajaranID string
	err = h.DB.QueryRow(
		`SELECT "mataPelajaranId" FROM ujian WHERE "id" = $1`,
		hasil.UjianID,
	).Scan(&mataPelajaranID)

	if err != nil {
		log.Printf("Error fetching mataPelajaranId for ujianId %s: %v", hasil.UjianID, err)
		mataPelajaranID = "" // Default kosong jika error
	}

	// Ambil nama mata pelajaran dari tabel mata_pelajaran
	var mataPelajaran string
	if mataPelajaranID != "" {
		err = h.DB.QueryRow(
			`SELECT "pelajaran" FROM mata_pelajaran WHERE "id" = $1`,
			mataPelajaranID,
		).Scan(&mataPelajaran)

		if err != nil {
			log.Printf("Error fetching pelajaran for mataPelajaranId %s: %v", mataPelajaranID, err)
			mataPelajaran = "Unknown"
		}
	} else {
		mataPelajaran = "Unknown"
	}

	// Tambahkan nama mata pelajaran ke hasil
	hasil.MataPelajaran = mataPelajaran

	// Ambil detail kecurangan berdasarkan type
	rows, err := h.DB.Query(
	`SELECT "type", COUNT(*) as count 
	 FROM kecurangan 
	 WHERE "ujianId" = $1 AND "siswaDetailId" = $2 
	 GROUP BY "type"`,
	hasil.UjianID, hasil.SiswaDetailID,
)

	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error fetching cheating details: %v", err)
	} else {
		defer rows.Close()
		
		byType := []models.CheatingCount{}
		for rows.Next() {
			var cheatType models.TypeKecurangan
			var count int
			if err := rows.Scan(&cheatType, &count); err != nil {
				continue
			}
			byType = append(byType, models.CheatingCount{Type: cheatType, Count: count})
		}
		
		hasil.Kecurangan = models.CheatingDetail{
			TotalCount: hasil.TotalKecurangan,
			ByType:     byType,
		}
	}

	return c.Status(fiber.StatusOK).JSON(hasil)
}

