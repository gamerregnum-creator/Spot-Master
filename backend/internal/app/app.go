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
	unityPool := services.NewUnityPoolService(database.Conn)
	solanaService := solana.NewSolanaService()
	revenueService := services.NewRevenueService(database.Conn, unityPool, solanaService)
	stakingService := services.NewStakingService(database.Conn)
	identityService := services.NewIdentityService(database.Conn)
	adminService := services.NewAdminService(database.Conn)

	// Initialize handlers
	h := handlers.NewHandlers(revenueService, stakingService, identityService, solanaService, unityPool, adminService)

	app := fiber.New()

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// Routes
	app.Get("/health", h.HealthCheck)
	
	apiGroup := app.Group("/api/v1")
	apiGroup.Post("/revenue/distribute/:id", h.HandleRevenueDistribution)
	apiGroup.Post("/revenue/retail", h.HandleRetailRevenue)
	apiGroup.Post("/revenue/license", h.HandleLicenseRevenue)
	apiGroup.Post("/staking/action", h.HandleStakingAction)
	apiGroup.Post("/user/sync", h.HandleUserSync)
	apiGroup.Post("/unity/raffle/:id", h.HandleUnityRaffle)

	dashboardGroup := apiGroup.Group("/dashboard")
	dashboardGroup.Get("/revenue", h.GetRevenueDashboard)
	dashboardGroup.Get("/staking", h.GetStakingDashboard)
	dashboardGroup.Get("/referrals", h.GetReferralDashboard)
	dashboardGroup.Get("/holders", h.GetAdminHolders)

	adminGroup := apiGroup.Group("/admin")
	adminGroup.Get("/revenue-logs", h.GetRevenueLogs)
	adminGroup.Post("/holder/update-wallet", h.UpdateHolderWallet)
	adminGroup.Post("/pause", h.ToggleContractPause)
	adminGroup.Post("/distribute-company", h.TriggerCompanyDistribute)
	adminGroup.Post("/sponsor/register", h.RegisterSponsor)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
