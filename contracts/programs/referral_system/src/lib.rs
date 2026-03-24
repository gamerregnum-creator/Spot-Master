use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("XsSq3HYLFFpgirvEDEsvQFJmeTN3oU5FCtZDfJnsg5n");

const TIMELOCK_SECONDS: i64 = 86_400;

#[program]
pub mod referral_system {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.admin1 = ctx.accounts.admin1.key();
        c.admin2 = ctx.accounts.admin2.key();
        c.guardian = ctx.accounts.guardian.key();
        c.usdc_mint = ctx.accounts.usdc_mint.key();
        c.is_paused = false;
        c.total_sponsors = 0;
        c.total_rewards_distributed = 0;
        c.proposal_count = 0;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    /// Registra relación sponsor-player (cualquier admin).
    pub fn register_referral(ctx: Context<RegisterReferral>) -> Result<()> {
        require!(!ctx.accounts.config.is_paused, ReferralError::ContractPaused);
        let r = &mut ctx.accounts.referral_account;
        r.sponsor = ctx.accounts.sponsor.key();
        r.player = ctx.accounts.player.key();
        r.total_earned = 0; r.total_claimed = 0;
        r.created_at = Clock::get()?.unix_timestamp;
        r.is_active = true; r.bump = ctx.bumps.referral_account;

        let s = &mut ctx.accounts.sponsor_account;
        if s.referral_count == 0 {
            s.sponsor = ctx.accounts.sponsor.key();
            s.total_earned = 0; s.total_claimed = 0;
            s.bump = ctx.bumps.sponsor_account;
        }
        s.referral_count += 1;
        emit!(ReferralRegistered { sponsor: r.sponsor, player: r.player });
        Ok(())
    }

    /// Acredita 10% de compra al sponsor (cualquier admin).
    pub fn credit_reward(ctx: Context<CreditReward>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.is_paused, ReferralError::ContractPaused);
        require!(amount > 0, ReferralError::InvalidAmount);

        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.source_usdc.to_account_info(),
            to: ctx.accounts.referral_vault.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        }), amount)?;

        let r = &mut ctx.accounts.referral_account;
        r.total_earned = r.total_earned.checked_add(amount).ok_or(ReferralError::MathOverflow)?;
        let s = &mut ctx.accounts.sponsor_account;
        s.total_earned = s.total_earned.checked_add(amount).ok_or(ReferralError::MathOverflow)?;
        ctx.accounts.config.total_rewards_distributed += amount;
        emit!(RewardCredited { sponsor: r.sponsor, player: r.player, amount });
        Ok(())
    }

    /// Sponsor reclama sus recompensas acumuladas (pull/claim).
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let s = &mut ctx.accounts.sponsor_account;
        let claimable = s.total_earned.checked_sub(s.total_claimed).ok_or(ReferralError::MathOverflow)?;
        require!(claimable > 0, ReferralError::NothingToClaim);

        let bump = ctx.accounts.config.bump;
        let seeds: &[&[u8]] = &[b"referral_config", &[bump]];
        token::transfer(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.referral_vault.to_account_info(),
                to: ctx.accounts.sponsor_usdc_ata.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            }, &[seeds],
        ), claimable)?;

        s.total_claimed = s.total_claimed.checked_add(claimable).ok_or(ReferralError::MathOverflow)?;
        emit!(RewardClaimed { sponsor: s.sponsor, amount: claimable });
        Ok(())
    }

    pub fn deactivate_referral(ctx: Context<DeactivateReferral>) -> Result<()> {
        ctx.accounts.referral_account.is_active = false;
        Ok(())
    }

    /// Pausa de emergencia (cualquier admin).
    pub fn toggle_pause(ctx: Context<SingleRefAdmin>) -> Result<()> {
        ctx.accounts.config.is_paused = !ctx.accounts.config.is_paused;
        Ok(())
    }

    // ========================================================================
    //  MULTISIG + TIMELOCK
    // ========================================================================

    pub fn propose_change(ctx: Context<ProposeRefChange>, action: RefAction) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.proposal_count += 1;
        let p = &mut ctx.accounts.proposal;
        p.id = config.proposal_count;
        p.proposer = ctx.accounts.admin.key();
        p.proposed_at = Clock::get()?.unix_timestamp;
        p.is_approved = false; p.approver = Pubkey::default();
        p.approved_at = 0; p.is_executed = false;
        p.is_cancelled = false; p.action = action;
        p.bump = ctx.bumps.proposal;
        Ok(())
    }

    pub fn approve_proposal(ctx: Context<ApproveRefProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.is_approved && !p.is_cancelled, ReferralError::InvalidProposal);
        require!(ctx.accounts.admin.key() != p.proposer, ReferralError::SameAdminCannotApprove);
        p.is_approved = true; p.approver = ctx.accounts.admin.key();
        p.approved_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn execute_proposal(ctx: Context<ExecuteRefProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(p.is_approved && !p.is_executed && !p.is_cancelled, ReferralError::InvalidProposal);
        require!(Clock::get()?.unix_timestamp >= p.approved_at + TIMELOCK_SECONDS, ReferralError::TimelockNotExpired);

        let config = &mut ctx.accounts.config;
        match &p.action {
            RefAction::TransferAdmin { new_admin1, new_admin2 } => {
                config.admin1 = *new_admin1; config.admin2 = *new_admin2;
            }
        }
        p.is_executed = true;
        Ok(())
    }

    // ========================================================================
    //  GUARDIAN — Llave Maestra de Emergencia
    // ========================================================================

    pub fn guardian_emergency_pause(ctx: Context<RefGuardianAction>) -> Result<()> {
        ctx.accounts.config.is_paused = true;
        Ok(())
    }

    pub fn guardian_cancel_proposal(ctx: Context<RefGuardianCancel>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.is_executed, ReferralError::InvalidProposal);
        p.is_cancelled = true;
        Ok(())
    }

    pub fn guardian_replace_admins(
        ctx: Context<RefGuardianAction>,
        new_admin1: Pubkey,
        new_admin2: Pubkey,
    ) -> Result<()> {
        let g = ctx.accounts.guardian.key();
        require!(new_admin1 != g && new_admin2 != g, ReferralError::GuardianCannotBeAdmin);
        require!(new_admin1 != new_admin2, ReferralError::DuplicateAdmin);
        let c = &mut ctx.accounts.config;
        c.admin1 = new_admin1;
        c.admin2 = new_admin2;
        Ok(())
    }

    pub fn guardian_transfer(ctx: Context<RefGuardianAction>, new_guardian: Pubkey) -> Result<()> {
        ctx.accounts.config.guardian = new_guardian;
        Ok(())
    }
}

// ============================================================================
// HELPERS
// ============================================================================

fn is_admin(config: &ReferralConfig, key: &Pubkey) -> bool {
    config.admin1 == *key || config.admin2 == *key
}

// ============================================================================
// STATE
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct ReferralConfig {
    pub admin1: Pubkey,
    pub admin2: Pubkey,
    /// Llave maestra de emergencia
    pub guardian: Pubkey,
    pub usdc_mint: Pubkey, pub is_paused: bool,
    pub total_sponsors: u32, pub total_rewards_distributed: u64,
    pub proposal_count: u64, pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ReferralAccount {
    pub sponsor: Pubkey, pub player: Pubkey,
    pub total_earned: u64, pub total_claimed: u64,
    pub created_at: i64, pub is_active: bool, pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SponsorAccount {
    pub sponsor: Pubkey, pub total_earned: u64,
    pub total_claimed: u64, pub referral_count: u32, pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum RefAction {
    TransferAdmin { new_admin1: Pubkey, new_admin2: Pubkey },
}

#[account]
#[derive(InitSpace)]
pub struct RefProposal {
    pub id: u64, pub proposer: Pubkey, pub proposed_at: i64,
    pub is_approved: bool, pub approver: Pubkey, pub approved_at: i64,
    pub is_executed: bool, pub is_cancelled: bool,
    pub action: RefAction, pub bump: u8,
}

// ============================================================================
// CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin1, space = 8 + ReferralConfig::INIT_SPACE,
        seeds = [b"referral_config"], bump)]
    pub config: Account<'info, ReferralConfig>,
    #[account(mut)]
    pub admin1: Signer<'info>,
    /// CHECK: Second admin
    pub admin2: UncheckedAccount<'info>,
    /// CHECK: Guardian wallet
    pub guardian: UncheckedAccount<'info>,
    pub usdc_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterReferral<'info> {
    #[account(mut, seeds = [b"referral_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ ReferralError::Unauthorized)]
    pub config: Account<'info, ReferralConfig>,
    #[account(init, payer = admin, space = 8 + ReferralAccount::INIT_SPACE,
        seeds = [b"referral", sponsor.key().as_ref(), player.key().as_ref()], bump)]
    pub referral_account: Account<'info, ReferralAccount>,
    #[account(init_if_needed, payer = admin, space = 8 + SponsorAccount::INIT_SPACE,
        seeds = [b"sponsor", sponsor.key().as_ref()], bump)]
    pub sponsor_account: Account<'info, SponsorAccount>,
    /// CHECK: Sponsor wallet
    pub sponsor: UncheckedAccount<'info>,
    /// CHECK: Player wallet
    pub player: UncheckedAccount<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreditReward<'info> {
    #[account(mut, seeds = [b"referral_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ ReferralError::Unauthorized)]
    pub config: Account<'info, ReferralConfig>,
    #[account(mut, seeds = [b"referral", referral_account.sponsor.as_ref(), referral_account.player.as_ref()],
        bump = referral_account.bump, constraint = referral_account.is_active @ ReferralError::ReferralInactive)]
    pub referral_account: Account<'info, ReferralAccount>,
    #[account(mut, seeds = [b"sponsor", referral_account.sponsor.as_ref()], bump = sponsor_account.bump)]
    pub sponsor_account: Account<'info, SponsorAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = admin)]
    pub source_usdc: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"referral_vault"], bump, token::mint = config.usdc_mint, token::authority = config)]
    pub referral_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(seeds = [b"referral_config"], bump = config.bump)]
    pub config: Account<'info, ReferralConfig>,
    #[account(mut, seeds = [b"sponsor", sponsor.key().as_ref()], bump = sponsor_account.bump,
        constraint = sponsor_account.sponsor == sponsor.key() @ ReferralError::Unauthorized)]
    pub sponsor_account: Account<'info, SponsorAccount>,
    #[account(mut)]
    pub sponsor: Signer<'info>,
    #[account(mut, seeds = [b"referral_vault"], bump, token::mint = config.usdc_mint, token::authority = config)]
    pub referral_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub sponsor_usdc_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DeactivateReferral<'info> {
    #[account(seeds = [b"referral_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ ReferralError::Unauthorized)]
    pub config: Account<'info, ReferralConfig>,
    #[account(mut, seeds = [b"referral", referral_account.sponsor.as_ref(), referral_account.player.as_ref()],
        bump = referral_account.bump)]
    pub referral_account: Account<'info, ReferralAccount>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct SingleRefAdmin<'info> {
    #[account(mut, seeds = [b"referral_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ ReferralError::Unauthorized)]
    pub config: Account<'info, ReferralConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProposeRefChange<'info> {
    #[account(mut, seeds = [b"referral_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ ReferralError::Unauthorized)]
    pub config: Account<'info, ReferralConfig>,
    #[account(init, payer = admin, space = 8 + RefProposal::INIT_SPACE,
        seeds = [b"ref_proposal", (config.proposal_count + 1).to_le_bytes().as_ref()], bump)]
    pub proposal: Account<'info, RefProposal>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveRefProposal<'info> {
    #[account(seeds = [b"referral_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ ReferralError::Unauthorized)]
    pub config: Account<'info, ReferralConfig>,
    #[account(mut, seeds = [b"ref_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, RefProposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteRefProposal<'info> {
    #[account(mut, seeds = [b"referral_config"], bump = config.bump,
        constraint = is_admin(&config, &admin.key()) @ ReferralError::Unauthorized)]
    pub config: Account<'info, ReferralConfig>,
    #[account(mut, seeds = [b"ref_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, RefProposal>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RefGuardianAction<'info> {
    #[account(
        mut, seeds = [b"referral_config"], bump = config.bump,
        constraint = config.guardian == guardian.key() @ ReferralError::NotGuardian
    )]
    pub config: Account<'info, ReferralConfig>,
    pub guardian: Signer<'info>,
}

#[derive(Accounts)]
pub struct RefGuardianCancel<'info> {
    #[account(
        seeds = [b"referral_config"], bump = config.bump,
        constraint = config.guardian == guardian.key() @ ReferralError::NotGuardian
    )]
    pub config: Account<'info, ReferralConfig>,
    #[account(mut, seeds = [b"ref_proposal", proposal.id.to_le_bytes().as_ref()], bump = proposal.bump)]
    pub proposal: Account<'info, RefProposal>,
    pub guardian: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct ReferralRegistered { pub sponsor: Pubkey, pub player: Pubkey }
#[event]
pub struct RewardCredited { pub sponsor: Pubkey, pub player: Pubkey, pub amount: u64 }
#[event]
pub struct RewardClaimed { pub sponsor: Pubkey, pub amount: u64 }

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum ReferralError {
    #[msg("Contrato pausado")] ContractPaused,
    #[msg("No autorizado")] Unauthorized,
    #[msg("Monto inválido")] InvalidAmount,
    #[msg("Overflow")] MathOverflow,
    #[msg("Nada que reclamar")] NothingToClaim,
    #[msg("Referido inactivo")] ReferralInactive,
    #[msg("Propuesta inválida")] InvalidProposal,
    #[msg("Mismo admin no puede aprobar")] SameAdminCannotApprove,
    #[msg("Timelock 24h no expirado")] TimelockNotExpired,
    #[msg("Solo el guardian puede ejecutar esta acción")] NotGuardian,
    #[msg("El guardian no puede ser admin")] GuardianCannotBeAdmin,
    #[msg("Admin1 y Admin2 no pueden ser iguales")] DuplicateAdmin,
}
