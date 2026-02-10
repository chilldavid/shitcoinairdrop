import { PublicKey } from "@solana/web3.js";

// Jito/OpenSea Merkle Distributor program (already deployed on mainnet)
export const MERKLE_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv"
);

// TODO: Replace these after deploying your distributor instance
export const DISTRIBUTOR_PUBKEY = new PublicKey(
  "11111111111111111111111111111111" // REPLACE with your distributor PDA
);

export const TOKEN_MINT = new PublicKey(
  "9XEk9BFJQ6d9zuFxMqekmxitx8a8aXvf4XHddEC86AFf"
);

// RPC endpoint (use your Helius key or other provider)
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

// Token decimals for display
export const TOKEN_DECIMALS = 6;
export const TOKEN_SYMBOL = "AIRDROP"; // REPLACE with your token symbol

// Clawback configuration
// Set this to your admin wallet that will receive unclaimed tokens
export const CLAWBACK_RECEIVER = new PublicKey(
  "53ta1BRk53xZa5L9CpgFX7gapc1MvLL1VsxESnSsTpPb"
);

// Claim deadline - users must claim before this date
// After this timestamp, admin can call clawback to recover unclaimed tokens
export const CLAWBACK_START_TS = Math.floor(
  new Date("2025-05-01T00:00:00Z").getTime() / 1000 // REPLACE with your deadline
);

// Human-readable deadline for display
export const CLAIM_DEADLINE = new Date(CLAWBACK_START_TS * 1000).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
