use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("6du8XnSUWEmTeNnGSTKKD7qfGu1CohusrwDXCbN5gntX");

const MAX_BPS: u32 = 10_000;
const TIMELOCK_SECONDS: i64 = 86_400; // 24 horas

#[program]
pub mod regna_bridge {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        pct_staking: u16,
        pct_promotions: u16,
    ) -> Result<()> {
        let total = (pct_staking as u32) + (pct_promotions as u32);
        require!(total == MAX_BPS, BridgeError::InvalidPercentages);

        let c = &mut ctx.accounts.config;
        c.admin1 = ctx.accounts.admin1.key();
        c.admin2 = ctx.accounts.admin2.key();
        c.guardian = ctx.accounts.guardian.key();
        c.usdc_mint = ctx.accounts.usdc_mint.key();
        c.staking_vault = ctx.accounts.staking_vault.key();
        c.promotions_wallet = ctx.accounts.promotions_wallet.key();
        c.pct_staking = pct_staking;
        c.pct_promotions = pct_promotions;
        c.is_paused = false;
        c.total_processed = 0;
        c.proposal_count = 0;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    // ========================================================================
    //  OPERACIONES (cualquier pagador, sin multisig)
    // ========================================================================

    /// Procesa ingreso de fondos del negocio: split 75/25 (configurable).
    /// source_sector: 0=turismo, 1=alimentos, 2=ropa, 3=IT, etc. (solo para logging)
    pub fn process_bridge_revenue(
        ctx: Context<ProcessBridgeRevenue>,
        amount: u64,
        source_sector: u8,
    ) -> Result<()> {
        let c = &ctx.accounts.config;
        require!(!c.is_paused, BridgeError::ContractPaused);
        require!(amount > 0, BridgeError::InvalidAmount);

        // Calcular split según porcentajes configurados
        let staking_amount = calc_share(amount, c.pct_staking)?;
        let promotions_amount = amount
            .checked_sub(staking_amount)
            .ok_or(BridgeError::MathOverflow)?;

        // Transferir a staking vault
        if staking_amount > 0 {
            do_transfer(
                &ctx.accounts.source_usdc,
                &ctx.accounts.staking_dest,
                &ctx.accounts.payer,
                &ctx.accounts.token_program,
                staking_amount,
            )?;
        }

        // Transferir a promotions wallet
        if promotions_amount > 0 {
            do_transfer(
                &ctx.accounts.source_usdc,
                &ctx.accounts.promotions_dest,
                &ctx.accounts.payer,
                &ctx.accounts.token_program,
                promotions_amount,
            )?;
        }

        // Actualizar total procesado
        let config = &mut ctx.accounts.config;
        config.total_processed = config
            .total_processed
            .checked_add(amount)
            .ok_or(BridgeError::MathOverflow)?;

        emit!(BridgeRevenueProcessed {
            amount,
            staking_amount,
            promotions_amount,
            source_sector,
        });
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
    pub fn propose_change(ctx: Context<ProposeChange>, action: BridgeAction) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.proposal_count += 1;

        // Validar acción antes de guardar
        if let BridgeAction::ChangePercentages { pct_staking, pct_promotions } = &action {
            let total = (*pct_staking as u32) + (*pct_promotions as u32);
            require!(total == MAX_BPS, BridgeError::InvalidPercentages);
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
        require!(!p.is_approved, BridgeError::AlreadyApproved);
        require!(!p.is_cancelled, BridgeError::ProposalCancelled);
        require!(ctx.accounts.admin.key() != p.proposer, BridgeError::SameAdminCannotApprove);

        p.is_approved = true;
        p.approver = ctx.accounts.admin.key();
        p.approved_at = Clock::get()?.unix_timestamp;

        emit!(ProposalApproved { id: p.id, approver: p.approver });
        Ok(())
    }

    /// Ejecuta propuesta aprobada después del timelock de 24h.
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(p.is_approved, BridgeError::NotApproved);
        require!(!p.is_executed, BridgeError::AlreadyExecuted);
        require!(!p.is_cancelled, BridgeError::ProposalCancelled);

        let now = Clock::get()?.unix_timestamp;
        require!(now >= p.approved_at + TIMELOCK_SECONDS, BridgeError::TimelockNotExpired);

        let config = &mut ctx.accounts.config;
        match &p.action {
            BridgeAction::ChangePercentages { pct_staking, pct_promotions } => {
                config.pct_staking = *pct_staking;
                config.pct_promotions = *pct_promotions;
            }
            BridgeAction::ChangeWallet { wallet_index, new_wallet } => {
                match wallet_index {
                    0 => config.staking_vault = *new_wallet,
                    1 => config.promotions_wallet = *new_wallet,
                    _ => return Err(BridgeError::InvalidWalletIndex.into()),
                }
            }
            BridgeAction::TransferAdmin { admin1, admin2 } => {
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
        require!(!p.is_executed, BridgeError::AlreadyExecuted);
        require!(!p.is_cancelled, BridgeError::ProposalCancelled);
        p.is_cancelled = true;
        emit!(ProposalCancelled { id: p.id });
        Ok(())
    }

    // ========================================================================
    //  GUARDIAN — Llave Maestra de Emergencia
    // ========================================================================

    /// Guardian pausa instantáneamente — sin multisig ni timelock.
    pub fn guardian_emergency_pause(ctx: Context<BridgeGuardianAction>) -> Result<()> {
        ctx.accounts.config.is_paused = true;
        emit!(GuardianActionTaken { guardian: ctx.accounts.guardian.key() });
        Ok(())
    }

    /// Guardian cancela cualquier propuesta sin esperar timelock.
    pub fn guardian_cancel_proposal(ctx: Context<BridgeGuardianCancel>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.is_executed, BridgeError::AlreadyExecuted);
        p.is_cancelled = true;
        emit!(GuardianActionTaken { guardian: ctx.accounts.guardian.key() });
        Ok(())
    }

    /// Guardian reemplaza ambos admins instantáneamente — sin timelock.
    pub fn guardian_replace_admins(
        ctx: Context<BridgeGuardianAction>,
        new_admin1: Pubkey,
        new_admin2: Pubkey,
    ) -> Result<()> {
        let g = ctx.accounts.guardian.key();
        require!(new_admin1 != g, BridgeError::GuardianCannotBeAdmin);
        require!(new_admin2 != g, BridgeError::GuardianCannotBeAdmin);
        require!(new_admin1 != new_admin2, BridgeError::DuplicateAdmin);
        let c = &mut ctx.accounts.config;
        c.admin1 = new_admin1;
        c.admin2 = new_admin2;
        emit!(AdminsReplaced { new_admin1, new_admin2, by_guardian: g });
        Ok(())
    }

    /// Transfiere el rol guardian a una nueva wallet.
    pub fn guardian_transfer(ctx: Context<BridgeGuardianAction>, new_guardian: Pubkey) -> Result<()> {
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
        .ok_or_else(|| BridgeError::MathOverflow.into())
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

fn is_admin(config: &BridgeConfig, key: &Pubkey) -> bool {
    config.admin1 == *key || config.admin2 == *key
}

// ============================================================================
// STATE
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct BridgeConfig {
    pub admin1: Pubkey,
    pub admin2: Pubkey,
    /// Llave maestra de emergencia (Ledger/Squads)
    pub guardian: Pubkey,
    pub usdc_mint: Pubkey,
    pub staking_vault: Pubkey,
    pub promotions_wallet: Pubkey,
    pub pct_staking: u16,      // default 7500 (75%)
    pub pct_promotions: u16,   // default 2500 (25%)
    pub is_paused: bool,
    pub total_processed: u64,
    pub proposal_count: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum BridgeAction {
    ChangePercentages { pct_staking: u16, pct_promotions: u16 },
    ChangeWallet { wallet_index: u8, new_wallet: Pubkey },
    TransferAdmin { admin1: Pubkey, admin2: Pubkey },
}

#[account]
#[derive(InitSpace)]
pub struct BridgeProposal {
    pub id: u64,
    pub proposer: Pubkey,
    pub proposed_at: i64,
    pub is_approved: bool,
    pub approver: Pubkey,
    pub approved_at: i64,
    pub is_executed: bool,
    pub is_cancelled: bool,
    pub action: BridgeAction,
    pub bump: u8,
}

// ============================================================================
// CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, payer = admin1,
        space = 8 + BridgeConfig::INIT_SPACE,
        seeds = [b"bridge_config"], bump,
    )]
    pub config: Account<'info, BridgeConfig>,
    #[account(mut)]
    pub admin1: Signer<'info>,
    /// CHECK: Second admin wallet
    pub admin2: UncheckedAccount<'info>,
    /// CHECK: Guardian wallet (Ledger/Squads)
    pub guardian: UncheckedAccount<'info>,
    pub usdc_mint: Account<'info, Mint>,
    /// CHECK: validated by admin
    pub staking_vault: UncheckedAccount<'info>,
    /// CHECK: validated by admin
    pub promotions_wallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessBridgeRevenue<'info> {
    #[account(mut, seeds = [b"bridge_config"], bump = config.bump)]
    pub config: Account<'info, BridgeConfig>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = payer)]
    pub source_usdc: Account<'info, TokenAccount>,
    #[account(mut, constraint = staking_dest.key() == config.staking_vault @ BridgeError::InvalidWallet)]
    pub staking_dest: Account<'info, TokenAccount>,
    #[account(mut, constraint = promotions_dest.key() == config.promotions_wallet @ BridgeError::InvalidWallet)]
    pub promotions_dest: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SingleAdmin<'info> {
    #[account(
        mut, seeds = [b"bridge_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ BridgeError::Unauthorized,
    )]
    pub config: Account<'info, BridgeConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProposeChange<'info> {
    #[account(
        mut, seeds = [b"bridge_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ BridgeError::Unauthorized,
    )]
    pub config: Account<'info, BridgeConfig>,
    #[account(
        init, payer = admin,
        space = 8 + BridgeProposal::INIT_SPACE,
        seeds = [b"bridge_proposal", (config.proposal_count + 1).to_le_bytes().as_ref()],
        bump,
    )]
    pub proposal: Account<'info, BridgeProposal>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveProposal<'info> {
    #[account(
        seeds = [b"bridge_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ BridgeError::Unauthorized,
    )]
    pub config: Account<'info, BridgeConfig>,
    #[account(mut, seeds = [b"bridge_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, BridgeProposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(
        mut, seeds = [b"bridge_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ BridgeError::Unauthorized,
    )]
    pub config: Account<'info, BridgeConfig>,
    #[account(mut, seeds = [b"bridge_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, BridgeProposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(
        seeds = [b"bridge_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ BridgeError::Unauthorized,
    )]
    pub config: Account<'info, BridgeConfig>,
    #[account(mut, seeds = [b"bridge_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, BridgeProposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct BridgeGuardianAction<'info> {
    #[account(
        mut, seeds = [b"bridge_config"], bump = config.bump,
        constraint = config.guardian == guardian.key() @ BridgeError::NotGuardian,
    )]
    pub config: Account<'info, BridgeConfig>,
    pub guardian: Signer<'info>,
}

#[derive(Accounts)]
pub struct BridgeGuardianCancel<'info> {
    #[account(
        seeds = [b"bridge_config"], bump = config.bump,
        constraint = config.guardian == guardian.key() @ BridgeError::NotGuardian,
    )]
    pub config: Account<'info, BridgeConfig>,
    #[account(mut, seeds = [b"bridge_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, BridgeProposal>,
    pub guardian: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct BridgeRevenueProcessed {
    pub amount: u64,
    pub staking_amount: u64,
    pub promotions_amount: u64,
    pub source_sector: u8,
}
#[event]
pub struct PauseToggled { pub is_paused: bool }
#[event]
pub struct ProposalCreated { pub id: u64, pub proposer: Pubkey, pub action: BridgeAction }
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
pub enum BridgeError {
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
