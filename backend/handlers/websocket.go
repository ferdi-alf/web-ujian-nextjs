// handlers/websocket.go
package handlers

import (
	"database/sql"
	"log"
	"sync"

	"backend/models"
	"backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

var (
	ujianMutex      sync.RWMutex
	ujianClients    = make(map[*websocket.Conn]bool)
	ujianRegister   = make(chan *websocket.Conn)
	ujianUnregister = make(chan *websocket.Conn)
	ujianBroadcast  = make(chan models.ResponseDataUjian)
	db              *sql.DB
	tracker *services.UjianTracker

)

// SetupWebSocketUjian menginisialisasi websocket untuk tracking ujian
func SetupWebSocketUjian(app *fiber.App, db *sql.DB) {
	// Setup tracker
	tracker = services.NewUjianTracker(db, ujianBroadcast)
	
	// Setup websocket route
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	
	app.Get("/ws/api/data-ujian", websocket.New(func(c *websocket.Conn) {
		// Register client
		ujianRegister <- c
		
		// Unregister on disconnect
		defer func() {
			ujianUnregister <- c
		}()
		
		// Keep connection alive
		for {
			_, _, err := c.ReadMessage()
			if err != nil {
				return
			}
		}
	}))
	
	// Start websocket handler
	go handleUjianWebSocket()
	
	// Start tracking service
	go tracker.StartTracking()
}

// handleUjianWebSocket mengelola koneksi websocket
func handleUjianWebSocket() {
	for {
		select {
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