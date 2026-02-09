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
  "11111111111111111111111111111111" // REPLACE with your airdrop token mint
);

// RPC endpoint (use your Helius key or other provider)
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

// Token decimals for display
export const TOKEN_DECIMALS = 6;
export const TOKEN_SYMBOL = "AIRDROP"; // REPLACE with your token symbol
