package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

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

	files, err := ioutil.ReadDir(sqlDir)
	if err != nil {
		log.Fatal(err)
	}

	var sqlFiles []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".sql") && f.Name() != "05_seed_data.sql" {
			sqlFiles = append(sqlFiles, f.Name())
		}
	}
	sort.Strings(sqlFiles)

	for _, f := range sqlFiles {
		fmt.Printf("Executing migration: %s\n", f)
		content, err := ioutil.ReadFile(filepath.Join(sqlDir, f))
		if err != nil {
			log.Fatal(err)
		}

		_, err = db.Exec(string(content))
		if err != nil {
			log.Fatalf("Error executing %s: %v", f, err)
		}
	}

	fmt.Println("Migrations completed successfully!")
}
