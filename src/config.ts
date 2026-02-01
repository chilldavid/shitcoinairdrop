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
  { name: "MOODENG",  mint: "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY", minBalance: "0" },
  { name: "PNUT",     mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump", minBalance: "0" },
  { name: "CHILLGUY", mint: "Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump",  minBalance: "0" },
  { name: "WIF",      mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", minBalance: "0" },
  { name: "POPCAT",   mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", minBalance: "0" },
  { name: "PENGU",    mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv", minBalance: "0" },
  { name: "FARTCOIN", mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", minBalance: "0" },
  { name: "GIGA",     mint: "63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9", minBalance: "0" },
  { name: "SPX",      mint: "J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr", minBalance: "0" },
  { name: "BONK",     mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", minBalance: "0" },
];
