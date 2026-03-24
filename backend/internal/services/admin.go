package services

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/megav/regna-revolution/backend/internal/models"
)

type AdminService struct {
	db       *sql.DB
	isPaused bool
}

func NewAdminService(db *sql.DB) *AdminService {
	return &AdminService{db: db}
}

// GetRevenueLogs returns the last N entries from revenue_logs.
func (s *AdminService) GetRevenueLogs(limit int) ([]models.RevenueLog, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.db.Query(`
		SELECT id, reference_id, amount, entry_type, created_at
		FROM public.revenue_logs
		ORDER BY created_at DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.RevenueLog
	for rows.Next() {
		var l models.RevenueLog
		if err := rows.Scan(&l.ID, &l.ReferenceID, &l.Amount, &l.EntryType, &l.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, l)
	}
	return logs, nil
}

// UpdateHolderWallet replaces a holder's on-chain wallet address.
// This is an emergency admin operation for lost/compromised wallets.
// The on-chain change will be executed separately via guardian multisig.
func (s *AdminService) UpdateHolderWallet(req models.WalletUpdateRequest) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec(`
		UPDATE public.wallets
		SET wallet_address = $1, updated_at = NOW()
		WHERE user_id = $2 AND wallet_address = $3`,
		req.NewWallet, req.UserID, req.OldWallet,
	)
	if err != nil {
		return fmt.Errorf("wallet update failed: %v", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("no wallet matched: user=%s old=%s", req.UserID, req.OldWallet)
	}

	// Audit log
	_, err = tx.Exec(`
		INSERT INTO public.revenue_logs (reference_id, amount, entry_type)
		VALUES ($1, 0, $2)`,
		req.UserID,
		fmt.Sprintf("WALLET_UPDATE:%s->%s reason:%s", req.OldWallet, req.NewWallet, req.Reason),
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// TogglePause flips the contract pause state (in-memory stub until on-chain).
// Returns the new pause state.
func (s *AdminService) TogglePause() bool {
	s.isPaused = !s.isPaused
	state := "RESUMED"
	if s.isPaused {
		state = "PAUSED"
	}
	fmt.Printf("[ADMIN] Contract %s at %s — on-chain call required to finalize\n", state, time.Now().Format(time.RFC3339))
	return s.isPaused
}

// IsPaused returns the current pause state.
func (s *AdminService) IsPaused() bool {
	return s.isPaused
}

// TriggerCompanyDistribute is a stub for the on-chain company dividend distribution.
// Will call distribute_company_dividends() on the staking contract when deployed.
func (s *AdminService) TriggerCompanyDistribute() error {
	// REAL-DATA TODO: Call staking contract distribute_company_dividends()
	// 4/7 → Company, 1/7 → Donations, 1/7 → Development, 1/7 → Reinvestment
	fmt.Println("[ADMIN] Company dividend distribution triggered — on-chain call required")
	return nil
}

// RegisterSponsor creates a sponsor↔player referral relationship.
func (s *AdminService) RegisterSponsor(sponsorWallet, playerUserID string) error {
	_, err := s.db.Exec(`
		UPDATE public.user_profiles
		SET referred_by = $1, updated_at = NOW()
		WHERE id = $2`,
		sponsorWallet, playerUserID,
	)
	if err != nil {
		return fmt.Errorf("sponsor registration failed: %v", err)
	}
	fmt.Printf("[ADMIN] Sponsor %s registered for player %s\n", sponsorWallet, playerUserID)
	return nil
}
