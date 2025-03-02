package config

import (
	"backend/models"
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"gorm.io/gorm"
)

func InitDB() *sql.DB {
    dbHost := os.Getenv("DB_HOST")
     if dbHost == "" {
        log.Fatal("DB_HOST is not set")
    }
    dbPort := os.Getenv("DB_PORT")
    if dbPort == "" {
        log.Fatal("DB port no set")
    }
    dbUser := os.Getenv("DB_USER")
     if dbUser == "" {
        log.Fatal("db user is not set")
    }
    dbPass := os.Getenv("DB_PASSWORD")
     if dbPass == "" {
        log.Fatal("db pass is not set")
    }
    dbName := os.Getenv("DB_NAME")
     if dbName == "" {
        log.Fatal("db name is not set")
    }

    connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        dbHost, dbPort, dbUser, dbPass, dbName)
    fmt.Printf("Connecting to database: host=%s port=%s dbname=%s user=%s\n",
        dbHost, dbPort, dbName, dbUser)

    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal("Error connecting to database:", err)
    }

    err = db.Ping()
    if err != nil {
        log.Fatal("Error pinging database:", err)
    }

    log.Println("Successfully connected to database")
    return db
}

func MigrateJawabanSiswa(db *gorm.DB) error {
	// Buat tabel untuk menyimpan jawaban siswa
	err := db.AutoMigrate(
		&models.JawabanSiswa{},
		&models.HasilDetail{},
	)
	
	return err
}