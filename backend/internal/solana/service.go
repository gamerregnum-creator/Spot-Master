package solana

import (
	"fmt"
	"time"
	"github.com/megav/regna-revolution/backend/internal/models"
)

type SolanaService struct {
	// Aquí iría la conexión RPC de Solana (solana-go o similar)
}

func NewSolanaService() *SolanaService {
	return &SolanaService{}
}

// Simulation constants for a reactive-like mock environment
// REAL-DATA TODO: These constants will be replaced by on-chain state queries (getProgramAccounts/getAccountInfo)
const (
	simSpotSales         = 200000000000 // 200k USDC Total Sales
	simBridgeTotal       = 10000000000  // 10k Total Bridge Income (100%)
	simBridgeToStaking   = 7500000000   // 7.5k (75% of 10k Bridge)
	simSalesToStaking    = 60000000000  // 60k (30% of 200k Sales)
	simTotalStakingPool  = simSalesToStaking + simBridgeToStaking // 67.5k Integrated Pool
	simVipPool           = 10000000000  // 10k (5% of 200k)
)

func (s *SolanaService) GetRevenueData() (*models.RevenueDashboard, error) {
	// REAL-DATA TODO: Fetch multiple PDA balances from Solana RPC
	return &models.RevenueDashboard{
		TotalRevenue:     simSpotSales, 
		BridgeTotal:      simBridgeTotal,
		PctReserved:      4000,
		PctPublicAirdrop: 3000,
		PctProjects:      1000,
		PctDonations:     1000,
		PctDevProgram:    1000,
		IsPaused:         false,
		Wallets: []models.ContractWallet{
			// Group 1: STAKING POOL (Consolidated Integrated Pool)
			{Name: "WALLET_GROUP_1_1", Address: "7xKK2s6Sst89AAbAStaking7xKXCompany", OnChainBalance: (simTotalStakingPool * 40 / 100), BackendBalance: (simTotalStakingPool * 40 / 100)},
			{Name: "WALLET_GROUP_1_2", Address: "7xKK2s6Sst89AAbAStaking7xKXDonations", OnChainBalance: (simTotalStakingPool * 10 / 100), BackendBalance: (simTotalStakingPool * 10 / 100)},
			{Name: "WALLET_GROUP_1_3", Address: "7xKK2s6Sst89AAbAStaking7xKXDevelopment", OnChainBalance: (simTotalStakingPool * 10 / 100), BackendBalance: (simTotalStakingPool * 10 / 100)},
			{Name: "WALLET_GROUP_1_4", Address: "7xKK2s6Sst89AAbAStaking7xKXReinvest", OnChainBalance: (simTotalStakingPool * 10 / 100), BackendBalance: (simTotalStakingPool * 10 / 100)},
			{Name: "WALLET_GROUP_1_5", Address: "7xKK2s6Sst89AAbAStaking7xKXHolders", OnChainBalance: (simTotalStakingPool * 30 / 100), BackendBalance: (simTotalStakingPool * 30 / 100)},

			// Group 2: Spot Master Ecosystem (Sales Distribution)
			{Name: "WALLET_GROUP_2_1", Address: "7xKK2s6Sst89AAbAStaking7xKXReferral", OnChainBalance: (simSpotSales * 10 / 100), BackendBalance: (simSpotSales * 10 / 100)},
			{Name: "WALLET_GROUP_2_2", Address: "7xKK2s6Sst89AAbAStaking7xKXPrizeRanking", OnChainBalance: (simSpotSales * 20 / 100), BackendBalance: (simSpotSales * 20 / 100)},
			{Name: "WALLET_GROUP_2_3", Address: "7xKK2s6Sst89AAbAStaking7xKXNationalPool", OnChainBalance: (simSpotSales * 5 / 100), BackendBalance: (simSpotSales * 5 / 100)},
			{Name: "WALLET_GROUP_2_4", Address: "7xKK2s6Sst89AAbAStaking7xKXOperations", OnChainBalance: (simSpotSales * 20 / 100), BackendBalance: (simSpotSales * 20 / 100)},
			{Name: "WALLET_GROUP_2_5", Address: "7xKK2s6Sst89AAbAStaking7xKXPromoFund", OnChainBalance: (simSpotSales * 10 / 100), BackendBalance: (simSpotSales * 10 / 100)},
			{Name: "WALLET_GROUP_2_6", Address: "7xKK2s6Sst89AAbAStaking7xKXStakingWallet", OnChainBalance: simSalesToStaking, BackendBalance: simSalesToStaking},
			{Name: "WALLET_GROUP_2_7", Address: "7xKK2s6Sst89AAbAStaking7xKXVIPPool", OnChainBalance: simVipPool, BackendBalance: simVipPool},
			{Name: "WALLET_GROUP_2_8", Address: "7xKK2s6Sst89AAbAStaking7xKXVipUnits", OnChainBalance: 137, BackendBalance: 137},

			// Group 3: Bridge Income 
			{Name: "WALLET_GROUP_3_1", Address: "7xKK2s6Sst89AAbAStaking7xKXBridgeIncome", OnChainBalance: simBridgeTotal, BackendBalance: simBridgeTotal},
			{Name: "WALLET_GROUP_3_2", Address: "7xKK2s6Sst89AAbAStaking7xKXBridgePromo", OnChainBalance: (simBridgeTotal * 25 / 100), BackendBalance: (simBridgeTotal * 25 / 100)},
			{Name: "WALLET_GROUP_3_3", Address: "7xKK2s6Sst89AAbAStaking7xKXBridgeStake", OnChainBalance: simBridgeToStaking, BackendBalance: simBridgeToStaking},
		},
	}, nil
}

func (s *SolanaService) GetStakingData() (*models.StakingDashboard, error) {
	// REAL-DATA TODO: Load GlobalState and Period accounts from chain
	// Total Staked = 35,000 (Fixed) + 13,750 (Public) = 48,750
	publicStaked := uint64(13750)
	totalStaked := uint64(35000) + publicStaked

	return &models.StakingDashboard{
		CurrentPeriodID:    1,
		StartDate:          time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:            time.Date(2026, 3, 31, 23, 59, 59, 0, time.UTC),
		PaymentDate:        time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC),
		TotalStaked:        totalStaked,
		PublicStaked:       publicStaked,
		TotalSupply:        50000,
		StakingPool:        simSalesToStaking, // Accumulated 30% part
		VipPool:            simVipPool,
		GlobalVipUnits:     137, // floor(13750/100)
		TotalUSDC:          simTotalStakingPool,
		RewardPerToken:     fmt.Sprintf("%.2f", float64(simTotalStakingPool)/1000000.0/float64(totalStaked)),
		Status:             "Active",
		BridgeContribution: simBridgeToStaking, // 75% part
		ClaimWindowOpen:    false,
		StakingClosed:      true,
	}, nil
}

func (s *SolanaService) GetHolders() ([]models.HolderRecord, error) {
	// Total Supply: 50,000 tokens
	// SYSTEM: 35,000 (20k Company + 3x5k Protocol)
	// HUMAN: 15,000 (20 users, split 10 Staked / 10 Active, range 50-2500)
	return []models.HolderRecord{
		// SYSTEM WALLETS (35,000 Total)
		{WalletAddress: "7xKK2s6Sst89AAbAStaking7xKXCompany", Label: "Company", Type: "System", Balance: 20000, Percentage: 40.0, Status: "System"},
		{WalletAddress: "7xKK2s6Sst89AAbAStaking7xKXDonations", Label: "Donations", Type: "System", Balance: 5000, Percentage: 10.0, Status: "System"},
		{WalletAddress: "7xKK2s6Sst89AAbAStaking7xKXDevelopment", Label: "Development", Type: "System", Balance: 5000, Percentage: 10.0, Status: "System"},
		{WalletAddress: "7xKK2s6Sst89AAbAStaking7xKXReinvest", Label: "Reinvestment", Type: "System", Balance: 5000, Percentage: 10.0, Status: "System"},

		// HUMAN HOLDERS (15,000 Total, 20 Examples: 15 Staked, 5 Active)
		{WalletAddress: "Hdr01CYp3tSst89AAbAStaking7xKXExmpl01", Label: "Holder 01", Type: "Human", Balance: 2500, Percentage: 5.0, Status: "Staked"},
		{WalletAddress: "Hdr02CYp3tSst89AAbAStaking7xKXExmpl02", Label: "Holder 02", Type: "Human", Balance: 1500, Percentage: 3.0, Status: "Staked"},
		{WalletAddress: "Hdr03CYp3tSst89AAbAStaking7xKXExmpl03", Label: "Holder 03", Type: "Human", Balance: 1000, Percentage: 2.0, Status: "Staked"},
		{WalletAddress: "Hdr04CYp3tSst89AAbAStaking7xKXExmpl04", Label: "Holder 04", Type: "Human", Balance: 800, Percentage: 1.6, Status: "Staked"},
		{WalletAddress: "Hdr05CYp3tSst89AAbAStaking7xKXExmpl05", Label: "Holder 05", Type: "Human", Balance: 500, Percentage: 1.0, Status: "Staked"},
		{WalletAddress: "Hdr06CYp3tSst89AAbAStaking7xKXExmpl06", Label: "Holder 06", Type: "Human", Balance: 400, Percentage: 0.8, Status: "Staked"},
		{WalletAddress: "Hdr07CYp3tSst89AAbAStaking7xKXExmpl07", Label: "Holder 07", Type: "Human", Balance: 300, Percentage: 0.6, Status: "Staked"},
		{WalletAddress: "Hdr08CYp3tSst89AAbAStaking7xKXExmpl08", Label: "Holder 08", Type: "Human", Balance: 200, Percentage: 0.4, Status: "Staked"},
		{WalletAddress: "Hdr09CYp3tSst89AAbAStaking7xKXExmpl09", Label: "Holder 09", Type: "Human", Balance: 200, Percentage: 0.4, Status: "Staked"},
		{WalletAddress: "Hdr10CYp3tSst89AAbAStaking7xKXExmpl10", Label: "Holder 10", Type: "Human", Balance: 50, Percentage: 0.1, Status: "Staked"},
		// Users 11-15 Activated (Staked) as requested
		{WalletAddress: "Hdr11CYp3tSst89AAbAStaking7xKXExmpl11", Label: "Holder 11", Type: "Human", Balance: 2500, Percentage: 5.0, Status: "Staked"},
		{WalletAddress: "Hdr12CYp3tSst89AAbAStaking7xKXExmpl12", Label: "Holder 12", Type: "Human", Balance: 1500, Percentage: 3.0, Status: "Staked"},
		{WalletAddress: "Hdr13CYp3tSst89AAbAStaking7xKXExmpl13", Label: "Holder 13", Type: "Human", Balance: 1000, Percentage: 2.0, Status: "Staked"},
		{WalletAddress: "Hdr14CYp3tSst89AAbAStaking7xKXExmpl14", Label: "Holder 14", Type: "Human", Balance: 800, Percentage: 1.6, Status: "Staked"},
		{WalletAddress: "Hdr15CYp3tSst89AAbAStaking7xKXExmpl15", Label: "Holder 15", Type: "Human", Balance: 500, Percentage: 1.0, Status: "Staked"},
		// Users 16-20 stay Active (Liquid)
		{WalletAddress: "Hdr16CYp3tSst89AAbAStaking7xKXExmpl16", Label: "Holder 16", Type: "Human", Balance: 400, Percentage: 0.8, Status: "Active"},
		{WalletAddress: "Hdr17CYp3tSst89AAbAStaking7xKXExmpl17", Label: "Holder 17", Type: "Human", Balance: 300, Percentage: 0.6, Status: "Active"},
		{WalletAddress: "Hdr18CYp3tSst89AAbAStaking7xKXExmpl18", Label: "Holder 18", Type: "Human", Balance: 250, Percentage: 0.5, Status: "Active"},
		{WalletAddress: "Hdr19CYp3tSst89AAbAStaking7xKXExmpl19", Label: "Holder 19", Type: "Human", Balance: 200, Percentage: 0.4, Status: "Active"},
		{WalletAddress: "Hdr20CYp3tSst89AAbAStaking7xKXExmpl20", Label: "Holder 20", Type: "Human", Balance: 100, Percentage: 0.2, Status: "Active"},
	}, nil
}

func (s *SolanaService) GetReferralData() (*models.ReferralDashboard, error) {
	return &models.ReferralDashboard{
		TotalSponsors:           6, // Synced with Holder count
		TotalRewardsDistributed: 4500000000, // 4.5k USDC
		IsPaused:                false,
	}, nil
}

func (s *SolanaService) RouteRevenue(mode uint8, amount float64) error {
	// Program ID: Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
	// Instruction: ProcessRevenue
	modeStr := "STORE"
	if mode == 1 {
		modeStr = "SECTOR"
	}
	fmt.Printf("[SOLANA ROUTER] Routing %.2f USDC [%s Mode] through Revenue Router...\n", amount, modeStr)
	
	if mode == 1 {
		fmt.Println("  - Destination 1: Staking Vault (75%)")
		fmt.Println("  - Destination 2: Players Promotion Fund (25%)")
	} else {
		fmt.Println("  - Destination 1: Referral System (10%)")
		fmt.Println("  - Destination 2: Torneo Wallet (20%)")
		fmt.Println("  - Destination 3: VIP Pool Vault (5%)")
		fmt.Println("  - Destination 4: National Pool Wallet (5%)")
		fmt.Println("  - Destination 5: Staking Vault (30%)")
		fmt.Println("  - Destination 6: Ops Wallet (20%)")
		fmt.Println("  - Destination 7: Players Promotion Fund (10%)")
	}
	return nil
}
