package main

import (
	"backend/config"
	"backend/handlers"
	"backend/models"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
)

func main() {
    // Load .env file     
    if err := godotenv.Load(); err != nil {
        log.Fatal("Error loading .env file")
    }

    // Initialize database
    db := config.InitDB()
    
    defer db.Close()

    // Initialize Fiber
    app := fiber.New()
    
    // CORS - pindahkan sebelum route definitions
    app.Use(cors.New(cors.Config{
        AllowOrigins: "*",
        AllowMethods: "GET,POST,PUT,DELETE",
        AllowHeaders: "Origin, Content-Type, Accept",
        AllowCredentials: false,
    }))

    // Initialize handlers
    soalHandler := handlers.NewSoalHandler(db)
     // Initialize handlers
    cheatingHandler := handlers.NewCheatingHandler(db)
    

    // Tambahkan WebSocket & route

    // Routes
    app.Get("/", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"message": "API bekerja!"})
    })
    app.Post("/api/soal", soalHandler.AddSoal)
    app.Post("/api/kecurangan", cheatingHandler.ReportCheating)
   // Add to your existing routes in main.go
    ujianHandler := handlers.NewUjianHandler(db)
   
    app.Post("/api/ujian/submit", ujianHandler.SubmitUjian)
    app.Get("/api/data-ujian-terlewat", handlers.GetUjianTerlewat(db))
 
      
    app.Get("/api/hasil/:id", ujianHandler.GetHasilDetail)
    app.Get("/api/ujian/download", func(c *fiber.Ctx) error {
    return handlers.DownloadHasilUjian(c, db)
    })
    handlers.SetupWebSocket(app, db)

   // Setup websocket dan tracker PERTAMA
    ujianBroadcast := make(chan models.ResponseDataUjian, 10)
    ujianTracker := handlers.SetupWebSocketUjian(app, db, ujianBroadcast)
    
    // Setup routes dengan tracker yang SAMA
    app.Get("/api/data-ujian", handlers.GetUjianTrackingData(db))
    app.Post("/api/data-ujian-terlewat", handlers.AddUjianSusulan(db, ujianTracker))






    // Start server - pindahkan ke akhir
    fmt.Println("Server starting on http://localhost:8050")
    log.Fatal(app.Listen(":8050"))
}