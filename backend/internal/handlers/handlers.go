package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/megav/regna-revolution/backend/internal/models"
	"github.com/megav/regna-revolution/backend/internal/services"
	"github.com/megav/regna-revolution/backend/internal/solana"
)


type Handlers struct {
	revenue  *services.RevenueService
	staking  *services.StakingService
	identity *services.IdentityService
	solana   *solana.SolanaService
	unity    *services.UnityPoolService
	admin    *services.AdminService
}

func NewHandlers(r *services.RevenueService, s *services.StakingService, id *services.IdentityService, sol *solana.SolanaService, u *services.UnityPoolService, adm *services.AdminService) *Handlers {
	return &Handlers{
		revenue:  r,
		staking:  s,
		identity: id,
		solana:   sol,
		unity:    u,
		admin:    adm,
	}
}

func (h *Handlers) HandleUnityRaffle(c *fiber.Ctx) error {
	poolID := c.Params("id")
	winnerID, amount, err := h.unity.PickWinner(poolID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":    "SUCCESS",
		"winner_id": winnerID,
		"amount":    amount,
		"message":   "Unity Pool Raffle completed successfully!",
	})
}

func (h *Handlers) HealthCheck(c *fiber.Ctx) error {
	return c.Status(200).JSON(fiber.Map{
		"status":  "ok",
		"project": "Regna Revolution",
		"version": "1.0.0",
	})
}

func (h *Handlers) HandleRevenueDistribution(c *fiber.Ctx) error {
	businessID := c.Params("id")
	if businessID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "business_id is required"})
	}

	type RevenueReq struct {
		SaleTotal float64 `json:"sale_total"` // Precio original (antes del descuento Rush Hour)
		UserID    string  `json:"user_id"`    // Cliente que realizó la compra
		OrderID   string  `json:"order_id"`   // ID de la orden/transacción
	}
	var req RevenueReq
	if err := c.BodyParser(&req); err != nil || req.SaleTotal <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "sale_total is required and must be > 0"})
	}
	if req.UserID == "" || req.OrderID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "user_id and order_id are required"})
	}

	if err := h.revenue.DistributeFunds(businessID, req.SaleTotal, req.UserID, req.OrderID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"message": "Revenue distribution successful for business: " + businessID})
}

func (h *Handlers) HandleRetailRevenue(c *fiber.Ctx) error {
	type RetailReq struct {
		RetailID string  `json:"retail_id"`
		Amount   float64 `json:"amount"`
	}
	var req RetailReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}
	// Logic for retail sector
	return c.JSON(fiber.Map{"status": "SUCCESS", "message": "Retail revenue processed"})
}

func (h *Handlers) HandleLicenseRevenue(c *fiber.Ctx) error {
	type LicenseReq struct {
		LicenseID     string  `json:"license_id"`
		Amount        float64 `json:"amount"`
		ConsultantCut float64 `json:"consultant_cut"`
		PoolCut       float64 `json:"pool_cut"`
	}
	var req LicenseReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	if err := h.revenue.DistributeLicenseFunds(req.LicenseID, req.Amount, req.ConsultantCut, req.PoolCut); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "SUCCESS", "message": "License revenue processed"})
}

func (h *Handlers) HandleStakingAction(c *fiber.Ctx) error {
	type StakingRequest struct {
		WalletID string  `json:"wallet_id"`
		Amount   float64 `json:"amount"`
	}

	var req StakingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := h.staking.ProcessStake(req.WalletID, req.Amount); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"message": "Staking action acknowledged"})
}

func (h *Handlers) GetRevenueDashboard(c *fiber.Ctx) error {
	data, err := h.solana.GetRevenueData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(data)
}

func (h *Handlers) GetStakingDashboard(c *fiber.Ctx) error {
	data, err := h.solana.GetStakingData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(data)
}

func (h *Handlers) GetReferralDashboard(c *fiber.Ctx) error {
	data, err := h.solana.GetReferralData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(data)
}

func (h *Handlers) GetAdminHolders(c *fiber.Ctx) error {
	data, err := h.solana.GetHolders()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(data)
}

// ─── ADMIN ENDPOINTS ────────────────────────────────────────────────────────

func (h *Handlers) GetRevenueLogs(c *fiber.Ctx) error {
	limit := 50
	if l := c.QueryInt("limit", 50); l > 0 {
		limit = l
	}
	logs, err := h.admin.GetRevenueLogs(limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"logs": logs, "count": len(logs)})
}

func (h *Handlers) UpdateHolderWallet(c *fiber.Ctx) error {
	var req struct {
		UserID    string `json:"user_id"`
		OldWallet string `json:"old_wallet"`
		NewWallet string `json:"new_wallet"`
		Reason    string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.UserID == "" || req.OldWallet == "" || req.NewWallet == "" || req.Reason == "" {
		return c.Status(400).JSON(fiber.Map{"error": "user_id, old_wallet, new_wallet, and reason are all required"})
	}
	if err := h.admin.UpdateHolderWallet(models.WalletUpdateRequest{
		UserID:    req.UserID,
		OldWallet: req.OldWallet,
		NewWallet: req.NewWallet,
		Reason:    req.Reason,
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"status":  "SUCCESS",
		"message": "Holder wallet updated. On-chain guardian action required to finalize.",
	})
}

func (h *Handlers) ToggleContractPause(c *fiber.Ctx) error {
	newState := h.admin.TogglePause()
	status := "RESUMED"
	if newState {
		status = "PAUSED"
	}
	return c.JSON(fiber.Map{
		"status":    "SUCCESS",
		"is_paused": newState,
		"message":   "Contract " + status + ". On-chain guardian call required to finalize.",
	})
}

func (h *Handlers) TriggerCompanyDistribute(c *fiber.Ctx) error {
	if err := h.admin.TriggerCompanyDistribute(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"status":  "SUCCESS",
		"message": "Company dividend distribution queued. On-chain execution required.",
		"split":   fiber.Map{"company": "4/7 (~57%)", "donations": "1/7 (~14%)", "development": "1/7 (~14%)", "reinvestment": "1/7 (~14%)"},
	})
}

func (h *Handlers) RegisterSponsor(c *fiber.Ctx) error {
	var req struct {
		SponsorWallet string `json:"sponsor_wallet"`
		PlayerUserID  string `json:"player_user_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.SponsorWallet == "" || req.PlayerUserID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "sponsor_wallet and player_user_id are required"})
	}
	if err := h.admin.RegisterSponsor(req.SponsorWallet, req.PlayerUserID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "SUCCESS", "message": "Sponsor relationship registered"})
}

// ─────────────────────────────────────────────────────────────────────────────

func (h *Handlers) HandleUserSync(c *fiber.Ctx) error {
	var profile models.UserProfile
	if err := c.BodyParser(&profile); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid profile body"})
	}

	if err := h.identity.SyncUserProfile(profile); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"message": "User profile and wallet synchronized successfully"})
}
