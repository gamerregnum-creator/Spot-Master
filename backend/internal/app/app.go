package app

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/megav/regna-revolution/backend/internal/db"
	"github.com/megav/regna-revolution/backend/internal/handlers"
	"github.com/megav/regna-revolution/backend/internal/services"
	"github.com/megav/regna-revolution/backend/internal/solana"
)

func Run() {
	database, err := db.Connect()
	if err != nil {
		log.Fatalf("Could not connect to database: %v", err)
	}
	defer database.Close()

	// Initialize services
	revenueService := services.NewRevenueService(database.Conn)
	stakingService := services.NewStakingService(database.Conn)
	solanaService := solana.NewSolanaService()

	// Initialize handlers
	h := handlers.NewHandlers(revenueService, stakingService, solanaService)

	app := fiber.New()

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// Routes
	app.Get("/health", h.HealthCheck)
	
	apiGroup := app.Group("/api/v1")
	apiGroup.Post("/revenue/distribute/:id", h.HandleRevenueDistribution)
	apiGroup.Post("/staking/action", h.HandleStakingAction)

	dashboardGroup := apiGroup.Group("/dashboard")
	dashboardGroup.Get("/revenue", h.GetRevenueDashboard)
	dashboardGroup.Get("/staking", h.GetStakingDashboard)
	dashboardGroup.Get("/referrals", h.GetReferralDashboard)
	dashboardGroup.Get("/holders", h.GetAdminHolders)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
