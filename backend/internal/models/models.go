package models

import (
	"time"
)

type UserProfile struct {
	ID          string    `json:"id" db:"id"`
	Email       string    `json:"email" db:"email"`
	DisplayName string    `json:"display_name" db:"display_name"`
	Role        string    `json:"role" db:"role"`
	ReferredBy  *string   `json:"referred_by" db:"referred_by"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	AutoRestake bool      `json:"auto_restake" db:"auto_restake"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type Order struct {
	ID                   string     `json:"id" db:"id"`
	BusinessID           string     `json:"business_id" db:"business_id"`
	UserID               string     `json:"user_id" db:"user_id"`
	TotalAmount          float64    `json:"total_amount" db:"total_amount"`
	Status               string     `json:"status" db:"status"`
	PrepStartTime        *time.Time `json:"estimated_prep_start_time" db:"estimated_prep_start_time"`
	PickupTime           *time.Time `json:"estimated_pickup_time" db:"estimated_pickup_time"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
}

type OrderItem struct {
	ID        string `json:"id" db:"id"`
	OrderID   string `json:"order_id" db:"order_id"`
	MenuItemID string `json:"menu_item_id" db:"menu_item_id"`
	Quantity  int    `json:"quantity" db:"quantity"`
}

type MenuItem struct {
	ID                       string  `json:"id" db:"id"`
	BusinessID               string  `json:"business_id" db:"business_id"`
	Name                     string  `json:"name" db:"name"`
	BatchCapacity            int     `json:"batch_capacity" db:"batch_capacity"`
	EstimatedPrepTimeSecs    int     `json:"estimated_prep_time_secs" db:"estimated_prep_time_secs"`
}

type LedgerEntry struct {
	ID          string    `json:"id" db:"id"`
	WalletID    string    `json:"wallet_id" db:"wallet_id"`
	Amount      float64   `json:"amount" db:"amount"`
	EntryType   string    `json:"entry_type" db:"entry_type"` // e.g., 'SALE_DISTRIBUTION'
	ReferenceID string    `json:"reference_id" db:"reference_id"` // e.g., orderId
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type ContractWallet struct {
	Name           string  `json:"name"`
	Address        string  `json:"address"`
	OnChainBalance float64 `json:"on_chain_balance"`
	BackendBalance float64 `json:"backend_balance"`
}

type RevenueDashboard struct {
	TotalRevenue      uint64           `json:"total_revenue"`
	BridgeTotal       uint64           `json:"bridge_total"`
	PctReserved       uint16           `json:"pct_reserved"`       // 40%
	PctPublicAirdrop  uint16           `json:"pct_public_airdrop"` // 30% (Unified)
	PctProjects       uint16           `json:"pct_projects"`       // 10%
	PctDonations      uint16           `json:"pct_donations"`      // 10%
	PctDevProgram     uint16           `json:"pct_dev_program"`    // 10%
	IsPaused          bool             `json:"is_paused"`
	Wallets           []ContractWallet `json:"wallets"`
}

type StakingDashboard struct {
	CurrentPeriodID    uint64    `json:"current_period_id"`
	StartDate          time.Time `json:"start_date"`
	EndDate            time.Time `json:"end_date"`
	PaymentDate        time.Time `json:"payment_date"`
	TotalStaked        uint64    `json:"total_staked"`
	PublicStaked       uint64    `json:"public_staked"`
	TotalSupply        uint64    `json:"total_supply"`
	StakingPool        uint64    `json:"staking_pool"`
	VipPool            uint64    `json:"vip_pool"`
	GlobalVipUnits     uint64    `json:"global_vip_units"` // Public Circulation / 100
	TotalUSDC          uint64    `json:"total_usdc"`
	RewardPerToken     string    `json:"reward_per_token"`
	Status             string    `json:"status"`
	BridgeContribution uint64    `json:"bridge_contribution"`
	ClaimWindowOpen    bool      `json:"claim_window_open"`
	StakingClosed      bool      `json:"staking_closed"`
}

type HolderRecord struct {
	WalletAddress string  `json:"wallet_address"`
	Label         string  `json:"label"`
	Type          string  `json:"type"`
	Balance       float64 `json:"balance"`
	Percentage    float64 `json:"percentage"`
	Status        string  `json:"status"`
}

type ReferralDashboard struct {
	TotalSponsors           uint32 `json:"total_sponsors"`
	TotalRewardsDistributed uint64 `json:"total_rewards_distributed"`
	IsPaused                bool   `json:"is_paused"`
}

type Wallet struct {
	ID            string    `json:"id" db:"id"`
	UserID        string    `json:"user_id" db:"user_id"`
	WalletAddress string    `json:"wallet_address" db:"wallet_address"`
	Balance       float64   `json:"balance" db:"balance"`
	WalletType    string    `json:"wallet_type" db:"wallet_type"` // INTERNAL, SOLANA
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type RevenueLog struct {
	ID          string    `json:"id"`
	ReferenceID string    `json:"reference_id"`
	Amount      float64   `json:"amount"`
	EntryType   string    `json:"entry_type"`
	CreatedAt   time.Time `json:"created_at"`
}

type SponsorRecord struct {
	WalletAddress string  `json:"wallet_address"`
	TotalReferrals int    `json:"total_referrals"`
	TotalEarned   float64 `json:"total_earned"`
	Status        string  `json:"status"`
}

type ReferralDashboardFull struct {
	TotalSponsors           uint32         `json:"total_sponsors"`
	TotalRewardsDistributed uint64         `json:"total_rewards_distributed"`
	IsPaused                bool           `json:"is_paused"`
	TopSponsors             []SponsorRecord `json:"top_sponsors"`
}

type WalletUpdateRequest struct {
	UserID        string `json:"user_id"`
	OldWallet     string `json:"old_wallet"`
	NewWallet     string `json:"new_wallet"`
	Reason        string `json:"reason"`
}

type BusinessSection struct {
	ID                    string  `json:"id" db:"id"`
	Name                  string  `json:"name" db:"name"`
	DefaultCommissionRate float64 `json:"default_commission_rate" db:"default_commission_rate"`
}

type Business struct {
	ID                     string  `json:"id" db:"id"`
	SectionID              string  `json:"section_id" db:"section_id"`
	Name                   string  `json:"name" db:"name"`
	OwnerID                string  `json:"owner_id" db:"owner_id"`
	CommissionRateOverride *float64 `json:"commission_rate_override" db:"commission_rate_override"`
	Status                 string  `json:"status" db:"status"`
}
