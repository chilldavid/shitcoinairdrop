/**
 * Known non-user wallet addresses to exclude from airdrop eligibility.
 * Includes CEX hot wallets, DEX programs, DeFi protocols, and market makers.
 *
 * Sources: Solscan labels, Arkham Intelligence, official docs, GitHub repos.
 * Last updated: 2026-02-01
 */

interface ExcludedWallet {
  address: string;
  label: string;
  category: "cex" | "dex" | "defi" | "market_maker" | "system" | "launchpad";
}

export const EXCLUDED_WALLETS: ExcludedWallet[] = [
  // ========================
  // CENTRALIZED EXCHANGES
  // ========================

  // Binance
  { address: "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9", label: "Binance Hot Wallet 2", category: "cex" },
  { address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label: "Binance 3", category: "cex" },
  { address: "53unSgGWqEWANcPYRF35B2Bgf8BkszUtcccKiXwGGLyr", label: "Binance.US", category: "cex" },
  { address: "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy", label: "Binance Staking", category: "cex" },

  // Coinbase
  { address: "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE", label: "Coinbase Hot Wallet", category: "cex" },
  { address: "2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm", label: "Coinbase Hot Wallet 2", category: "cex" },
  { address: "H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS", label: "Coinbase", category: "cex" },

  // OKX
  { address: "is6MTRHEgyFLNTfYcuV4QBWLjrZBfmhVNYR6ccgr8KV", label: "OKX", category: "cex" },

  // Bybit
  { address: "AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2", label: "Bybit", category: "cex" },

  // KuCoin
  { address: "BmFdpraQhkiDQE6SnfG5omcA1VwzqfXrwtNYBwWTymy6", label: "KuCoin", category: "cex" },

  // Gate.io
  { address: "u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w", label: "Gate.io", category: "cex" },

  // Crypto.com
  { address: "AobVSwdW9BbpMdJvTqeCN4hPAmh4rHm7vwLnQ5ATSyrS", label: "Crypto.com", category: "cex" },

  // Bitfinex
  { address: "FxteHmLwG9nk1eL4pjNve3Eub2goGkkz6g6TbvdmW46a", label: "Bitfinex Hot", category: "cex" },
  { address: "FyJBKcfcEBzGN74uNxZ95GxnCxeuJJujQCELpPv14ZfN", label: "Bitfinex Cold", category: "cex" },
  { address: "GnCRxKqUEPouYMvTb5nJMGrDB3VkTXZnDTaDuVZdnWA3", label: "Bitfinex USDT Hot", category: "cex" },
  { address: "J4rzLDLhLWFpjSgCMCcxTU84bQ8AH5vhgjwq7SjYVk8Q", label: "Bitfinex USDT", category: "cex" },

  // CEX.IO
  { address: "2QwUbEACJ3ppwfyH19QCSVvNrRzfuK5mNVNDsDMsZKMh", label: "CEX.IO", category: "cex" },
  { address: "DUru5ZfCdCnjPFuY7NPniV3hhZqNJLgn2sBZJGaMc2Sj", label: "CEX.IO", category: "cex" },
  { address: "CGRNicgpirZd3unSzn1Y34k7w31rQftTbaJwEuQu31XP", label: "CEX.IO", category: "cex" },

  // FTX / Alameda (bankruptcy)
  { address: "6ZRCB7AAqGre6c72PRz3MHLC73VMYvJ8bi9KHf1HFpNk", label: "FTX International", category: "cex" },
  { address: "JBpj7yp4Afvb71TmanVwJZXGeX4kqbGFvjCFCRo3EbTM", label: "FTX.US", category: "cex" },
  { address: "6b4aypBhH337qSzzkbeoHWzTLt4DjG2aG8GkrrTQJfQA", label: "FTX/Alameda Bankruptcy", category: "cex" },

  // ========================
  // DEX PROGRAMS
  // ========================

  // Raydium
  { address: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", label: "Raydium AMM v4", category: "dex" },
  { address: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C", label: "Raydium CPMM", category: "dex" },
  { address: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", label: "Raydium CLMM", category: "dex" },
  { address: "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h", label: "Raydium Stable Swap", category: "dex" },
  { address: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj", label: "Raydium LaunchLab", category: "dex" },
  { address: "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS", label: "Raydium Routing", category: "dex" },
  { address: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE", label: "Raydium LP Locker", category: "dex" },

  // Orca
  { address: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", label: "Orca Whirlpool", category: "dex" },
  { address: "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP", label: "Orca Token Swap v2", category: "dex" },

  // Jupiter
  { address: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", label: "Jupiter Aggregator v6", category: "dex" },
  { address: "jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu", label: "Jupiter Limit Order", category: "dex" },
  { address: "DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M", label: "Jupiter DCA", category: "dex" },
  { address: "PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu", label: "Jupiter Perps", category: "dex" },
  { address: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4", label: "Jupiter LP (JLP)", category: "dex" },

  // Meteora
  { address: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB", label: "Meteora Dynamic AMM", category: "dex" },
  { address: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", label: "Meteora DLMM", category: "dex" },
  { address: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG", label: "Meteora DAMM v2", category: "dex" },
  { address: "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN", label: "Meteora Dynamic Bonding Curve", category: "dex" },
  { address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi", label: "Meteora Dynamic Vaults", category: "dex" },
  { address: "MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky", label: "Meteora Stable Pools", category: "dex" },
  { address: "FarmuwXPWXvefWUeqFAa5w6rifLkq5X6E8bimYvrhCB1", label: "Meteora Farm", category: "dex" },
  { address: "FEESngU3neckdwib9X3KWqdL7Mjmqk9XNp3uh5JbP4KP", label: "Meteora M3M3", category: "dex" },

  // OpenBook / Serum
  { address: "opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb", label: "OpenBook v2", category: "dex" },
  { address: "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX", label: "OpenBook v1 (Serum)", category: "dex" },
  { address: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", label: "Serum DEX v3", category: "dex" },

  // Lifinity
  { address: "EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S", label: "Lifinity v2", category: "dex" },
  { address: "2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c", label: "Lifinity v1", category: "dex" },

  // ========================
  // DEFI PROTOCOLS
  // ========================

  // Marinade
  { address: "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD", label: "Marinade Staking", category: "defi" },
  { address: "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC", label: "Marinade State", category: "defi" },
  { address: "Du3Ysj1wKbxPKkuPPnvzQLQh8oMSVifs3jGZjJWXFmHN", label: "Marinade Reserve", category: "defi" },

  // Solend
  { address: "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo", label: "Solend", category: "defi" },

  // Kamino
  { address: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD", label: "Kamino Lending", category: "defi" },
  { address: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW", label: "Kamino Liquidity", category: "defi" },

  // Drift
  { address: "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH", label: "Drift v2", category: "defi" },
  { address: "JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw", label: "Drift Vault", category: "defi" },

  // ========================
  // MARKET MAKERS
  // ========================

  { address: "5sTQ5ih7xtctBhMXHr3f1aWdaXazWrWfoehqWdqWnTFP", label: "Wintermute", category: "market_maker" },
  { address: "MfDuWeqSHEqTFVYZ7LoexgAK9dxk7cy4DFJWjWMGVWa", label: "Wintermute 2", category: "market_maker" },

  // ========================
  // LAUNCHPADS
  // ========================

  { address: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", label: "Pump.fun", category: "launchpad" },
  { address: "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM", label: "Pump.fun Fees", category: "launchpad" },

  // ========================
  // SYSTEM PROGRAMS
  // ========================

  { address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", label: "SPL Token Program", category: "system" },
  { address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", label: "Associated Token Program", category: "system" },
  { address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", label: "Token-2022 Program", category: "system" },
  { address: "11111111111111111111111111111111", label: "System Program", category: "system" },
];

/** Set for O(1) lookups */
export const EXCLUDED_ADDRESS_SET = new Set(
  EXCLUDED_WALLETS.map((w) => w.address)
);

/** Check if an address should be excluded */
export function isExcluded(address: string): boolean {
  return EXCLUDED_ADDRESS_SET.has(address);
}

/** Get the label for an excluded address, or undefined if not excluded */
export function getExclusionLabel(address: string): string | undefined {
  return EXCLUDED_WALLETS.find((w) => w.address === address)?.label;
}
