import { PublicKey } from "@solana/web3.js";

// Jito Merkle Distributor Program (mainnet)
export const MERKLE_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv"
);

// Token-2022 Program ID
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

// Mainnet Token-2022 airdrop token
export const TOKEN_MINT = new PublicKey(
  "GkDY92hamTR9Vv8QDHhq548KgoSb5fpCXTjFdNAVpump"
);

// Authority (Playground wallet)
export const DISTRIBUTOR_AUTHORITY = new PublicKey(
  "3JZqLjJkir7QMxaJoBnba1q53H88nuZFcSjwiXyQE7o4"
);

// Distributor PDA — UPDATE THIS after running `npm run create-distributor`
// The Jito program derives PDAs as ["MerkleDistributor", base_pubkey]
// where base is a keypair generated at creation time, so this must be set
// after the distributor is created on-chain.
export const DISTRIBUTOR_PUBKEY = new PublicKey(
  "11111111111111111111111111111111" // PLACEHOLDER — replace after creation
);

// RPC endpoint
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

// Token decimals (6 for mainnet Token-2022 token)
export const TOKEN_DECIMALS = 6;
export const TOKEN_SYMBOL = "AIRDROP";

// Clawback configuration
export const CLAWBACK_RECEIVER = new PublicKey(
  "3JZqLjJkir7QMxaJoBnba1q53H88nuZFcSjwiXyQE7o4"
);

export const CLAWBACK_START_TS = Math.floor(
  new Date("2027-05-01T00:00:00Z").getTime() / 1000
);

export const CLAIM_DEADLINE = new Date(CLAWBACK_START_TS * 1000).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// For explorer links
export const EXPLORER_URL = "https://solscan.io/tx/{signature}";
