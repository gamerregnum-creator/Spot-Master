package services

import (
	"database/sql"
	"fmt"
	"math/rand"
	"time"

	"github.com/megav/regna-revolution/backend/internal/models"
)

type UnityPoolService struct {
	db *sql.DB
}

func NewUnityPoolService(db *sql.DB) *UnityPoolService {
	return &UnityPoolService{db: db}
}

// GetActivePool returns the active Rush Hour pool for a business, if any.
// Called by RevenueService during a sale to check if Rush Hour logic applies.
func (s *UnityPoolService) GetActivePool(businessID string) (*models.ActivePool, error) {
	var pool models.ActivePool
	err := s.db.QueryRow(`
		SELECT id, pool_contribution_pct, client_discount_pct
		FROM unity_pools
		WHERE merchant_id = $1 AND status = 'LIVE'
		LIMIT 1`,
		businessID,
	).Scan(&pool.ID, &pool.PoolContributionPct, &pool.ClientDiscountPct)
	if err == sql.ErrNoRows {
		return nil, nil // No active pool — normal sale
	}
	if err != nil {
		return nil, err
	}
	return &pool, nil
}

// RegisterContribution adds a client to the Rush Hour pool and accumulates their contribution.
// amount = originalPrice * pool_contribution_pct / 100  (calculated by RevenueService)
// Returns true if the pool reached its target (triggers raffle readiness).
func (s *UnityPoolService) RegisterContribution(poolID string, userID string, txID string, amount float64) (bool, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	// 0. Check if multi-entry is allowed
	var allowMulti bool
	err = tx.QueryRow("SELECT allow_multi_entry FROM unity_pools WHERE id = $1", poolID).Scan(&allowMulti)
	if err == nil && !allowMulti {
		var exists bool
		_ = tx.QueryRow(
			"SELECT EXISTS(SELECT 1 FROM unity_pool_participants WHERE pool_id = $1 AND user_id = $2)",
			poolID, userID,
		).Scan(&exists)
		if exists {
			return false, fmt.Errorf("user already participating and multi-entry is disabled")
		}
	}

	// 1. Increment participants and accumulated amount
	_, err = tx.Exec(`
		UPDATE unity_pools
		SET current_participants = current_participants + 1,
		    accumulated_amount   = accumulated_amount + $1,
		    updated_at           = NOW()
		WHERE id = $2 AND status = 'LIVE'
	`, amount, poolID)
	if err != nil {
		return false, err
	}

	// 2. Add participant record
	_, err = tx.Exec(`
		INSERT INTO unity_pool_participants (pool_id, user_id, transaction_id)
		VALUES ($1, $2, $3)
	`, poolID, userID, txID)
	if err != nil {
		return false, err
	}

	// 3. Check if rush-hour target reached → close automatically
	var current, target int
	err = tx.QueryRow(
		"SELECT current_participants, target_participants FROM unity_pools WHERE id = $1",
		poolID,
	).Scan(&current, &target)

	targetReached := false
	if err == nil && current >= target {
		_, _ = tx.Exec("UPDATE unity_pools SET status = 'WINNER' WHERE id = $1", poolID)
		targetReached = true
		fmt.Printf("[Rush Hour] Pool %s CLOSED: %d/%d participants. Pool: $%.2f — Raffle ready.\n",
			poolID, current, target, amount)
	}

	if err := tx.Commit(); err != nil {
		return false, err
	}
	return targetReached, nil
}

// PickWinner performs the random raffle and marks the pool as EXPIRED.
// Only callable when pool status = WINNER (target participants reached).
func (s *UnityPoolService) PickWinner(poolID string) (string, float64, error) {
	// 1. Verify pool is ready
	var totalAmount float64
	var status string
	err := s.db.QueryRow(
		"SELECT accumulated_amount, status FROM unity_pools WHERE id = $1",
		poolID,
	).Scan(&totalAmount, &status)
	if err != nil || status != "WINNER" {
		return "", 0, fmt.Errorf("pool not ready for raffle")
	}

	// 2. Get all participants
	rows, err := s.db.Query(
		"SELECT user_id FROM unity_pool_participants WHERE pool_id = $1",
		poolID,
	)
	if err != nil {
		return "", 0, err
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var uid string
		if err := rows.Scan(&uid); err == nil {
			userIDs = append(userIDs, uid)
		}
	}
	if len(userIDs) == 0 {
		return "", 0, fmt.Errorf("no participants")
	}

	// 3. Random pick
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	winnerID := userIDs[r.Intn(len(userIDs))]

	// 4. Close pool
	_, _ = s.db.Exec("UPDATE unity_pools SET status = 'EXPIRED' WHERE id = $1", poolID)
	fmt.Printf("[Rush Hour] Raffle complete. Winner: %s | Prize: $%.2f\n", winnerID, totalAmount)

	return winnerID, totalAmount, nil
}
