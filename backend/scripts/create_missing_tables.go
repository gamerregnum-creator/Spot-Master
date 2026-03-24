//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("DB_URL env var required")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	migrations := []struct {
		name string
		sql  string
	}{
		{
			name: "unity_pool_status_enum",
			sql: `DO $$ BEGIN
				CREATE TYPE public.unity_pool_status AS ENUM ('LIVE', 'WINNER', 'EXPIRED');
			EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
		},
		{
			name: "unity_pools",
			sql: `CREATE TABLE IF NOT EXISTS public.unity_pools (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				merchant_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
				status public.unity_pool_status DEFAULT 'LIVE',
				target_participants INTEGER NOT NULL DEFAULT 200
					CONSTRAINT chk_target_range CHECK (target_participants BETWEEN 100 AND 500),
				current_participants INTEGER NOT NULL DEFAULT 0,
				accumulated_amount DECIMAL(14,4) NOT NULL DEFAULT 0,
				base_commission_pct    DECIMAL(5,2) NOT NULL,
				rush_hour_commission_pct DECIMAL(5,2) NOT NULL,
				client_discount_pct    DECIMAL(5,2) NOT NULL,
				pool_contribution_pct  DECIMAL(5,2) NOT NULL,
				CONSTRAINT chk_rush_hour_gt_base CHECK (rush_hour_commission_pct > base_commission_pct),
				CONSTRAINT chk_pcts_consistent CHECK (
					client_discount_pct = (rush_hour_commission_pct - base_commission_pct) / 2 AND
					pool_contribution_pct = (rush_hour_commission_pct - base_commission_pct) / 2
				),
				allow_multi_entry BOOLEAN DEFAULT false,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			);`,
		},
		{
			name: "unity_pool_participants",
			sql: `CREATE TABLE IF NOT EXISTS public.unity_pool_participants (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				pool_id UUID NOT NULL REFERENCES public.unity_pools(id) ON DELETE CASCADE,
				user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
				transaction_id UUID,
				joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			);`,
		},
		{
			name: "unity_participants_index",
			sql: `CREATE INDEX IF NOT EXISTS idx_unity_participants_pool_user
				ON public.unity_pool_participants(pool_id, user_id);`,
		},
		{
			name: "unity_pools_rls",
			sql: `ALTER TABLE public.unity_pools ENABLE ROW LEVEL SECURITY;`,
		},
		{
			name: "unity_pool_participants_rls",
			sql: `ALTER TABLE public.unity_pool_participants ENABLE ROW LEVEL SECURITY;`,
		},
		{
			name: "revenue_logs",
			sql: `CREATE TABLE IF NOT EXISTS public.revenue_logs (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				reference_id TEXT NOT NULL,
				amount DECIMAL(14,4) NOT NULL,
				entry_type TEXT NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			);`,
		},
		{
			name: "revenue_logs_index",
			sql: `CREATE INDEX IF NOT EXISTS idx_revenue_logs_ref ON public.revenue_logs(reference_id);`,
		},
		{
			name: "staking_actions",
			sql: `CREATE TABLE IF NOT EXISTS public.staking_actions (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				wallet_id TEXT NOT NULL,
				amount DECIMAL(14,4) NOT NULL,
				action_type TEXT NOT NULL DEFAULT 'STAKE',
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			);`,
		},
	}

	for _, m := range migrations {
		fmt.Printf("→ %s... ", m.name)
		if _, err := db.Exec(m.sql); err != nil {
			fmt.Printf("FAILED: %v\n", err)
		} else {
			fmt.Println("OK")
		}
	}

	fmt.Println("\nDone.")
}
