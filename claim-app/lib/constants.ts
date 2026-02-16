import { PublicKey } from "@solana/web3.js";

// DEVNET TEST CONFIG - Change to mainnet values when ready
const IS_DEVNET = true;

// Custom Token-2022 compatible Merkle Claim program
export const MERKLE_CLAIM_PROGRAM_ID = new PublicKey(
  "DyyLURFK28R8GoTwpPsxHKydyhJ2SzYFJ17451B7he85"
);

// Token-2022 Program ID
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

// Devnet test token (200M with real amounts)
const DEVNET_TOKEN_MINT = new PublicKey(
  "BtJ2q8R15HbtAMMdwpvq7zZ8Z2rxbvmHh4ajoFv6CPE8"
);

// Mainnet pump.fun token
const MAINNET_TOKEN_MINT = new PublicKey(
  "9CSzePps7jLo4WjTXNxstAYkYfKxVFotbZJVrorApump"
);

export const TOKEN_MINT = IS_DEVNET ? DEVNET_TOKEN_MINT : MAINNET_TOKEN_MINT;

// Authority that created the distributor (Playground wallet)
const DEVNET_AUTHORITY = new PublicKey(
  "3JZqLjJkir7QMxaJoBnba1q53H88nuZFcSjwiXyQE7o4"
);

// Same Playground wallet for mainnet
const MAINNET_AUTHORITY = new PublicKey(
  "3JZqLjJkir7QMxaJoBnba1q53H88nuZFcSjwiXyQE7o4"
);

export const DISTRIBUTOR_AUTHORITY = IS_DEVNET ? DEVNET_AUTHORITY : MAINNET_AUTHORITY;

// Derive the distributor PDA: ["distributor", mint, authority]
export const [DISTRIBUTOR_PUBKEY] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("distributor"),
    TOKEN_MINT.toBuffer(),
    DISTRIBUTOR_AUTHORITY.toBuffer(),
  ],
  MERKLE_CLAIM_PROGRAM_ID
);

// RPC endpoint
export const RPC_ENDPOINT = IS_DEVNET
  ? "https://api.devnet.solana.com"
  : process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

// Token decimals (9 for devnet test token, 6 for mainnet)
export const TOKEN_DECIMALS = 9;
export const TOKEN_SYMBOL = "AIRDROP";

// Clawback configuration
export const CLAWBACK_RECEIVER = new PublicKey(
  "53ta1BRk53xZa5L9CpgFX7gapc1MvLL1VsxESnSsTpPb"
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
export const EXPLORER_URL = IS_DEVNET
  ? "https://solscan.io/tx/{signature}?cluster=devnet"
  : "https://solscan.io/tx/{signature}";
