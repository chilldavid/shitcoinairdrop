import "dotenv/config";

export interface TokenConfig {
  /** Human-readable name for this token */
  name: string;
  /** Solana mint address */
  mint: string;
  /**
   * Minimum raw token amount a wallet must hold to be considered a holder.
   * Use "0" to include all non-zero balances. This is the raw amount
   * (before decimals), so for a token with 6 decimals, "1000000" = 1 token.
   */
  minBalance: string;
}

export const config = {
  heliusApiKey: process.env.HELIUS_API_KEY || "",
  solanaRpcUrl:
    process.env.SOLANA_RPC_URL ||
    (process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : "https://api.mainnet-beta.solana.com"),
  heliusRpcUrl: process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "",
  rateLimitRps: parseInt(process.env.RATE_LIMIT_RPS || "8", 10),
  dataDir: "data",
  outputDir: "output",
};

/**
 * Configure your 10 tokens here.
 * Replace these placeholder entries with your actual token mint addresses.
 */
export const tokens: TokenConfig[] = [
  // --- REPLACE THESE WITH YOUR ACTUAL TOKENS ---
  // Example:
  // { name: "BONK",   mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", minBalance: "0" },
  // { name: "WIF",    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", minBalance: "0" },
  //
  // Add your 10 token mint addresses below:
  { name: "TOKEN_1", mint: "REPLACE_WITH_MINT_ADDRESS_1", minBalance: "0" },
  { name: "TOKEN_2", mint: "REPLACE_WITH_MINT_ADDRESS_2", minBalance: "0" },
  { name: "TOKEN_3", mint: "REPLACE_WITH_MINT_ADDRESS_3", minBalance: "0" },
  { name: "TOKEN_4", mint: "REPLACE_WITH_MINT_ADDRESS_4", minBalance: "0" },
  { name: "TOKEN_5", mint: "REPLACE_WITH_MINT_ADDRESS_5", minBalance: "0" },
  { name: "TOKEN_6", mint: "REPLACE_WITH_MINT_ADDRESS_6", minBalance: "0" },
  { name: "TOKEN_7", mint: "REPLACE_WITH_MINT_ADDRESS_7", minBalance: "0" },
  { name: "TOKEN_8", mint: "REPLACE_WITH_MINT_ADDRESS_8", minBalance: "0" },
  { name: "TOKEN_9", mint: "REPLACE_WITH_MINT_ADDRESS_9", minBalance: "0" },
  { name: "TOKEN_10", mint: "REPLACE_WITH_MINT_ADDRESS_10", minBalance: "0" },
];
