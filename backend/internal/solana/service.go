package solana

import (
	"time"
	"github.com/megav/regna-revolution/backend/internal/models"
)

type SolanaService struct {
	// Aquí iría la conexión RPC de Solana (solana-go o similar)
}

func NewSolanaService() *SolanaService {
	return &SolanaService{}
}

func (s *SolanaService) GetRevenueData() (*models.RevenueDashboard, error) {
	// Mock: Distribución basada en Organigrama Token.jpg (Actualizado: Public+Airdrop unificado)
	return &models.RevenueDashboard{
		TotalRevenue:     150000000000, // 150k USDC
		PctReserved:      4000,         // 40%
		PctPublicAirdrop: 3000,         // 30% (16% Public + 14% Airdrop)
		PctProjects:      1000,         // 10%
		PctDonations:     1000,         // 10%
		PctDevProgram:    1000,         // 10%
		IsPaused:         false,
	}, nil
}

func (s *SolanaService) GetStakingData() (*models.StakingDashboard, error) {
	// Mock: August progress -> September 1st Payment
	return &models.StakingDashboard{
		CurrentPeriodID: 1,
		StartDate:       time.Date(2026, 7, 4, 0, 0, 0, 0, time.UTC),
		EndDate:         time.Date(2026, 9, 30, 23, 59, 59, 0, time.UTC),
		PaymentDate:     time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC), // Cycle Payment (Quarterly)
		TotalStaked:     5000000000,
		StakingPool:     8500000000,
		VipPool:         3500000000,
		GlobalVipUnits:  150, // 15,000 Public / 100
		TotalUSDC:       12000000000,
		RewardPerToken:  "2.4",
		Status:          "Active",
	}, nil
}

func (s *SolanaService) GetHolders() ([]models.HolderRecord, error) {
	// Mock: Staked = Locked for rewards, Active = Liquid in wallet
	return []models.HolderRecord{
		{WalletAddress: "7xKX...j9f2", Balance: 5000, Percentage: 10.0, Status: "Staked"},
		{WalletAddress: "3mNR...p4k1", Balance: 3000, Percentage: 6.0, Status: "Staked"},
		{WalletAddress: "9vLQ...r7t8", Balance: 2000, Percentage: 4.0, Status: "Active"}, // Liquid
		{WalletAddress: "1zPT...w2y5", Balance: 1500, Percentage: 3.0, Status: "Active"}, // Liquid
		{WalletAddress: "5hMY...z1x9", Balance: 1000, Percentage: 2.0, Status: "Staked"},
		{WalletAddress: "2bJQ...r3w8", Balance: 2500, Percentage: 5.0, Status: "Active"}, // Liquid
		{WalletAddress: "Empresa (Frozen)", Balance: 35000, Percentage: 70.0, Status: "System"},
	}, nil
}

func (s *SolanaService) GetReferralData() (*models.ReferralDashboard, error) {
	return &models.ReferralDashboard{
		TotalSponsors:           6, // Synced with Holder count
		TotalRewardsDistributed: 4500000000, // 4.5k USDC
		IsPaused:                false,
	}, nil
}
