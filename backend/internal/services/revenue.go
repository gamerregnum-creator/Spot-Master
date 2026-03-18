package services

import (
	"database/sql"
	"fmt"
	"math"
)

type RevenueService struct {
	db *sql.DB
}

func NewRevenueService(db *sql.DB) *RevenueService {
	return &RevenueService{db: db}
}

func (s *RevenueService) DistributeFunds(id string) error {
	// Placeholder logic for Revenue Router
	// In Regna Revolution, this would interact with Solana or a local ledger
	
	total := 100.0 // Mock amount
	
	// Regla 95-1-1-1-1-1 (Platform, Burn, Rewards, etc.)
	pctPlatform := math.Floor(total*0.95*10000) / 10000
	pctRewards := math.Floor(total*0.01*10000) / 10000

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Logic to record distribution in DB
	err = s.recordDistribution(tx, id, pctPlatform, "PLATFORM_FEE")
	if err != nil {
		return err
	}

	err = s.recordDistribution(tx, id, pctRewards, "USER_REWARDS")
	if err != nil {
		return err
	}

	fmt.Printf("Revenue distribution for %s completed\n", id)
	return tx.Commit()
}

func (s *RevenueService) recordDistribution(tx *sql.Tx, refID string, amount float64, Type string) error {
	// Check if table exists or just skip if it's a mock
	_, err := tx.Exec(`
		INSERT INTO public.revenue_logs (reference_id, amount, entry_type)
		VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		refID, amount, Type,
	)
	return err
}
