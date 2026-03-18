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
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type Order struct {
	ID                   string     `json:"id" db:"id"`
	RestaurantID         string     `json:"restaurant_id" db:"restaurant_id"`
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

type RevenueDashboard struct {
	TotalRevenue      uint64 `json:"total_revenue"`
	PctReserved       uint16 `json:"pct_reserved"`        // 40%
	PctPublicAirdrop  uint16 `json:"pct_public_airdrop"`  // 30% (Unified)
	PctProjects       uint16 `json:"pct_projects"`        // 10%
	PctDonations      uint16 `json:"pct_donations"`       // 10%
	PctDevProgram     uint16 `json:"pct_dev_program"`     // 10%
	IsPaused          bool   `json:"is_paused"`
}

type StakingDashboard struct {
	CurrentPeriodID uint64    `json:"current_period_id"`
	StartDate       time.Time `json:"start_date"`
	EndDate         time.Time `json:"end_date"`
	PaymentDate     time.Time `json:"payment_date"`
	TotalStaked     uint64    `json:"total_staked"`
	StakingPool     uint64    `json:"staking_pool"`
	VipPool         uint64    `json:"vip_pool"`
	GlobalVipUnits  uint64    `json:"global_vip_units"` // Public Circulation / 100
	TotalUSDC       uint64    `json:"total_usdc"`
	RewardPerToken  string    `json:"reward_per_token"`
	Status          string    `json:"status"`
}

type HolderRecord struct {
	WalletAddress string  `json:"wallet_address"`
	Balance       float64 `json:"balance"`
	Percentage    float64 `json:"percentage"`
	Status        string  `json:"status"`
}

type ReferralDashboard struct {
	TotalSponsors           uint32 `json:"total_sponsors"`
	TotalRewardsDistributed uint64 `json:"total_rewards_distributed"`
	IsPaused                bool   `json:"is_paused"`
}
