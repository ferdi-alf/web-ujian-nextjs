// handlers/ws_handler.go
package handlers

import (
	"backend/models"
	"database/sql"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

type CheatingHandler struct {
    DB *sql.DB
}

func NewCheatingHandler(db *sql.DB) *CheatingHandler {
    return &CheatingHandler{DB: db}
}



var (
    clients = make(map[*websocket.Conn]bool)
    clientsMutex = sync.Mutex{}
    
    // Channel untuk broadcast ke semua klien
    broadcast = make(chan models.CheatingEvent)
    
    // Menyimpan informasi client terautentikasi
    clientInfo = make(map[*websocket.Conn]struct {
        UjianID string
        SiswaDetailID string
        IsAdmin bool
    })
)

func (h *CheatingHandler) ReportCheating(c *fiber.Ctx) error {
    var event models.CheatingEvent

    if err := c.BodyParser(&event); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "Invalid request body",
        })
    }

    event.Timestamp = time.Now().UnixMilli()

    // Simpan ke database
    saveCheatingEventToDB(event, h.DB)

    // Broadcast ke admin
    broadcast <- event

    return c.Status(fiber.StatusCreated).JSON(event)
}


// SetupWebSocket - Setup websocket routes
func SetupWebSocket(app *fiber.App, db *sql.DB) {
    app.Use("/ws", func(c *fiber.Ctx) error {
        if websocket.IsWebSocketUpgrade(c) {
            return c.Next()
        }
        return fiber.ErrUpgradeRequired
    })

    app.Get("/ws/admin", websocket.New(handleAdminConnection))
    app.Get("/ws/siswa", websocket.New(func(c *websocket.Conn) {
        handleSiswaConnection(c, db)
    }))

    go handleBroadcasts()

    app.Post("/api/kecurangan", func(c *fiber.Ctx) error {
        return createCheatingRecord(c, db) // Kirim db ke fungsi
    })
}


// handleAdminConnection - Menangani koneksi WebSocket untuk admin
func handleAdminConnection(c *websocket.Conn) {
    // Autentikasi admin (sesuaikan dengan sistem autentikasi Anda)
    // ...
    
    // Register client baru
    clientsMutex.Lock()
    clients[c] = true
    clientInfo[c] = struct {
        UjianID string
        SiswaDetailID string
        IsAdmin bool
    }{
        UjianID: "",
        SiswaDetailID: "",
        IsAdmin: true,
    }
    clientsMutex.Unlock()
    
    defer func() {
        clientsMutex.Lock()
        delete(clients, c)
        delete(clientInfo, c)
        clientsMutex.Unlock()
        c.Close()
    }()
    
    // Message reading loop (untuk menerima pesan dari admin jika diperlukan)
    for {
        messageType, _, err := c.ReadMessage()
        if err != nil || messageType == websocket.CloseMessage {
            break
        }
    }
}

// handleSiswaConnection - Menangani koneksi WebSocket untuk siswa
func handleSiswaConnection(c *websocket.Conn, db *sql.DB) {
    // Ambil ID siswa dan ujian dari query params atau header
    ujianID := c.Query("ujianId")
    siswaDetailID := c.Query("siswaDetailId")
    
    if ujianID == "" || siswaDetailID == "" {
        log.Println("Missing required parameters")
        c.Close()
        return
    }
    
    // Register client baru
    clientsMutex.Lock()
    clients[c] = true
    clientInfo[c] = struct {
        UjianID string
        SiswaDetailID string
        IsAdmin bool
    }{
        UjianID: ujianID,
        SiswaDetailID: siswaDetailID,
        IsAdmin: false,
    }
    clientsMutex.Unlock()
    
    defer func() {
        clientsMutex.Lock()
        delete(clients, c)
        delete(clientInfo, c)
        clientsMutex.Unlock()
        c.Close()
    }()
    
    // Kirim event kecurangan yang diterima dari siswa
    for {
        _, msg, err := c.ReadMessage()
        if err != nil {
            break
        }
        
        // Proses pesan kecurangan dan broadcast ke admin
        var cheatingEvent models.CheatingEvent
        if err := json.Unmarshal(msg, &cheatingEvent); err == nil {
            // Validasi data
            if cheatingEvent.UjianID == ujianID && cheatingEvent.SiswaDetailID == siswaDetailID {
                // Set timestamp jika tidak ada
                if cheatingEvent.Timestamp == 0 {
                    cheatingEvent.Timestamp = time.Now().UnixMilli()
                }
                
                // Kirim ke channel broadcast
                broadcast <- cheatingEvent
                
                // Simpan ke database
                saveCheatingEventToDB(cheatingEvent, db)
            }
        }
    }
}

// handleBroadcasts - Goroutine untuk broadcast pesan ke semua client admin
func handleBroadcasts() {
    for {
        // Tunggu pesan dari channel broadcast
        event := <-broadcast
        log.Println("Broadcasting event:", event) // Debugging
        clientsMutex.Lock()
        for client, _ := range clients {
            // Kirim hanya ke admin
            if info, exists := clientInfo[client]; exists && info.IsAdmin {
                if err := client.WriteJSON(event); err != nil {
                    log.Printf("Error: %v", err)
                    client.Close()
                    delete(clients, client)
                    delete(clientInfo, client)
                }
            }
        }
        clientsMutex.Unlock()
    }
}

// saveCheatingEventToDB - Simpan event kecurangan ke database
func saveCheatingEventToDB(event models.CheatingEvent, db *sql.DB) {
    var typeKecurangan string
    switch event.Type {
    case models.TabHidden:
        typeKecurangan = "tabHidden"
    case models.Blurred:
        typeKecurangan = "blurred"
    case models.SplitScreen:
        typeKecurangan = "splitScreen"
    case models.FloatingWindow:
        typeKecurangan = "floatingWindow"
    }

    _, err := db.Exec(
        "INSERT INTO kecurangan (id, \"ujianId\", \"siswaDetailId\", type) VALUES ($1, $2, $3, $4)",
        uuid.New().String(),
        event.UjianID,
        event.SiswaDetailID,
        typeKecurangan,
    )

    if err != nil {
        log.Printf("Error saving cheating event: %v", err)
    }
}

// createCheatingRecord - Endpoint REST untuk menyimpan kecurangan
func createCheatingRecord(c *fiber.Ctx, db *sql.DB) error {
    var event models.CheatingEvent

    if err := c.BodyParser(&event); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "Invalid request body",
        })
    }

    event.Timestamp = time.Now().UnixMilli()

    // Simpan ke database
    saveCheatingEventToDB(event, db) // Kirim db ke fungsi

    // Broadcast ke admin
    broadcast <- event

    return c.Status(fiber.StatusCreated).JSON(event)
}
