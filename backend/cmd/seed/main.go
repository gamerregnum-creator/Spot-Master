package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/regna?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	sqlDir := os.Getenv("SQL_DIR")
	if sqlDir == "" {
		sqlDir = "../Pre-Designed_Assets/Database"
	}

	seedFile := "05_seed_data.sql"
	fmt.Printf("Executing seed: %s\n", seedFile)
	
	content, err := ioutil.ReadFile(filepath.Join(sqlDir, seedFile))
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(string(content))
	if err != nil {
		log.Fatalf("Error executing %s: %v", seedFile, err)
	}

	fmt.Println("Seeds completed successfully!")
}
