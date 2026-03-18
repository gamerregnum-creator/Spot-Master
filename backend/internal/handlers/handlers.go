package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/megav/regna-revolution/backend/internal/services"
	"github.com/megav/regna-revolution/backend/internal/solana"
)

type Handlers struct {
	RevenueService *services.RevenueService
	StakingService *services.StakingService
	SolanaService  *solana.SolanaService
}

func NewHandlers(rev *services.RevenueService, staking *services.StakingService, sol *solana.SolanaService) *Handlers {
	return &Handlers{
		RevenueService: rev,
		StakingService: staking,
		SolanaService:  sol,
	}
}

func (h *Handlers) HealthCheck(c *fiber.Ctx) error {
	return c.Status(200).JSON(fiber.Map{
		"status":  "ok",
		"project": "Regna Revolution",
		"version": "1.0.0",
	})
}

func (h *Handlers) HandleRevenueDistribution(c *fiber.Ctx) error {
	orderID := c.Params("id")
	if orderID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "id is required"})
	}

	if err := h.RevenueService.DistributeFunds(orderID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"message": "Revenue distribution successful"})
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

	if err := h.StakingService.ProcessStake(req.WalletID, req.Amount); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{"message": "Staking action acknowledged"})
}

func (h *Handlers) GetRevenueDashboard(c *fiber.Ctx) error {
	data, err := h.SolanaService.GetRevenueData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(data)
}

func (h *Handlers) GetStakingDashboard(c *fiber.Ctx) error {
	data, err := h.SolanaService.GetStakingData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(data)
}

func (h *Handlers) GetReferralDashboard(c *fiber.Ctx) error {
	data, err := h.SolanaService.GetReferralData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(data)
}

func (h *Handlers) GetAdminHolders(c *fiber.Ctx) error {
	data, err := h.SolanaService.GetHolders()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(data)
}
