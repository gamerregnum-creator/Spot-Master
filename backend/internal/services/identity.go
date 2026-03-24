package services

import (
	"database/sql"
	"fmt"
	"github.com/megav/regna-revolution/backend/internal/models"
)

type IdentityService struct {
	db *sql.DB
}

func NewIdentityService(db *sql.DB) *IdentityService {
	return &IdentityService{db: db}
}

func (s *IdentityService) SyncUserProfile(profile models.UserProfile) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Insert/Update User Profile
	_, err = tx.Exec(`
		INSERT INTO public.user_profiles (id, email, display_name, role)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO UPDATE SET
			email = EXCLUDED.email,
			display_name = EXCLUDED.display_name,
			updated_at = NOW()`,
		profile.ID, profile.Email, profile.DisplayName, profile.Role,
	)
	if err != nil {
		return fmt.Errorf("failed to sync profile: %v", err)
	}

	// 2. Auto-Create Wallet if not exists
	var walletID string
	err = tx.QueryRow(`SELECT id FROM public.wallets WHERE user_id = $1`, profile.ID).Scan(&walletID)
	if err == sql.ErrNoRows {
		_, err = tx.Exec(`
			INSERT INTO public.wallets (user_id, balance, wallet_type)
			VALUES ($1, 0, 'INTERNAL')`,
			profile.ID,
		)
		if err != nil {
			return fmt.Errorf("failed to auto-create wallet: %v", err)
		}
	}

	return tx.Commit()
}
