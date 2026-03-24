package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("DB_URL environment variable is required")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	fmt.Println("Cleaning up public schema...")
	_, err = db.Exec(`
		DROP SCHEMA public CASCADE;
		CREATE SCHEMA public;
		GRANT ALL ON SCHEMA public TO postgres;
		GRANT ALL ON SCHEMA public TO anon;
		GRANT ALL ON SCHEMA public TO authenticated;
		GRANT ALL ON SCHEMA public TO service_role;
	`)
	if err != nil {
		log.Fatalf("Error cleaning up: %v", err)
	}

	fmt.Println("Cleanup completed successfully!")
}
