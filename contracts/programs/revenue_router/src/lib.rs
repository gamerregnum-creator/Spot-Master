use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("C7VCZzigNT9FSNmPsMvd6ik1xbHiN7m3iN9T7p6dC5Ff");

const MAX_BPS: u32 = 10_000;
const TIMELOCK_SECONDS: i64 = 86_400; // 24 horas

#[program]
pub mod revenue_router {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        pct_referral: u16, pct_torneo: u16, pct_vip: u16,
        pct_national: u16, pct_staking: u16, pct_ops: u16,
        pct_promocion: u16,
    ) -> Result<()> {
        let total = (pct_referral as u32) + (pct_torneo as u32) + (pct_vip as u32)
            + (pct_national as u32) + (pct_staking as u32) + (pct_ops as u32)
            + (pct_promocion as u32);
        require!(total == MAX_BPS, RouterError::InvalidPercentages);

        let c = &mut ctx.accounts.config;
        c.admin1 = ctx.accounts.admin1.key();
        c.admin2 = ctx.accounts.admin2.key();
        c.guardian = ctx.accounts.guardian.key();
        c.usdc_mint = ctx.accounts.usdc_mint.key();
        c.wallet_jugadas = ctx.accounts.wallet_jugadas.key();
        c.wallet_torneo = ctx.accounts.wallet_torneo.key();
        c.wallet_national = ctx.accounts.wallet_national.key();
        c.wallet_ops = ctx.accounts.wallet_ops.key();
        c.wallet_promocion = ctx.accounts.wallet_promocion.key();
        c.staking_vault = ctx.accounts.staking_vault.key();
        c.vip_vault = ctx.accounts.vip_vault.key();
        c.referral_vault = ctx.accounts.referral_vault.key();
        c.pct_referral = pct_referral;
        c.pct_torneo = pct_torneo;
        c.pct_vip = pct_vip;
        c.pct_national = pct_national;
        c.pct_staking = pct_staking;
        c.pct_ops = pct_ops;
        c.pct_promocion = pct_promocion;
        c.is_paused = false;
        c.proposal_count = 0;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    // ========================================================================
    //  OPERACIONES (cualquier admin, sin multisig)
    // ========================================================================

    /// Procesa ingreso de fondos según segmento.
    /// mode 0: STORE (Venta directa de negocio individual)
    /// mode 1: SECTOR (Ingresos de área comercial vía Bridge)
    pub fn process_revenue(ctx: Context<ProcessRevenue>, mode: u8, amount: u64) -> Result<()> {
        let c = &ctx.accounts.config;
        require!(!c.is_paused, RouterError::ContractPaused);
        require!(amount > 0, RouterError::InvalidAmount);

        let mut counts = [0u64; 7]; // r, t, v, n, s, o, p

        if mode == 1 {
            // Segmento SECTOR: 75% Staking, 25% Promoción
            counts[4] = calc_share(amount, 7500)?; // Staking
            counts[6] = amount.checked_sub(counts[4]).ok_or(RouterError::MathOverflow)?; // Promoción (sobrante)
        } else {
            // Segmento STORE: Usa proporciones configuradas
            counts[0] = calc_share(amount, c.pct_referral)?;
            counts[1] = calc_share(amount, c.pct_torneo)?;
            counts[2] = calc_share(amount, c.pct_vip)?;
            counts[3] = calc_share(amount, c.pct_national)?;
            counts[4] = calc_share(amount, c.pct_staking)?;
            counts[5] = calc_share(amount, c.pct_ops)?;
            counts[6] = amount.checked_sub(counts[0]+counts[1]+counts[2]+counts[3]+counts[4]+counts[5])
                .ok_or(RouterError::MathOverflow)?;
        }

        let transfers: Vec<(&Account<'_, TokenAccount>, u64)> = vec![
            (&ctx.accounts.referral_dest, counts[0]),
            (&ctx.accounts.torneo_dest, counts[1]),
            (&ctx.accounts.vip_dest, counts[2]),
            (&ctx.accounts.national_dest, counts[3]),
            (&ctx.accounts.staking_dest, counts[4]),
            (&ctx.accounts.ops_dest, counts[5]),
            (&ctx.accounts.promocion_dest, counts[6]),
        ];

        for (dest, amt) in transfers {
            if amt > 0 {
                do_transfer(&ctx.accounts.source_usdc, dest, &ctx.accounts.payer, &ctx.accounts.token_program, amt)?;
            }
        }

        emit!(RevenueProcessed { 
            amount, mode, 
            referral: counts[0], torneo: counts[1], vip: counts[2], 
            national: counts[3], staking: counts[4], ops: counts[5], promocion: counts[6] 
        });
        Ok(())
    }

    /// Procesa recarga interna: 100% a wallet jugadas.
    pub fn process_recharge(ctx: Context<ProcessRecharge>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.is_paused, RouterError::ContractPaused);
        require!(amount > 0, RouterError::InvalidAmount);
        do_transfer(&ctx.accounts.source_usdc, &ctx.accounts.jugadas_dest, &ctx.accounts.payer, &ctx.accounts.token_program, amount)?;
        emit!(RechargeProcessed { amount });
        Ok(())
    }

    /// Pausa de emergencia: cualquier admin, sin multisig ni timelock.
    pub fn toggle_pause(ctx: Context<SingleAdmin>) -> Result<()> {
        ctx.accounts.config.is_paused = !ctx.accounts.config.is_paused;
        emit!(PauseToggled { is_paused: ctx.accounts.config.is_paused });
        Ok(())
    }

    // ========================================================================
    //  MULTISIG + TIMELOCK (24h) para cambios críticos
    // ========================================================================

    /// Admin1 o Admin2 propone un cambio. Emite evento para notificar holders.
    pub fn propose_change(ctx: Context<ProposeChange>, action: RouterAction) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.proposal_count += 1;

        // Validar acción antes de guardar
        if let RouterAction::ChangePercentages { p_ref, p_tor, p_vip, p_nat, p_sta, p_ops, p_pro } = &action {
            let total = (*p_ref as u32) + (*p_tor as u32) + (*p_vip as u32)
                + (*p_nat as u32) + (*p_sta as u32) + (*p_ops as u32) + (*p_pro as u32);
            require!(total == MAX_BPS, RouterError::InvalidPercentages);
        }

        let p = &mut ctx.accounts.proposal;
        p.id = config.proposal_count;
        p.proposer = ctx.accounts.admin.key();
        p.proposed_at = Clock::get()?.unix_timestamp;
        p.is_approved = false;
        p.approver = Pubkey::default();
        p.approved_at = 0;
        p.is_executed = false;
        p.is_cancelled = false;
        p.action = action.clone();
        p.bump = ctx.bumps.proposal;

        emit!(ProposalCreated { id: p.id, proposer: p.proposer, action });
        Ok(())
    }

    /// El OTRO admin aprueba la propuesta. Inicia el timelock de 24h.
    pub fn approve_proposal(ctx: Context<ApproveProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.is_approved, RouterError::AlreadyApproved);
        require!(!p.is_cancelled, RouterError::ProposalCancelled);
        require!(ctx.accounts.admin.key() != p.proposer, RouterError::SameAdminCannotApprove);

        p.is_approved = true;
        p.approver = ctx.accounts.admin.key();
        p.approved_at = Clock::get()?.unix_timestamp;

        emit!(ProposalApproved { id: p.id, approver: p.approver });
        Ok(())
    }

    /// Ejecuta propuesta aprobada después del timelock de 24h.
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(p.is_approved, RouterError::NotApproved);
        require!(!p.is_executed, RouterError::AlreadyExecuted);
        require!(!p.is_cancelled, RouterError::ProposalCancelled);

        let now = Clock::get()?.unix_timestamp;
        require!(now >= p.approved_at + TIMELOCK_SECONDS, RouterError::TimelockNotExpired);

        let config = &mut ctx.accounts.config;
        match &p.action {
            RouterAction::ChangePercentages { p_ref, p_tor, p_vip, p_nat, p_sta, p_ops, p_pro } => {
                config.pct_referral = *p_ref;
                config.pct_torneo = *p_tor;
                config.pct_vip = *p_vip;
                config.pct_national = *p_nat;
                config.pct_staking = *p_sta;
                config.pct_ops = *p_ops;
                config.pct_promocion = *p_pro;
            }
            RouterAction::ChangeWallet { wallet_index, new_wallet } => {
                match wallet_index {
                    0 => config.wallet_jugadas = *new_wallet,
                    1 => config.wallet_torneo = *new_wallet,
                    2 => config.wallet_national = *new_wallet,
                    3 => config.wallet_ops = *new_wallet,
                    4 => config.staking_vault = *new_wallet,
                    5 => config.vip_vault = *new_wallet,
                    6 => config.referral_vault = *new_wallet,
                    7 => config.wallet_promocion = *new_wallet,
                    _ => return Err(RouterError::InvalidWalletIndex.into()),
                }
            }
            RouterAction::TransferAdmin { admin1, admin2 } => {
                config.admin1 = *admin1;
                config.admin2 = *admin2;
            }
        }

        p.is_executed = true;
        emit!(ProposalExecuted { id: p.id });
        Ok(())
    }

    /// Cancela propuesta pendiente. Solo el proponente o ambos admins.
    pub fn cancel_proposal(ctx: Context<CancelProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.is_executed, RouterError::AlreadyExecuted);
        require!(!p.is_cancelled, RouterError::ProposalCancelled);
        p.is_cancelled = true;
        emit!(ProposalCancelled { id: p.id });
        Ok(())
    }

    // ========================================================================
    //  GUARDIAN — Llave Maestra de Emergencia
    // ========================================================================

    /// Guardian pausa instantáneamente — sin multisig ni timelock.
    pub fn guardian_emergency_pause(ctx: Context<RouterGuardianAction>) -> Result<()> {
        ctx.accounts.config.is_paused = true;
        emit!(GuardianActionTaken { guardian: ctx.accounts.guardian.key() });
        Ok(())
    }

    /// Guardian cancela cualquier propuesta sin esperar timelock.
    pub fn guardian_cancel_proposal(ctx: Context<RouterGuardianCancel>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.is_executed, RouterError::AlreadyExecuted);
        p.is_cancelled = true;
        emit!(GuardianActionTaken { guardian: ctx.accounts.guardian.key() });
        Ok(())
    }

    /// Guardian reemplaza ambos admins instantáneamente — sin timelock.
    pub fn guardian_replace_admins(
        ctx: Context<RouterGuardianAction>,
        new_admin1: Pubkey,
        new_admin2: Pubkey,
    ) -> Result<()> {
        let g = ctx.accounts.guardian.key();
        require!(new_admin1 != g, RouterError::GuardianCannotBeAdmin);
        require!(new_admin2 != g, RouterError::GuardianCannotBeAdmin);
        require!(new_admin1 != new_admin2, RouterError::DuplicateAdmin);
        let c = &mut ctx.accounts.config;
        c.admin1 = new_admin1;
        c.admin2 = new_admin2;
        emit!(AdminsReplaced { new_admin1, new_admin2, by_guardian: g });
        Ok(())
    }

    /// Transfiere el rol guardian a una nueva wallet.
    pub fn guardian_transfer(ctx: Context<RouterGuardianAction>, new_guardian: Pubkey) -> Result<()> {
        ctx.accounts.config.guardian = new_guardian;
        Ok(())
    }
}

// ============================================================================
// HELPERS
// ============================================================================

fn calc_share(amount: u64, bps: u16) -> Result<u64> {
    (amount as u128).checked_mul(bps as u128)
        .and_then(|v| v.checked_div(MAX_BPS as u128))
        .map(|v| v as u64)
        .ok_or_else(|| RouterError::MathOverflow.into())
}

fn do_transfer<'info>(
    from: &Account<'info, TokenAccount>, to: &Account<'info, TokenAccount>,
    authority: &Signer<'info>, token_program: &Program<'info, Token>, amount: u64,
) -> Result<()> {
    if amount == 0 { return Ok(()); }
    token::transfer(CpiContext::new(token_program.to_account_info(), Transfer {
        from: from.to_account_info(), to: to.to_account_info(), authority: authority.to_account_info(),
    }), amount)
}

fn is_admin(config: &RouterConfig, key: &Pubkey) -> bool {
    config.admin1 == *key || config.admin2 == *key
}

// ============================================================================
// STATE
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct RouterConfig {
    pub admin1: Pubkey,
    pub admin2: Pubkey,
    /// Llave maestra de emergencia (Ledger/Squads)
    pub guardian: Pubkey,
    pub usdc_mint: Pubkey,
    pub wallet_jugadas: Pubkey,
    pub wallet_torneo: Pubkey,
    pub wallet_national: Pubkey,
    pub wallet_ops: Pubkey,
    pub wallet_promocion: Pubkey,
    pub staking_vault: Pubkey,
    pub vip_vault: Pubkey,
    pub referral_vault: Pubkey,
    pub pct_referral: u16,
    pub pct_torneo: u16,
    pub pct_vip: u16,
    pub pct_national: u16,
    pub pct_staking: u16,
    pub pct_ops: u16,
    pub pct_promocion: u16,
    pub is_paused: bool,
    pub proposal_count: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum RouterAction {
    ChangePercentages {
        p_ref: u16, p_tor: u16, p_vip: u16, p_nat: u16, p_sta: u16, p_ops: u16, p_pro: u16,
    },
    ChangeWallet { wallet_index: u8, new_wallet: Pubkey },
    TransferAdmin { admin1: Pubkey, admin2: Pubkey },
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Pubkey,
    pub proposed_at: i64,
    pub is_approved: bool,
    pub approver: Pubkey,
    pub approved_at: i64,
    pub is_executed: bool,
    pub is_cancelled: bool,
    pub action: RouterAction,
    pub bump: u8,
}

// ============================================================================
// CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin1, space = 8 + RouterConfig::INIT_SPACE, seeds = [b"router_config"], bump)]
    pub config: Account<'info, RouterConfig>,
    #[account(mut)]
    pub admin1: Signer<'info>,
    /// CHECK: Second admin wallet
    pub admin2: UncheckedAccount<'info>,
    /// CHECK: Guardian wallet (Ledger/Squads)
    pub guardian: UncheckedAccount<'info>,
    pub usdc_mint: Account<'info, Mint>,
    /// CHECK: validated by admin
    pub wallet_jugadas: UncheckedAccount<'info>,
    /// CHECK: validated by admin
    pub wallet_torneo: UncheckedAccount<'info>,
    /// CHECK: validated by admin
    pub wallet_national: UncheckedAccount<'info>,
    /// CHECK: validated by admin
    pub wallet_ops: UncheckedAccount<'info>,
    /// CHECK: validated by admin
    pub wallet_promocion: UncheckedAccount<'info>,
    /// CHECK: validated by admin
    pub staking_vault: UncheckedAccount<'info>,
    /// CHECK: validated by admin
    pub vip_vault: UncheckedAccount<'info>,
    /// CHECK: validated by admin
    pub referral_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessRevenue<'info> {
    #[account(seeds = [b"router_config"], bump = config.bump)]
    pub config: Account<'info, RouterConfig>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = payer)]
    pub source_usdc: Account<'info, TokenAccount>,
    #[account(mut, constraint = referral_dest.key() == config.referral_vault)]
    pub referral_dest: Account<'info, TokenAccount>,
    #[account(mut, constraint = torneo_dest.key() == config.wallet_torneo)]
    pub torneo_dest: Account<'info, TokenAccount>,
    #[account(mut, constraint = vip_dest.key() == config.vip_vault)]
    pub vip_dest: Account<'info, TokenAccount>,
    #[account(mut, constraint = national_dest.key() == config.wallet_national)]
    pub national_dest: Account<'info, TokenAccount>,
    #[account(mut, constraint = staking_dest.key() == config.staking_vault)]
    pub staking_dest: Account<'info, TokenAccount>,
    #[account(mut, constraint = ops_dest.key() == config.wallet_ops)]
    pub ops_dest: Account<'info, TokenAccount>,
    #[account(mut, constraint = promocion_dest.key() == config.wallet_promocion)]
    pub promocion_dest: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ProcessRecharge<'info> {
    #[account(seeds = [b"router_config"], bump = config.bump)]
    pub config: Account<'info, RouterConfig>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = payer)]
    pub source_usdc: Account<'info, TokenAccount>,
    #[account(mut, constraint = jugadas_dest.key() == config.wallet_jugadas @ RouterError::InvalidWallet)]
    pub jugadas_dest: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SingleAdmin<'info> {
    #[account(
        mut, seeds = [b"router_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ RouterError::Unauthorized,
    )]
    pub config: Account<'info, RouterConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProposeChange<'info> {
    #[account(
        mut, seeds = [b"router_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ RouterError::Unauthorized,
    )]
    pub config: Account<'info, RouterConfig>,
    #[account(
        init, payer = admin,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", (config.proposal_count + 1).to_le_bytes().as_ref()],
        bump,
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveProposal<'info> {
    #[account(seeds = [b"router_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ RouterError::Unauthorized)]
    pub config: Account<'info, RouterConfig>,
    #[account(mut, seeds = [b"proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, Proposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut, seeds = [b"router_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ RouterError::Unauthorized)]
    pub config: Account<'info, RouterConfig>,
    #[account(mut, seeds = [b"proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, Proposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(seeds = [b"router_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ RouterError::Unauthorized)]
    pub config: Account<'info, RouterConfig>,
    #[account(mut, seeds = [b"proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, Proposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RouterGuardianAction<'info> {
    #[account(
        mut, seeds = [b"router_config"], bump = config.bump,
        constraint = config.guardian == guardian.key() @ RouterError::NotGuardian
    )]
    pub config: Account<'info, RouterConfig>,
    pub guardian: Signer<'info>,
}

#[derive(Accounts)]
pub struct RouterGuardianCancel<'info> {
    #[account(
        seeds = [b"router_config"], bump = config.bump,
        constraint = config.guardian == guardian.key() @ RouterError::NotGuardian
    )]
    pub config: Account<'info, RouterConfig>,
    #[account(mut, seeds = [b"proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, Proposal>,
    pub guardian: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct RevenueProcessed {
    pub amount: u64, pub mode: u8, pub referral: u64, pub torneo: u64,
    pub vip: u64, pub national: u64, pub staking: u64, pub ops: u64, pub promocion: u64,
}
#[event]
pub struct RechargeProcessed { pub amount: u64 }
#[event]
pub struct PauseToggled { pub is_paused: bool }
#[event]
pub struct ProposalCreated { pub id: u64, pub proposer: Pubkey, pub action: RouterAction }
#[event]
pub struct ProposalApproved { pub id: u64, pub approver: Pubkey }
#[event]
pub struct ProposalExecuted { pub id: u64 }
#[event]
pub struct ProposalCancelled { pub id: u64 }
#[event]
pub struct GuardianActionTaken { pub guardian: Pubkey }
#[event]
pub struct AdminsReplaced { pub new_admin1: Pubkey, pub new_admin2: Pubkey, pub by_guardian: Pubkey }

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum RouterError {
    #[msg("Porcentajes deben sumar 10000")]
    InvalidPercentages,
    #[msg("Contrato pausado")]
    ContractPaused,
    #[msg("Monto inválido")]
    InvalidAmount,
    #[msg("Overflow matemático")]
    MathOverflow,
    #[msg("Wallet destino inválida")]
    InvalidWallet,
    #[msg("Índice de wallet inválido")]
    InvalidWalletIndex,
    #[msg("No autorizado")]
    Unauthorized,
    #[msg("Propuesta ya aprobada")]
    AlreadyApproved,
    #[msg("Propuesta cancelada")]
    ProposalCancelled,
    #[msg("El mismo admin no puede aprobar su propia propuesta")]
    SameAdminCannotApprove,
    #[msg("Propuesta no aprobada")]
    NotApproved,
    #[msg("Propuesta ya ejecutada")]
    AlreadyExecuted,
    #[msg("Timelock de 24h no ha expirado")]
    TimelockNotExpired,
    #[msg("Solo el guardian puede ejecutar esta acción")]
    NotGuardian,
    #[msg("El guardian no puede ser admin")]
    GuardianCannotBeAdmin,
    #[msg("Los admin1 y admin2 no pueden ser iguales")]
    DuplicateAdmin,
}
