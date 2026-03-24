package services

import (
	"database/sql"
	"fmt"
	"github.com/megav/regna-revolution/backend/internal/solana"
)

type RevenueService struct {
	db         *sql.DB
	unityPool  *UnityPoolService
	solanaServ *solana.SolanaService
}

func NewRevenueService(db *sql.DB, unityPool *UnityPoolService, solanaServ *solana.SolanaService) *RevenueService {
	return &RevenueService{
		db:         db,
		unityPool:  unityPool,
		solanaServ: solanaServ,
	}
}

// DistributeFunds processes a Store sale:
// - saleTotal: precio ORIGINAL del artículo (antes del descuento Rush Hour si aplica)
// - userID: cliente que realizó la compra (para el pool)
// - orderID: referencia de la orden/transacción
func (s *RevenueService) DistributeFunds(businessID string, saleTotal float64, userID string, orderID string) error {
	// 1. Fetch commission rate for this business (5–20%, section default or override)
	var baseRate float64
	var override *float64
	err := s.db.QueryRow(`
		SELECT s.default_commission_rate, b.commission_rate_override
		FROM public.businesses b
		JOIN public.business_sections s ON b.section_id = s.id
		WHERE b.id = $1`, businessID,
	).Scan(&baseRate, &override)
	if err != nil {
		return fmt.Errorf("could not fetch business info: %v", err)
	}

	finalRate := baseRate
	if override != nil {
		finalRate = *override
	}

	// Solo procesamos el % de comisión acordado; el resto queda con el Store.
	commissionAmount := (saleTotal * finalRate) / 100.0
	partAmount := commissionAmount / 5.0

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 2. Split en 5 partes iguales
	categories := []string{"CASHBACK", "MERCHANT_REFERRER", "CUSTOMER_SPONSOR", "CLIENT_POOL"}
	for _, cat := range categories {
		if err := s.recordDistribution(tx, businessID, partAmount, "ECOSYSTEM_"+cat); err != nil {
			return err
		}
	}

	// 3. 5ª parte (Company Share): 50% reservado, 50% → Bridge SECTOR
	companyShare := partAmount
	if err := s.recordDistribution(tx, businessID, companyShare*0.50, "ECOSYSTEM_RESERVED"); err != nil {
		return err
	}
	solanaBridgeAmount := companyShare * 0.50
	if err := s.recordDistribution(tx, businessID, solanaBridgeAmount, "SOLANA_BRIDGE_POOL"); err != nil {
		return err
	}
	if err := s.solanaServ.RouteRevenue(1, solanaBridgeAmount); err != nil {
		fmt.Printf("Warning: Solana Router failed: %v\n", err)
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// 4. Rush Hour (Unity Pool) — fuera de la TX principal, no bloquea la venta
	pool, err := s.unityPool.GetActivePool(businessID)
	if err == nil && pool != nil {
		// pool_contribution_pct = 50% de la diferencia (rush_hour_rate - base_rate)
		// saleTotal es el precio original (antes del descuento ya aplicado al cliente)
		poolAmount := saleTotal * pool.PoolContributionPct / 100.0
		if poolAmount > 0 {
			targetReached, poolErr := s.unityPool.RegisterContribution(pool.ID, userID, orderID, poolAmount)
			if poolErr != nil {
				fmt.Printf("Warning: Unity Pool contribution failed: %v\n", poolErr)
			} else if targetReached {
				fmt.Printf("[Rush Hour] Pool %s closed — raffle ready!\n", pool.ID)
			}
		}
	}

	fmt.Printf("[Sale] Business=%s Total=%.2f Commission(%.0f%%)=%.2f Bridge=%.2f\n",
		businessID, saleTotal, finalRate, commissionAmount, solanaBridgeAmount)
	return nil
}

func (s *RevenueService) DistributeLicenseFunds(licenseID string, totalAmount float64, consultantCut float64, poolCut float64) error {
	return s.DistributeServiceFunds(licenseID, "LICENSE", totalAmount, consultantCut, poolCut)
}

func (s *RevenueService) DistributeServiceFunds(serviceID string, serviceType string, totalAmount float64, consultantCut float64, poolCut float64) error {
	netProfit := totalAmount - consultantCut - poolCut
	
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Regla fija: 50% se reserva en backend (cubre gastos del Sector),
	// 50% se envía al Bridge → Staking 75% / Promociones 25%.
	// El Store es un comercio independiente; no procesamos sus ganancias aquí.
	solanaBridgeAmount := netProfit * 0.50
	backendReserved := netProfit * 0.50

	if err := s.recordDistribution(tx, serviceID, backendReserved, "ECOSYSTEM_RESERVED"); err != nil {
		return err
	}

	// Record Consultant Cut
	if err := s.recordDistribution(tx, serviceID, consultantCut, "CONSULTANT_CUT"); err != nil {
		return err
	}

	// Record Client Pool Cut
	if err := s.recordDistribution(tx, serviceID, poolCut, "CLIENT_POOL_CUT"); err != nil {
		return err
	}

	// Record Bridge Allocation (50% del net profit → Bridge → Mode 1 SECTOR)
	if err := s.recordDistribution(tx, serviceID, solanaBridgeAmount, "SOLANA_BRIDGE_POOL"); err != nil {
		return err
	}

	// SECTOR mode (1): 75% Staking Vault, 25% Promociones
	if err := s.solanaServ.RouteRevenue(1, solanaBridgeAmount); err != nil {
		fmt.Printf("Warning: Solana Router failed: %v\n", err)
	}

	fmt.Printf("%s Distribution: Total=%.2f, Reserved=%.2f, Bridge=%.2f (SECTOR Mode)\n", serviceType, totalAmount, backendReserved, solanaBridgeAmount)
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
