package models

import "time"

type UnityPoolStatus string

const (
	UnityPoolStatusLive    UnityPoolStatus = "LIVE"
	UnityPoolStatusWinner  UnityPoolStatus = "WINNER"
	UnityPoolStatusExpired UnityPoolStatus = "EXPIRED"
)

type UnityPool struct {
	ID                   string          `json:"id" db:"id"`
	MerchantID           string          `json:"merchant_id" db:"merchant_id"`
	Status               UnityPoolStatus `json:"status" db:"status"`
	TargetParticipants   int             `json:"target_participants" db:"target_participants"`   // 100–500
	CurrentParticipants  int             `json:"current_participants" db:"current_participants"`
	AccumulatedAmount    float64         `json:"accumulated_amount" db:"accumulated_amount"`
	BaseCommissionPct    float64         `json:"base_commission_pct" db:"base_commission_pct"`       // Ej: 5% (del Sector)
	RushHourCommissionPct float64        `json:"rush_hour_commission_pct" db:"rush_hour_commission_pct"` // Ej: 20% (lo pone el merchant)
	// Calculados automáticamente (difference = rush - base):
	ClientDiscountPct    float64         `json:"client_discount_pct" db:"client_discount_pct"`       // 50% de la diferencia
	PoolContributionPct  float64         `json:"pool_contribution_pct" db:"pool_contribution_pct"`   // 50% de la diferencia
	AllowMultiEntry      bool            `json:"allow_multi_entry" db:"allow_multi_entry"`
	CreatedAt            time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at" db:"updated_at"`
}

// ActivePool holds the minimal info needed during a sale to apply Rush Hour logic.
type ActivePool struct {
	ID                  string
	PoolContributionPct float64 // % del precio original que va al pool
	ClientDiscountPct   float64 // % de descuento que ya fue aplicado al cliente
}

type UnityPoolParticipant struct {
	ID            string    `json:"id" db:"id"`
	PoolID        string    `json:"pool_id" db:"pool_id"`
	UserID        string    `json:"user_id" db:"user_id"`
	TransactionID string    `json:"transaction_id" db:"transaction_id"`
	JoinedAt      time.Time `json:"joined_at" db:"joined_at"`
}
