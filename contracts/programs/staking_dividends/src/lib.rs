use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("5xQxJSWmFTiGyhbG2vz3F5J3CDi1xsqC3DNXf2Grbxwe");

// Precisión de 6 decimales para cálculos de rewards
const PRECISION: u128 = 1_000_000;
const TIMELOCK_SECONDS: i64 = 86_400; // 24 horas
const CYCLE_DAYS: i64 = 88;
const CYCLE_SECONDS: i64 = CYCLE_DAYS * 86_400; // 7,603,200 segundos

// ============================================================================
// CICLOS PRE-FIJADOS (en Unix timestamp)
// Los periodos están hard-codeados para eliminar cualquier error humano
// Estos timestamps corresponden a fechas reales que se actualizarán antes del
// despliegue a Mainnet. En Devnet son referencias de prueba.
// ============================================================================
pub const CYCLE_SCHEDULE: [(u64, i64, i64, i64); 6] = [
    // (period_id, start_date, end_date, payment_date)
    // Ciclo 1: 01 Apr 2026 → 28 Jun 2026, pago 05 Jul 2026
    (1, 1743465600, 1751068800, 1751673600),
    // Ciclo 2: 29 Jun 2026 → 24 Sep 2026, pago 01 Oct 2026
    (2, 1751155200, 1758758400, 1759363200),
    // Ciclo 3: 25 Sep 2026 → 21 Dec 2026, pago 28 Dec 2026
    (3, 1758844800, 1766448000, 1767052800),
    // Ciclo 4: 22 Dec 2026 → 19 Mar 2027, pago 26 Mar 2027
    (4, 1766534400, 1774137600, 1774742400),
    // Ciclo 5: 20 Mar 2027 → 15 Jun 2027, pago 22 Jun 2027
    (5, 1774224000, 1781827200, 1782432000),
    // Ciclo 6: 16 Jun 2027 → 11 Sep 2027, pago 18 Sep 2027
    (6, 1781913600, 1789516800, 1790121600),
];

#[program]
pub mod staking_dividends {
    use super::*;

    // ========================================================================
    //  INICIALIZACIÓN
    // ========================================================================

    /// Inicializa el protocolo de staking y perma-stakea los tokens de empresa.
    /// Los `company_tokens` se transfieren directamente al vault y quedan
    /// bloqueados permanentemente — nunca pueden ser retirados.
    pub fn initialize(
        ctx: Context<Initialize>,
        company_tokens: u64,
        min_stake: u64,
        vip_unit: u64,
    ) -> Result<()> {
        let s = &mut ctx.accounts.global_state;
        s.admin1 = ctx.accounts.admin1.key();
        s.admin2 = ctx.accounts.admin2.key();
        s.token_mint = ctx.accounts.token_mint.key();
        s.usdc_mint = ctx.accounts.usdc_mint.key();
        s.company_tokens = company_tokens;
        s.guardian = ctx.accounts.guardian.key();
        s.company_tokens_locked = true; // Marcados como perma-stakeados
        s.wallet_empresa = ctx.accounts.wallet_empresa.key();
        s.wallet_donaciones = ctx.accounts.wallet_donaciones.key();
        s.wallet_reinversion = ctx.accounts.wallet_reinversion.key();
        s.wallet_desarrollo = ctx.accounts.wallet_desarrollo.key();
        s.min_stake_amount = min_stake;
        s.vip_unit_size = vip_unit;
        s.current_period_id = 0;
        s.total_staked = 0;
        s.is_paused = false;
        s.proposal_count = 0;
        s.bump = ctx.bumps.global_state;

        // Perma-staking: transferir tokens de empresa al vault.
        // Quedan bloqueados aquí para siempre — no hay instrucción de retiro.
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.company_token_source.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.admin1.to_account_info(),
                },
            ),
            company_tokens,
        )?;

        emit!(CompanyTokensLocked {
            amount: company_tokens,
            vault: ctx.accounts.token_vault.key(),
        });
        Ok(())
    }

    // ========================================================================
    //  STAKING (operacional, cualquier admin)
    // ========================================================================

    /// Activa el siguiente ciclo pre-fijado. El admin pasa el next_period_id
    /// que se valida contra el schedule oficial antes de crear el periodo.
    pub fn activate_next_period(ctx: Context<ActivatePeriod>, next_period_id: u64) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        require!(next_period_id == state.current_period_id + 1, StakingError::InvalidPeriodId);

        // Buscar el ciclo en el schedule pre-fijado
        let cycle = CYCLE_SCHEDULE
            .iter()
            .find(|(id, _, _, _)| *id == next_period_id)
            .ok_or(StakingError::InvalidPeriodId)?;

        let (period_id, start_date, end_date, payment_date) = *cycle;

        let p = &mut ctx.accounts.period;
        p.period_id = period_id;
        p.start_date = start_date;
        p.end_date = end_date;
        p.payment_date = payment_date;
        p.total_private_staked = 0;
        p.total_usdc = 0;
        p.reward_per_token = 0;
        p.status = PeriodStatus::Active;
        p.bump = ctx.bumps.period;

        state.current_period_id = period_id;
        emit!(PeriodCreated { period_id, start_date, end_date, payment_date });
        Ok(())
    }

    /// Para casos especiales de auditoría: Admin puede crear un ciclo personalizado,
    /// pero SOLO si sus fechas coinciden exactamente con el schedule pre-fijado.
    pub fn create_period(
        ctx: Context<CreatePeriod>,
        period_id: u64,
        start_date: i64,
        end_date: i64,
        payment_date: i64,
    ) -> Result<()> {
        // Validar contra el schedule oficial — no se permite inventar fechas
        let valid = CYCLE_SCHEDULE.iter().any(|(sid, ss, se, sp)| {
            *sid == period_id && *ss == start_date && *se == end_date && *sp == payment_date
        });
        require!(valid, StakingError::ScheduleMismatch);

        require!(end_date > start_date, StakingError::InvalidDates);
        require!(payment_date > end_date, StakingError::InvalidDates);
        let duration = end_date.checked_sub(start_date).ok_or(StakingError::MathOverflow)?;
        require!(duration == CYCLE_SECONDS, StakingError::InvalidCycleDuration);

        let p = &mut ctx.accounts.period;
        p.period_id = period_id;
        p.start_date = start_date;
        p.end_date = end_date;
        p.payment_date = payment_date;
        p.total_private_staked = 0;
        p.total_usdc = 0;
        p.reward_per_token = 0;
        p.status = PeriodStatus::Active;
        p.bump = ctx.bumps.period;

        ctx.accounts.global_state.current_period_id = period_id;
        emit!(PeriodCreated { period_id, start_date, end_date, payment_date });
        Ok(())
    }

    /// Holder stakea tokens para el periodo activo. Mínimo: min_stake_amount.
    pub fn stake_tokens(ctx: Context<StakeTokens>, amount: u64) -> Result<()> {
        let state = &ctx.accounts.global_state;
        let period = &mut ctx.accounts.period;
        require!(!state.is_paused, StakingError::ContractPaused);
        require!(amount >= state.min_stake_amount, StakingError::BelowMinimum);
        require!(period.status == PeriodStatus::Active, StakingError::PeriodNotActive);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < period.start_date, StakingError::PeriodAlreadyStarted);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.holder_token_ata.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.holder.to_account_info(),
                },
            ),
            amount,
        )?;

        let e = &mut ctx.accounts.stake_entry;
        e.holder = ctx.accounts.holder.key();
        e.period_id = period.period_id;
        e.amount = amount;
        e.staked_at = clock.unix_timestamp;
        e.is_dividend_claimed = false;
        e.is_tokens_returned = false;
        e.bump = ctx.bumps.stake_entry;
        period.total_private_staked = period
            .total_private_staked
            .checked_add(amount)
            .ok_or(StakingError::MathOverflow)?;
        emit!(TokensStaked { holder: e.holder, period_id: period.period_id, amount });
        Ok(())
    }

    /// Admin deposita USDC acumulado para un periodo.
    pub fn deposit_staking_usdc(ctx: Context<DepositUsdc>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::InvalidAmount);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.source_usdc.to_account_info(),
                    to: ctx.accounts.staking_usdc_vault.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            amount,
        )?;
        ctx.accounts.period.total_usdc = ctx.accounts.period.total_usdc
            .checked_add(amount)
            .ok_or(StakingError::MathOverflow)?;
        emit!(UsdcDeposited { period_id: ctx.accounts.period.period_id, amount });
        Ok(())
    }

    /// Admin finaliza periodo: calcula reward_per_token con 6 decimales de precisión.
    pub fn finalize_period(ctx: Context<FinalizePeriod>) -> Result<()> {
        let state = &ctx.accounts.global_state;
        let p = &mut ctx.accounts.period;
        require!(p.status == PeriodStatus::Active, StakingError::PeriodNotActive);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= p.payment_date, StakingError::PaymentDateNotReached);

        // Total = tokens empresa (perma-stakeados) + tokens privados stakeados
        let total = (state.company_tokens as u128)
            .checked_add(p.total_private_staked as u128)
            .ok_or(StakingError::MathOverflow)?;
        require!(total > 0, StakingError::NoStakers);

        // Precisión 6 decimales: reward_per_token = (total_usdc * 1_000_000) / total_tokens
        p.reward_per_token = (p.total_usdc as u128)
            .checked_mul(PRECISION)
            .ok_or(StakingError::MathOverflow)?
            .checked_div(total)
            .ok_or(StakingError::MathOverflow)?;
        p.status = PeriodStatus::Finalized;
        emit!(PeriodFinalized {
            period_id: p.period_id,
            total_usdc: p.total_usdc,
            reward_per_token: p.reward_per_token,
        });
        Ok(())
    }

    // ========================================================================
    //  PULL/CLAIM - Holders reclaman sus dividendos
    // ========================================================================

    /// Holder reclama dividendos + recupera tokens stakeados.
    pub fn claim_dividends(ctx: Context<ClaimDividends>) -> Result<()> {
        let p = &ctx.accounts.period;
        require!(p.status == PeriodStatus::Finalized, StakingError::PeriodNotFinalized);
        let e = &mut ctx.accounts.stake_entry;
        require!(!e.is_dividend_claimed, StakingError::AlreadyClaimed);

        // dividend = (amount * reward_per_token) / PRECISION
        let dividend = (e.amount as u128)
            .checked_mul(p.reward_per_token)
            .ok_or(StakingError::MathOverflow)?
            .checked_div(PRECISION)
            .ok_or(StakingError::MathOverflow)? as u64;

        let bump = ctx.accounts.global_state.bump;
        let seeds: &[&[u8]] = &[b"global_state", &[bump]];
        let signer_seeds = &[seeds];

        if dividend > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.staking_usdc_vault.to_account_info(),
                        to: ctx.accounts.holder_usdc_ata.to_account_info(),
                        authority: ctx.accounts.global_state.to_account_info(),
                    },
                    signer_seeds,
                ),
                dividend,
            )?;
        }

        // Devolver tokens stakeados al holder
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.holder_token_ata.to_account_info(),
                    authority: ctx.accounts.global_state.to_account_info(),
                },
                signer_seeds,
            ),
            e.amount,
        )?;

        e.is_dividend_claimed = true;
        e.is_tokens_returned = true;
        emit!(DividendsClaimed {
            holder: e.holder,
            period_id: e.period_id,
            dividend,
            tokens_returned: e.amount,
        });
        Ok(())
    }

    /// Admin distribuye dividendos de la empresa a las 4 wallets (4/7 + 1/7 + 1/7 + 1/7).
    pub fn distribute_company_dividends(ctx: Context<DistributeCompanyDividends>) -> Result<()> {
        let state = &ctx.accounts.global_state;
        let p = &ctx.accounts.period;
        require!(p.status == PeriodStatus::Finalized, StakingError::PeriodNotFinalized);

        let total_company = (state.company_tokens as u128)
            .checked_mul(p.reward_per_token)
            .ok_or(StakingError::MathOverflow)?
            .checked_div(PRECISION)
            .ok_or(StakingError::MathOverflow)? as u64;

        let empresa    = (total_company as u128 * 4 / 7) as u64;
        let donaciones = (total_company as u128 / 7) as u64;
        let reinversion= (total_company as u128 / 7) as u64;
        let desarrollo = total_company - empresa - donaciones - reinversion;

        let bump = state.bump;
        let seeds: &[&[u8]] = &[b"global_state", &[bump]];
        let ss = &[seeds];

        pda_transfer(&ctx.accounts.staking_usdc_vault, &ctx.accounts.empresa_usdc,    &ctx.accounts.global_state, &ctx.accounts.token_program, ss, empresa)?;
        pda_transfer(&ctx.accounts.staking_usdc_vault, &ctx.accounts.donaciones_usdc, &ctx.accounts.global_state, &ctx.accounts.token_program, ss, donaciones)?;
        pda_transfer(&ctx.accounts.staking_usdc_vault, &ctx.accounts.reinversion_usdc,&ctx.accounts.global_state, &ctx.accounts.token_program, ss, reinversion)?;
        pda_transfer(&ctx.accounts.staking_usdc_vault, &ctx.accounts.desarrollo_usdc, &ctx.accounts.global_state, &ctx.accounts.token_program, ss, desarrollo)?;

        emit!(CompanyDividendsDistributed { period_id: p.period_id, empresa, donaciones, reinversion, desarrollo });
        Ok(())
    }

    // ========================================================================
    //  VIP POOL (mensual, pull/claim)
    // ========================================================================

    pub fn create_vip_period(ctx: Context<CreateVipPeriod>, month: u8, year: u16) -> Result<()> {
        require!(month >= 1 && month <= 12, StakingError::InvalidDates);
        let v = &mut ctx.accounts.vip_period;
        v.month = month; v.year = year;
        v.total_units = 0; v.total_usdc = 0;
        v.reward_per_unit = 0; v.status = VipStatus::Open;
        v.bump = ctx.bumps.vip_period;
        Ok(())
    }

    pub fn deposit_vip_usdc(ctx: Context<DepositVipUsdc>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::InvalidAmount);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.source_usdc.to_account_info(),
                    to: ctx.accounts.vip_usdc_vault.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            amount,
        )?;
        ctx.accounts.vip_period.total_usdc = ctx.accounts.vip_period.total_usdc
            .checked_add(amount)
            .ok_or(StakingError::MathOverflow)?;
        Ok(())
    }

    /// Admin toma snapshot del balance VIP de un holder (Solo Círculo Público).
    pub fn snapshot_vip_holder(ctx: Context<SnapshotVipHolder>) -> Result<()> {
        let state = &ctx.accounts.global_state;
        let vp = &mut ctx.accounts.vip_period;
        require!(vp.status == VipStatus::Open, StakingError::VipPeriodNotOpen);

        let holder_key = ctx.accounts.holder.key();
        require!(
            holder_key != state.wallet_empresa &&
            holder_key != state.wallet_donaciones &&
            holder_key != state.wallet_reinversion &&
            holder_key != state.wallet_desarrollo,
            StakingError::SystemWalletCannotBeVip
        );

        let balance = ctx.accounts.holder_token_ata.amount;
        let units = balance / state.vip_unit_size;
        require!(units > 0, StakingError::InsufficientVipTokens);

        let e = &mut ctx.accounts.vip_entry;
        e.holder = holder_key;
        e.month = vp.month; e.year = vp.year;
        e.units = units; e.is_paid = false;
        e.bump = ctx.bumps.vip_entry;
        vp.total_units = vp.total_units.checked_add(units).ok_or(StakingError::MathOverflow)?;
        emit!(VipSnapshot { holder: e.holder, month: e.month, year: e.year, balance, units });
        Ok(())
    }

    pub fn finalize_vip_period(ctx: Context<FinalizeVipPeriod>) -> Result<()> {
        let v = &mut ctx.accounts.vip_period;
        require!(v.status == VipStatus::Open, StakingError::VipPeriodNotOpen);
        require!(v.total_units > 0, StakingError::NoStakers);
        v.reward_per_unit = (v.total_usdc as u128)
            .checked_mul(PRECISION)
            .ok_or(StakingError::MathOverflow)?
            .checked_div(v.total_units as u128)
            .ok_or(StakingError::MathOverflow)?;
        v.status = VipStatus::Finalized;
        Ok(())
    }

    /// Holder VIP reclama su recompensa mensual.
    pub fn claim_vip_reward(ctx: Context<ClaimVipReward>) -> Result<()> {
        let vp = &ctx.accounts.vip_period;
        require!(vp.status == VipStatus::Finalized, StakingError::VipPeriodNotFinalized);
        let e = &mut ctx.accounts.vip_entry;
        require!(!e.is_paid, StakingError::AlreadyClaimed);

        let reward = (e.units as u128)
            .checked_mul(vp.reward_per_unit)
            .ok_or(StakingError::MathOverflow)?
            .checked_div(PRECISION)
            .ok_or(StakingError::MathOverflow)? as u64;

        let bump = ctx.accounts.global_state.bump;
        let seeds: &[&[u8]] = &[b"global_state", &[bump]];
        if reward > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vip_usdc_vault.to_account_info(),
                        to: ctx.accounts.holder_usdc_ata.to_account_info(),
                        authority: ctx.accounts.global_state.to_account_info(),
                    },
                    &[seeds],
                ),
                reward,
            )?;
        }
        e.is_paid = true;
        emit!(VipRewardClaimed { holder: e.holder, month: e.month, year: e.year, units: e.units, reward });
        Ok(())
    }

    // ========================================================================
    //  MULTISIG + TIMELOCK para cambios críticos
    // ========================================================================

    pub fn propose_change(ctx: Context<ProposeStakingChange>, action: StakingAction) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        state.proposal_count += 1;
        let p = &mut ctx.accounts.proposal;
        p.id = state.proposal_count;
        p.proposer = ctx.accounts.admin.key();
        p.proposed_at = Clock::get()?.unix_timestamp;
        p.is_approved = false; p.approver = Pubkey::default();
        p.approved_at = 0; p.is_executed = false;
        p.is_cancelled = false; p.action = action.clone();
        p.bump = ctx.bumps.proposal;
        emit!(StakingProposalCreated { id: p.id, proposer: p.proposer });
        Ok(())
    }

    pub fn approve_proposal(ctx: Context<ApproveStakingProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.is_approved && !p.is_cancelled, StakingError::InvalidProposal);
        require!(ctx.accounts.admin.key() != p.proposer, StakingError::SameAdminCannotApprove);
        p.is_approved = true; p.approver = ctx.accounts.admin.key();
        p.approved_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn execute_proposal(ctx: Context<ExecuteStakingProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(p.is_approved && !p.is_executed && !p.is_cancelled, StakingError::InvalidProposal);
        require!(
            Clock::get()?.unix_timestamp >= p.approved_at + TIMELOCK_SECONDS,
            StakingError::TimelockNotExpired
        );

        let state = &mut ctx.accounts.global_state;
        match &p.action {
            StakingAction::UpdateCompanyWallets { empresa, donaciones, reinversion, desarrollo } => {
                state.wallet_empresa = *empresa;
                state.wallet_donaciones = *donaciones;
                state.wallet_reinversion = *reinversion;
                state.wallet_desarrollo = *desarrollo;
            }
            StakingAction::UpdateParams { min_stake, vip_unit } => {
                state.min_stake_amount = *min_stake;
                state.vip_unit_size = *vip_unit;
            }
            StakingAction::TransferAdmin { new_admin1, new_admin2 } => {
                state.admin1 = *new_admin1;
                state.admin2 = *new_admin2;
            }
        }
        p.is_executed = true;
        Ok(())
    }

    /// Pausa de emergencia (cualquier admin, sin multisig).
    pub fn toggle_pause(ctx: Context<SingleStakingAdmin>) -> Result<()> {
        ctx.accounts.global_state.is_paused = !ctx.accounts.global_state.is_paused;
        Ok(())
    }

    // ========================================================================
    //  GUARDIAN — Llave Maestra de Emergencia
    //  No puede acceder a fondos. Solo control de seguridad.
    // ========================================================================

    /// Guardian pausa el contrato instantáneamente — sin multisig, sin timelock.
    /// Usar en caso de hackeo detectado o comportamiento anómalo.
    pub fn guardian_emergency_pause(ctx: Context<GuardianAction>) -> Result<()> {
        ctx.accounts.global_state.is_paused = true;
        emit!(GuardianActionTaken {
            action: 0u8, // 0 = emergency_pause
            guardian: ctx.accounts.guardian.key(),
        });
        Ok(())
    }

    /// Guardian cancela cualquier propuesta pendiente sin esperar timelock.
    /// Usar cuando se detecta una propuesta maliciosa de un admin comprometido.
    pub fn guardian_cancel_proposal(ctx: Context<GuardianCancelProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.is_executed, StakingError::AlreadyExecuted);
        p.is_cancelled = true;
        emit!(GuardianActionTaken {
            action: 1u8, // 1 = cancel_proposal
            guardian: ctx.accounts.guardian.key(),
        });
        Ok(())
    }

    /// Guardian reemplaza ambos admins inmediatamente — sin timelock.
    /// Usar cuando ambas wallets de admin están comprometidas.
    /// El guardian no puede asignarse a sí mismo como admin.
    pub fn guardian_replace_admins(
        ctx: Context<GuardianAction>,
        new_admin1: Pubkey,
        new_admin2: Pubkey,
    ) -> Result<()> {
        let guardian_key = ctx.accounts.guardian.key();
        require!(new_admin1 != guardian_key, StakingError::GuardianCannotBeAdmin);
        require!(new_admin2 != guardian_key, StakingError::GuardianCannotBeAdmin);
        require!(new_admin1 != new_admin2, StakingError::DuplicateAdmin);

        let state = &mut ctx.accounts.global_state;
        state.admin1 = new_admin1;
        state.admin2 = new_admin2;
        emit!(AdminsReplaced { new_admin1, new_admin2, by_guardian: guardian_key });
        Ok(())
    }

    /// Transfiere el rol de guardian a una nueva wallet.
    /// Solo el guardian actual puede hacerlo — requiere firma del Ledger.
    pub fn guardian_transfer(
        ctx: Context<GuardianAction>,
        new_guardian: Pubkey,
    ) -> Result<()> {
        ctx.accounts.global_state.guardian = new_guardian;
        emit!(GuardianTransferred {
            old_guardian: ctx.accounts.guardian.key(),
            new_guardian,
        });
        Ok(())
    }
}

// ============================================================================
// HELPERS
// ============================================================================

fn pda_transfer<'info>(
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Account<'info, GlobalState>,
    tp: &Program<'info, Token>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    if amount == 0 { return Ok(()); }
    token::transfer(
        CpiContext::new_with_signer(
            tp.to_account_info(),
            Transfer {
                from: from.to_account_info(),
                to: to.to_account_info(),
                authority: authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )
}

fn is_admin(state: &GlobalState, key: &Pubkey) -> bool {
    state.admin1 == *key || state.admin2 == *key
}

// ============================================================================
// STATE
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub admin1: Pubkey,
    pub admin2: Pubkey,
    pub token_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub wallet_empresa: Pubkey,
    pub wallet_donaciones: Pubkey,
    pub wallet_reinversion: Pubkey,
    pub wallet_desarrollo: Pubkey,
    /// Tokens de empresa perma-stakeados (nunca se mueven del vault)
    pub company_tokens: u64,
    /// Siempre true — los tokens empresa están bloqueados permanentemente
    pub company_tokens_locked: bool,
    /// Llave maestra de emergencia (Ledger/Squads). Solo control de seguridad, sin acceso a fondos.
    pub guardian: Pubkey,
    pub min_stake_amount: u64,
    pub vip_unit_size: u64,
    pub current_period_id: u64,
    pub total_staked: u64,
    pub is_paused: bool,
    pub proposal_count: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StakingPeriod {
    pub period_id: u64,
    pub start_date: i64,
    pub end_date: i64,
    pub payment_date: i64,
    pub total_private_staked: u64,
    pub total_usdc: u64,
    /// reward_per_token con precisión de 6 decimales (PRECISION = 1_000_000)
    pub reward_per_token: u128,
    pub status: PeriodStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StakeEntry {
    pub holder: Pubkey,
    pub period_id: u64,
    pub amount: u64,
    pub staked_at: i64,
    pub is_dividend_claimed: bool,
    pub is_tokens_returned: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VipPeriod {
    pub month: u8,
    pub year: u16,
    pub total_units: u64,
    pub total_usdc: u64,
    /// reward_per_unit con precisión de 6 decimales
    pub reward_per_unit: u128,
    pub status: VipStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VipEntry {
    pub holder: Pubkey,
    pub month: u8,
    pub year: u16,
    pub units: u64,
    pub is_paid: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum PeriodStatus { Active, Finalized, Distributed }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum VipStatus { Open, Finalized }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum StakingAction {
    UpdateCompanyWallets { empresa: Pubkey, donaciones: Pubkey, reinversion: Pubkey, desarrollo: Pubkey },
    UpdateParams { min_stake: u64, vip_unit: u64 },
    TransferAdmin { new_admin1: Pubkey, new_admin2: Pubkey },
}

#[account]
#[derive(InitSpace)]
pub struct StakingProposal {
    pub id: u64,
    pub proposer: Pubkey,
    pub proposed_at: i64,
    pub is_approved: bool,
    pub approver: Pubkey,
    pub approved_at: i64,
    pub is_executed: bool,
    pub is_cancelled: bool,
    pub action: StakingAction,
    pub bump: u8,
}

// ============================================================================
// CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, payer = admin1,
        space = 8 + GlobalState::INIT_SPACE,
        seeds = [b"global_state"], bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub admin1: Signer<'info>,
    /// CHECK: Second admin
    pub admin2: UncheckedAccount<'info>,
    /// CHECK: Guardian wallet (Ledger/Squads)
    pub guardian: UncheckedAccount<'info>,
    pub token_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    /// CHECK: wallet empresa
    pub wallet_empresa: UncheckedAccount<'info>,
    /// CHECK: wallet donaciones
    pub wallet_donaciones: UncheckedAccount<'info>,
    /// CHECK: wallet reinversión
    pub wallet_reinversion: UncheckedAccount<'info>,
    /// CHECK: wallet desarrollo
    pub wallet_desarrollo: UncheckedAccount<'info>,
    /// Fuente de los tokens empresa para perma-staking
    #[account(mut, token::mint = token_mint, token::authority = admin1)]
    pub company_token_source: Account<'info, TokenAccount>,
    /// Vault donde quedan los tokens bloqueados permanentemente
    #[account(
        mut,
        seeds = [b"token_vault"], bump,
        token::mint = token_mint,
        token::authority = global_state
    )]
    pub token_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(next_period_id: u64)]
pub struct ActivatePeriod<'info> {
    #[account(
        mut, seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        init, payer = admin,
        space = 8 + StakingPeriod::INIT_SPACE,
        seeds = [b"period", next_period_id.to_le_bytes().as_ref()], bump
    )]
    pub period: Account<'info, StakingPeriod>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(period_id: u64)]
pub struct CreatePeriod<'info> {
    #[account(
        mut, seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        init, payer = admin,
        space = 8 + StakingPeriod::INIT_SPACE,
        seeds = [b"period", period_id.to_le_bytes().as_ref()], bump
    )]
    pub period: Account<'info, StakingPeriod>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"period", period.period_id.to_le_bytes().as_ref()], bump = period.bump)]
    pub period: Account<'info, StakingPeriod>,
    #[account(
        init, payer = holder,
        space = 8 + StakeEntry::INIT_SPACE,
        seeds = [b"stake", holder.key().as_ref(), period.period_id.to_le_bytes().as_ref()], bump
    )]
    pub stake_entry: Account<'info, StakeEntry>,
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(mut, token::mint = global_state.token_mint, token::authority = holder)]
    pub holder_token_ata: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"token_vault"], bump, token::mint = global_state.token_mint, token::authority = global_state)]
    pub token_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositUsdc<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"period", period.period_id.to_le_bytes().as_ref()], bump = period.bump)]
    pub period: Account<'info, StakingPeriod>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, token::mint = global_state.usdc_mint, token::authority = admin)]
    pub source_usdc: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"staking_usdc_vault"], bump, token::mint = global_state.usdc_mint, token::authority = global_state)]
    pub staking_usdc_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FinalizePeriod<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"period", period.period_id.to_le_bytes().as_ref()], bump = period.bump)]
    pub period: Account<'info, StakingPeriod>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimDividends<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump)]
    pub global_state: Account<'info, GlobalState>,
    #[account(seeds = [b"period", period.period_id.to_le_bytes().as_ref()], bump = period.bump)]
    pub period: Account<'info, StakingPeriod>,
    #[account(
        mut,
        seeds = [b"stake", holder.key().as_ref(), period.period_id.to_le_bytes().as_ref()],
        bump = stake_entry.bump,
        constraint = stake_entry.holder == holder.key() @ StakingError::Unauthorized
    )]
    pub stake_entry: Account<'info, StakeEntry>,
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(mut, seeds = [b"staking_usdc_vault"], bump, token::mint = global_state.usdc_mint, token::authority = global_state)]
    pub staking_usdc_vault: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"token_vault"], bump, token::mint = global_state.token_mint, token::authority = global_state)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub holder_usdc_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub holder_token_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DistributeCompanyDividends<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(seeds = [b"period", period.period_id.to_le_bytes().as_ref()], bump = period.bump)]
    pub period: Account<'info, StakingPeriod>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [b"staking_usdc_vault"], bump, token::mint = global_state.usdc_mint, token::authority = global_state)]
    pub staking_usdc_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = empresa_usdc.key() == global_state.wallet_empresa)]
    pub empresa_usdc: Account<'info, TokenAccount>,
    #[account(mut, constraint = donaciones_usdc.key() == global_state.wallet_donaciones)]
    pub donaciones_usdc: Account<'info, TokenAccount>,
    #[account(mut, constraint = reinversion_usdc.key() == global_state.wallet_reinversion)]
    pub reinversion_usdc: Account<'info, TokenAccount>,
    #[account(mut, constraint = desarrollo_usdc.key() == global_state.wallet_desarrollo)]
    pub desarrollo_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(month: u8, year: u16)]
pub struct CreateVipPeriod<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(init, payer = admin, space = 8 + VipPeriod::INIT_SPACE,
        seeds = [b"vip" as &[u8], &[month] as &[u8], year.to_le_bytes().as_ref()], bump)]
    pub vip_period: Account<'info, VipPeriod>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositVipUsdc<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"vip" as &[u8], &[vip_period.month] as &[u8], vip_period.year.to_le_bytes().as_ref()], bump = vip_period.bump)]
    pub vip_period: Account<'info, VipPeriod>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, token::mint = global_state.usdc_mint, token::authority = admin)]
    pub source_usdc: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"vip_usdc_vault"], bump, token::mint = global_state.usdc_mint, token::authority = global_state)]
    pub vip_usdc_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SnapshotVipHolder<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"vip" as &[u8], &[vip_period.month] as &[u8], vip_period.year.to_le_bytes().as_ref()], bump = vip_period.bump)]
    pub vip_period: Account<'info, VipPeriod>,
    #[account(init, payer = admin, space = 8 + VipEntry::INIT_SPACE,
        seeds = [b"vip_entry" as &[u8], holder.key().as_ref(), &[vip_period.month] as &[u8], vip_period.year.to_le_bytes().as_ref()], bump)]
    pub vip_entry: Account<'info, VipEntry>,
    /// CHECK: Holder wallet
    pub holder: UncheckedAccount<'info>,
    #[account(token::mint = global_state.token_mint, token::authority = holder)]
    pub holder_token_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeVipPeriod<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"vip" as &[u8], &[vip_period.month] as &[u8], vip_period.year.to_le_bytes().as_ref()], bump = vip_period.bump)]
    pub vip_period: Account<'info, VipPeriod>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimVipReward<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump)]
    pub global_state: Account<'info, GlobalState>,
    #[account(seeds = [b"vip" as &[u8], &[vip_period.month] as &[u8], vip_period.year.to_le_bytes().as_ref()], bump = vip_period.bump)]
    pub vip_period: Account<'info, VipPeriod>,
    #[account(
        mut,
        seeds = [b"vip_entry" as &[u8], holder.key().as_ref(), &[vip_period.month] as &[u8], vip_period.year.to_le_bytes().as_ref()],
        bump = vip_entry.bump,
        constraint = vip_entry.holder == holder.key() @ StakingError::Unauthorized
    )]
    pub vip_entry: Account<'info, VipEntry>,
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(mut, seeds = [b"vip_usdc_vault"], bump, token::mint = global_state.usdc_mint, token::authority = global_state)]
    pub vip_usdc_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub holder_usdc_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SingleStakingAdmin<'info> {
    #[account(mut, seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct GuardianAction<'info> {
    #[account(
        mut, seeds = [b"global_state"], bump = global_state.bump,
        constraint = global_state.guardian == guardian.key() @ StakingError::NotGuardian
    )]
    pub global_state: Account<'info, GlobalState>,
    pub guardian: Signer<'info>,
}

#[derive(Accounts)]
pub struct GuardianCancelProposal<'info> {
    #[account(
        seeds = [b"global_state"], bump = global_state.bump,
        constraint = global_state.guardian == guardian.key() @ StakingError::NotGuardian
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"stk_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, StakingProposal>,
    pub guardian: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProposeStakingChange<'info> {
    #[account(mut, seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(init, payer = admin, space = 8 + StakingProposal::INIT_SPACE,
        seeds = [b"stk_proposal", (global_state.proposal_count + 1).to_le_bytes().as_ref()], bump)]
    pub proposal: Account<'info, StakingProposal>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveStakingProposal<'info> {
    #[account(seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"stk_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, StakingProposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteStakingProposal<'info> {
    #[account(mut, seeds = [b"global_state"], bump = global_state.bump,
        constraint = is_admin(&global_state, &admin.key()) @ StakingError::Unauthorized)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, seeds = [b"stk_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, StakingProposal>,
    pub admin: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct CompanyTokensLocked { pub amount: u64, pub vault: Pubkey }
#[event]
/// action: 0=pause, 1=cancel_proposal — se evita String para compatibilidad con Anchor
pub struct GuardianActionTaken { pub action: u8, pub guardian: Pubkey }
#[event]
pub struct AdminsReplaced { pub new_admin1: Pubkey, pub new_admin2: Pubkey, pub by_guardian: Pubkey }
#[event]
pub struct GuardianTransferred { pub old_guardian: Pubkey, pub new_guardian: Pubkey }
#[event]
pub struct PeriodCreated { pub period_id: u64, pub start_date: i64, pub end_date: i64, pub payment_date: i64 }
#[event]
pub struct TokensStaked { pub holder: Pubkey, pub period_id: u64, pub amount: u64 }
#[event]
pub struct UsdcDeposited { pub period_id: u64, pub amount: u64 }
#[event]
pub struct PeriodFinalized { pub period_id: u64, pub total_usdc: u64, pub reward_per_token: u128 }
#[event]
pub struct DividendsClaimed { pub holder: Pubkey, pub period_id: u64, pub dividend: u64, pub tokens_returned: u64 }
#[event]
pub struct CompanyDividendsDistributed { pub period_id: u64, pub empresa: u64, pub donaciones: u64, pub reinversion: u64, pub desarrollo: u64 }
#[event]
pub struct VipSnapshot { pub holder: Pubkey, pub month: u8, pub year: u16, pub balance: u64, pub units: u64 }
#[event]
pub struct VipRewardClaimed { pub holder: Pubkey, pub month: u8, pub year: u16, pub units: u64, pub reward: u64 }
#[event]
pub struct StakingProposalCreated { pub id: u64, pub proposer: Pubkey }

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum StakingError {
    #[msg("Contrato pausado")] ContractPaused,
    #[msg("Fechas inválidas")] InvalidDates,
    #[msg("Periodo no activo")] PeriodNotActive,
    #[msg("Periodo no comenzado")] PeriodNotStarted,
    #[msg("Periodo terminado")] PeriodEnded,
    #[msg("Monto bajo mín. staking")] BelowMinimum,
    #[msg("Fecha de pago no alcanzada")] PaymentDateNotReached,
    #[msg("Periodo no finalizado")] PeriodNotFinalized,
    #[msg("Ya reclamado")] AlreadyClaimed,
    #[msg("Sin stakers")] NoStakers,
    #[msg("Monto inválido")] InvalidAmount,
    #[msg("Overflow")] MathOverflow,
    #[msg("No autorizado")] Unauthorized,
    #[msg("Tokens insuficientes VIP")] InsufficientVipTokens,
    #[msg("VIP no abierto")] VipPeriodNotOpen,
    #[msg("VIP no finalizado")] VipPeriodNotFinalized,
    #[msg("Propuesta inválida")] InvalidProposal,
    #[msg("Mismo admin no puede aprobar")] SameAdminCannotApprove,
    #[msg("Timelock 24h no expirado")] TimelockNotExpired,
    #[msg("Periodo ya comenzó")] PeriodAlreadyStarted,
    #[msg("Duración del ciclo debe ser exactamente 88 días")] InvalidCycleDuration,
    #[msg("Las billeteras de sistema no pueden generar unidades VIP")] SystemWalletCannotBeVip,
    #[msg("ID de periodo inválido — no existe en el schedule")] InvalidPeriodId,
    #[msg("Las fechas no coinciden con el schedule oficial")] ScheduleMismatch,
    #[msg("Solo el guardian puede ejecutar esta acción")] NotGuardian,
    #[msg("El guardian no puede ser admin")] GuardianCannotBeAdmin,
    #[msg("Los admin1 y admin2 no pueden ser iguales")] DuplicateAdmin,
    #[msg("Propuesta ya ejecutada")] AlreadyExecuted,
}
