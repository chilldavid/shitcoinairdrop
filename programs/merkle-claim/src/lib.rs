use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked},
};

declare_id!("CLAiM1111111111111111111111111111111111111"); // Placeholder - will be updated after build

/// Merkle Claim Program - Token-2022 Compatible
///
/// A minimal, secure merkle-based airdrop claim program.
/// Supports both classic SPL Token and Token-2022.

#[program]
pub mod merkle_claim {
    use super::*;

    /// Initialize a new distributor with merkle root and configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        merkle_root: [u8; 32],
        max_total_claim: u64,
        max_num_nodes: u64,
        clawback_start_ts: i64,
    ) -> Result<()> {
        let distributor = &mut ctx.accounts.distributor;

        distributor.authority = ctx.accounts.authority.key();
        distributor.mint = ctx.accounts.mint.key();
        distributor.merkle_root = merkle_root;
        distributor.max_total_claim = max_total_claim;
        distributor.max_num_nodes = max_num_nodes;
        distributor.total_claimed = 0;
        distributor.num_claimed = 0;
        distributor.clawback_start_ts = clawback_start_ts;
        distributor.clawback_receiver = ctx.accounts.clawback_receiver.key();
        distributor.vault = ctx.accounts.vault.key();
        distributor.bump = ctx.bumps.distributor;
        distributor.paused = false;

        msg!("Distributor initialized");
        msg!("Merkle root: {:?}", merkle_root);
        msg!("Max total claim: {}", max_total_claim);
        msg!("Max nodes: {}", max_num_nodes);

        Ok(())
    }

    /// Claim tokens by providing a valid merkle proof
    pub fn claim(
        ctx: Context<Claim>,
        index: u64,
        amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let distributor = &ctx.accounts.distributor;

        // Check not paused
        require!(!distributor.paused, ClaimError::Paused);

        // Verify the merkle proof
        let leaf = solana_program::keccak::hashv(&[
            &index.to_le_bytes(),
            &ctx.accounts.claimant.key().to_bytes(),
            &amount.to_le_bytes(),
        ]);

        let mut computed_hash = leaf.0;
        for proof_element in proof.iter() {
            if computed_hash <= *proof_element {
                computed_hash = solana_program::keccak::hashv(&[&computed_hash, proof_element]).0;
            } else {
                computed_hash = solana_program::keccak::hashv(&[proof_element, &computed_hash]).0;
            }
        }

        require!(
            computed_hash == distributor.merkle_root,
            ClaimError::InvalidProof
        );

        // Mark as claimed (claim_status account creation proves first claim)
        let claim_status = &mut ctx.accounts.claim_status;
        claim_status.claimed = true;
        claim_status.claimed_at = Clock::get()?.unix_timestamp;
        claim_status.amount = amount;

        // Update distributor stats
        let distributor = &mut ctx.accounts.distributor;
        distributor.total_claimed = distributor.total_claimed.checked_add(amount)
            .ok_or(ClaimError::Overflow)?;
        distributor.num_claimed = distributor.num_claimed.checked_add(1)
            .ok_or(ClaimError::Overflow)?;

        // Transfer tokens from vault to claimant
        let seeds = &[
            b"distributor",
            distributor.mint.as_ref(),
            distributor.authority.as_ref(),
            &[distributor.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.claimant_token_account.to_account_info(),
                    authority: ctx.accounts.distributor.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        msg!("Claimed {} tokens for index {}", amount, index);

        Ok(())
    }

    /// Admin can clawback unclaimed tokens after clawback_start_ts
    pub fn clawback(ctx: Context<Clawback>) -> Result<()> {
        let distributor = &ctx.accounts.distributor;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= distributor.clawback_start_ts,
            ClaimError::ClawbackNotStarted
        );

        let amount = ctx.accounts.vault.amount;

        let seeds = &[
            b"distributor",
            distributor.mint.as_ref(),
            distributor.authority.as_ref(),
            &[distributor.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.clawback_receiver.to_account_info(),
                    authority: ctx.accounts.distributor.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        msg!("Clawback {} tokens", amount);

        Ok(())
    }

    /// Admin can pause/unpause claims
    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.distributor.paused = paused;
        msg!("Distributor paused: {}", paused);
        Ok(())
    }
}

// ============================================================================
// Accounts
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Distributor::INIT_SPACE,
        seeds = [b"distributor", mint.key().as_ref(), authority.key().as_ref()],
        bump
    )]
    pub distributor: Account<'info, Distributor>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = distributor,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: This is just stored as the clawback destination
    pub clawback_receiver: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u64)]
pub struct Claim<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        mut,
        seeds = [b"distributor", mint.key().as_ref(), distributor.authority.as_ref()],
        bump = distributor.bump,
        has_one = mint,
        has_one = vault,
    )]
    pub distributor: Account<'info, Distributor>,

    #[account(
        init,
        payer = claimant,
        space = 8 + ClaimStatus::INIT_SPACE,
        seeds = [b"claim", distributor.key().as_ref(), &index.to_le_bytes()],
        bump
    )]
    pub claim_status: Account<'info, ClaimStatus>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = claimant,
        associated_token::mint = mint,
        associated_token::authority = claimant,
        associated_token::token_program = token_program,
    )]
    pub claimant_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Clawback<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"distributor", mint.key().as_ref(), authority.key().as_ref()],
        bump = distributor.bump,
        has_one = authority,
        has_one = mint,
        has_one = vault,
        has_one = clawback_receiver,
    )]
    pub distributor: Account<'info, Distributor>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub clawback_receiver: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
    )]
    pub distributor: Account<'info, Distributor>,
}

// ============================================================================
// State
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct Distributor {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub merkle_root: [u8; 32],
    pub max_total_claim: u64,
    pub max_num_nodes: u64,
    pub total_claimed: u64,
    pub num_claimed: u64,
    pub clawback_start_ts: i64,
    pub clawback_receiver: Pubkey,
    pub vault: Pubkey,
    pub bump: u8,
    pub paused: bool,
}

#[account]
#[derive(InitSpace)]
pub struct ClaimStatus {
    pub claimed: bool,
    pub claimed_at: i64,
    pub amount: u64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ClaimError {
    #[msg("Invalid merkle proof")]
    InvalidProof,
    #[msg("Distributor is paused")]
    Paused,
    #[msg("Clawback period has not started")]
    ClawbackNotStarted,
    #[msg("Arithmetic overflow")]
    Overflow,
}
