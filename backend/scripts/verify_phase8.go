package main

import (
	"fmt"
)

// Simplified logic for verification
func simulateDistribution() {
	fmt.Println("=== REGNA REVOLUTION PHASE 8 VERIFICATION ===")

	totalBridge := 0.0
	totalRegnaOps := 0.0
	totalClientPool := 0.0
	totalConsultants := 0.0

	// 1. Licenses
	licGross := 10000.0
	licConsultant := 2000.0 // 20%
	licPool := 1000.0       // 10%
	licNet := licGross - licConsultant - licPool
	licBridge := licNet * 0.5
	licOps := licNet * 0.5
	
	totalBridge += licBridge
	totalRegnaOps += licOps
	totalClientPool += licPool
	totalConsultants += licConsultant

	fmt.Printf("[LICENSE] Gross: %.0f | Bridge: %.0f (Mode 1) | Ops: %.0f\n", licGross, licBridge, licOps)

	// 2. Ads
	adsGross := 50000.0
	adsConsultant := 10000.0 // 20%
	adsPool := 5000.0        // 10%
	adsNet := adsGross - adsConsultant - adsPool
	adsBridge := adsNet * 0.5
	adsOps := adsNet * 0.5

	totalBridge += adsBridge
	totalRegnaOps += adsOps
	totalClientPool += adsPool
	totalConsultants += adsConsultant

	fmt.Printf("[ADS]     Gross: %.0f | Bridge: %.0f (Mode 1) | Ops: %.0f\n", adsGross, adsBridge, adsOps)

	// 3. Merchant (Global Sales $100k)
	merchantSales := 100000.0
	merchantComm := merchantSales * 0.10 // 10%
	// Split in 5 parts
	mPart := merchantComm / 5.0 // $2,000 each
	
	mConsultant := mPart
	mPool := mPart
	mCashback := mPart
	mSponsor := mPart
	mCompany := mPart
	
	mBridge := mCompany * 0.5
	mOps := mCompany * 0.5

	totalBridge += mBridge
	totalRegnaOps += mOps
	totalClientPool += mPool
	totalConsultants += mConsultant

	fmt.Printf("[MERCHANT] Sales: %.0f | Comm: %.0f | Bridge: %.0f (Mode 1) | Ops: %.0f\n", merchantSales, merchantComm, mBridge, mOps)
	fmt.Printf("           Rewards: Cashback: %.0f, Sponsor: %.0f, Pool: %.0f, Consultant: %.0f\n", mCashback, mSponsor, mPool, mConsultant)

	// 4. Store (Spot Master Ingame)
	storeGross := 200000.0
	storeBridge := storeGross // 100%
	storeOps := 0.0

	totalBridge += storeBridge
	totalRegnaOps += storeOps

	fmt.Printf("[STORE]    Gross: %.0f | Bridge: %.0f (Mode 0) | Ops: %.0f\n", storeGross, storeBridge, storeOps)

	fmt.Println("-------------------------------------------")
	fmt.Printf("FINAL TOTALS:\n")
	fmt.Printf(" - Solana Bridge:     $%.0f USDC (Target: 222,000)\n", totalBridge)
	fmt.Printf(" - Regna Operations:   $%.0f USDC (Target: 22,000)\n", totalRegnaOps)
	fmt.Printf(" - Regna Client Pool: $%.0f USDC (Target: 8,000)\n", totalClientPool)
	fmt.Printf(" - Total Consultants: $%.0f USDC (Target: 14,000)\n", totalConsultants)
	fmt.Println("=== VERIFICATION COMPLETED ===")
}

func main() {
	simulateDistribution()
}
