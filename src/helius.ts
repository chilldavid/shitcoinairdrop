import { config } from "./config";

/**
 * Simple rate limiter that enforces a minimum delay between requests.
 */
class RateLimiter {
  private lastCall = 0;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;
    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed);
    }
    this.lastCall = Date.now();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const limiter = new RateLimiter(config.rateLimitRps);

export interface HeliusTokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  delegated_amount: number;
  frozen: boolean;
}

interface HeliusGetTokenAccountsResponse {
  jsonrpc: string;
  id: string;
  result: {
    total: number;
    limit: number;
    cursor?: string;
    token_accounts: HeliusTokenAccount[];
  };
}

const MAX_RETRIES = 4;
const RETRY_DELAYS = [2000, 4000, 8000, 16000];

async function fetchWithRetry(
  mintAddress: string,
  totalFetched: number,
  params: Record<string, unknown>
): Promise<HeliusGetTokenAccountsResponse> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(config.heliusRpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `snapshot-${mintAddress}-${totalFetched}`,
          method: "getTokenAccounts",
          params,
        }),
      });

      if (!res.ok) {
        throw new Error(
          `Helius API error: ${res.status} ${res.statusText} - ${await res.text()}`
        );
      }

      return (await res.json()) as HeliusGetTokenAccountsResponse;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt]!;
        console.warn(
          `\n  Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${err instanceof Error ? err.message : err}`
        );
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  throw new Error("Unreachable");
}

/**
 * Fetch all token accounts for a given mint using Helius's getTokenAccounts DAS API.
 * Handles cursor-based pagination automatically.
 *
 * Yields batches of token accounts so the caller can process/stream them
 * without holding everything in memory.
 */
export async function* fetchTokenAccountsHelius(
  mintAddress: string
): AsyncGenerator<HeliusTokenAccount[], void, unknown> {
  if (!config.heliusRpcUrl) {
    throw new Error(
      "HELIUS_API_KEY is required for the Helius getTokenAccounts API. " +
        "Get a free key at https://www.helius.dev"
    );
  }

  let cursor: string | undefined = undefined;
  let totalFetched = 0;

  while (true) {
    await limiter.wait();

    const params: Record<string, unknown> = {
      limit: 1000,
      mint: mintAddress,
    };
    if (cursor) {
      params.cursor = cursor;
    }

    const data = await fetchWithRetry(mintAddress, totalFetched, params);

    if (!data.result || data.result.token_accounts.length === 0) {
      break;
    }

    const accounts = data.result.token_accounts;
    totalFetched += accounts.length;

    yield accounts;

    cursor = data.result.cursor;
    if (!cursor) break;
  }
}

/**
 * Fetch all holders for a mint and return a deduplicated Map of wallet -> raw amount.
 * A wallet can have multiple token accounts for the same mint; amounts are summed.
 */
export async function getTokenHolders(
  mintAddress: string,
  minBalance: bigint = 0n,
  onProgress?: (fetched: number) => void
): Promise<Map<string, bigint>> {
  const holders = new Map<string, bigint>();
  let total = 0;

  for await (const batch of fetchTokenAccountsHelius(mintAddress)) {
    for (const acct of batch) {
      const amount = BigInt(acct.amount);
      if (amount <= 0n) continue;

      const existing = holders.get(acct.owner) || 0n;
      holders.set(acct.owner, existing + amount);
    }

    total += batch.length;
    onProgress?.(total);
  }

  // Apply minimum balance filter after summing all accounts per wallet
  if (minBalance > 0n) {
    for (const [wallet, amount] of holders) {
      if (amount < minBalance) {
        holders.delete(wallet);
      }
    }
  }

  return holders;
}
