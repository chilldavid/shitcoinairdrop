/**
 * Fetch all SOL transfers to a presale address using Helius Enhanced Transactions API.
 *
 * This script:
 * 1. Fetches all transaction signatures for the presale address
 * 2. Parses transactions to find native SOL transfers TO the address
 * 3. Aggregates total SOL sent by each unique sender
 * 4. Saves to database and exports to CSV
 *
 * Usage:
 *   npm run presale-snapshot
 *
 * Environment:
 *   HELIUS_API_KEY - Required for Helius API access
 */
import fs from "fs";
import path from "path";
import { config } from "./config";
import { EXCLUDED_ADDRESS_SET } from "./exclusions";

// Presale address to analyze
const PRESALE_ADDRESS = "CMGx5xq6kkE4QbF2zjupccE28Yt74FadbTCLJHnBN9BQ";

// Rate limiting
const RATE_LIMIT_RPS = config.rateLimitRps;
const MIN_INTERVAL = 1000 / RATE_LIMIT_RPS;
let lastCall = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCall;
  if (elapsed < MIN_INTERVAL) {
    await sleep(MIN_INTERVAL - elapsed);
  }
  lastCall = Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry configuration
const MAX_RETRIES = 4;
const RETRY_DELAYS = [2000, 4000, 8000, 16000];

interface TransactionSignature {
  signature: string;
  slot: number;
  blockTime: number | null;
}

interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number; // in lamports
}

interface EnhancedTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  nativeTransfers: NativeTransfer[];
  type: string;
  fee: number;
  feePayer: string;
  source: string;
}

/**
 * Fetch transaction signatures for an address with pagination
 */
async function fetchSignatures(
  address: string,
  beforeSignature?: string
): Promise<TransactionSignature[]> {
  if (!config.heliusRpcUrl) {
    throw new Error("HELIUS_API_KEY is required");
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await rateLimit();

      const params: any[] = [
        address,
        { limit: 1000 },
      ];
      if (beforeSignature) {
        params[1].before = beforeSignature;
      }

      const res = await fetch(config.heliusRpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `sigs-${Date.now()}`,
          method: "getSignaturesForAddress",
          params,
        }),
      });

      if (!res.ok) {
        throw new Error(`RPC error: ${res.status} ${await res.text()}`);
      }

      const data = (await res.json()) as {
        result?: TransactionSignature[];
        error?: unknown;
      };
      if (data.error) {
        throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
      }

      return data.result || [];
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(`  Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${err}`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  throw new Error("Unreachable");
}

/**
 * Fetch parsed transactions using Helius Enhanced API
 */
async function fetchParsedTransactions(
  signatures: string[]
): Promise<EnhancedTransaction[]> {
  if (!config.heliusApiKey) {
    throw new Error("HELIUS_API_KEY is required");
  }

  // Helius enhanced transactions API endpoint
  const url = `https://api.helius.xyz/v0/transactions?api-key=${config.heliusApiKey}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await rateLimit();

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: signatures }),
      });

      if (!res.ok) {
        throw new Error(`Helius API error: ${res.status} ${await res.text()}`);
      }

      return (await res.json()) as EnhancedTransaction[];
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(`  Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${err}`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  throw new Error("Unreachable");
}

interface PresaleContributor {
  wallet: string;
  totalLamports: bigint;
  txCount: number;
  firstTx: number; // timestamp
  lastTx: number;  // timestamp
}

async function main(): Promise<void> {
  console.log("=== Presale SOL Transfer Snapshot ===");
  console.log(`Target address: ${PRESALE_ADDRESS}`);
  console.log("");

  if (!config.heliusApiKey) {
    console.error("Error: HELIUS_API_KEY environment variable is required.");
    console.error("Get a free key at https://www.helius.dev");
    process.exit(1);
  }

  // Step 1: Fetch all transaction signatures
  console.log("Fetching transaction signatures...");
  const allSignatures: TransactionSignature[] = [];
  let beforeSig: string | undefined = undefined;
  let page = 0;

  while (true) {
    const sigs = await fetchSignatures(PRESALE_ADDRESS, beforeSig);
    if (sigs.length === 0) break;

    allSignatures.push(...sigs);
    page++;
    process.stdout.write(`\r  Page ${page}: ${allSignatures.length} signatures fetched`);

    beforeSig = sigs[sigs.length - 1].signature;

    // Safety check - if we got less than 1000, we're done
    if (sigs.length < 1000) break;
  }
  console.log(`\n  Total signatures: ${allSignatures.length}`);

  // Step 2: Fetch and parse transactions in batches
  console.log("\nParsing transactions for SOL transfers...");
  const contributors = new Map<string, PresaleContributor>();
  const BATCH_SIZE = 100; // Helius limit per request
  let processed = 0;
  let solTransfers = 0;

  for (let i = 0; i < allSignatures.length; i += BATCH_SIZE) {
    const batch = allSignatures.slice(i, i + BATCH_SIZE);
    const sigStrings = batch.map((s) => s.signature);

    try {
      const parsedTxs = await fetchParsedTransactions(sigStrings);

      for (const tx of parsedTxs) {
        if (!tx.nativeTransfers) continue;

        for (const transfer of tx.nativeTransfers) {
          // Only count transfers TO the presale address
          if (transfer.toUserAccount !== PRESALE_ADDRESS) continue;
          // Skip self-transfers
          if (transfer.fromUserAccount === PRESALE_ADDRESS) continue;
          // Skip zero/negative amounts
          if (transfer.amount <= 0) continue;

          solTransfers++;
          const sender = transfer.fromUserAccount;
          const existing = contributors.get(sender);

          if (existing) {
            existing.totalLamports += BigInt(transfer.amount);
            existing.txCount++;
            existing.firstTx = Math.min(existing.firstTx, tx.timestamp || 0);
            existing.lastTx = Math.max(existing.lastTx, tx.timestamp || 0);
          } else {
            contributors.set(sender, {
              wallet: sender,
              totalLamports: BigInt(transfer.amount),
              txCount: 1,
              firstTx: tx.timestamp || 0,
              lastTx: tx.timestamp || 0,
            });
          }
        }
      }
    } catch (err) {
      console.error(`\n  Error processing batch at index ${i}: ${err}`);
      // Continue with next batch
    }

    processed += batch.length;
    process.stdout.write(
      `\r  Processed: ${processed}/${allSignatures.length} txs, ` +
      `${solTransfers} SOL transfers, ${contributors.size} unique senders`
    );
  }
  console.log("\n");

  // Step 3: Filter out excluded addresses and sort
  const excludedCount = [...contributors.keys()].filter((w) =>
    EXCLUDED_ADDRESS_SET.has(w)
  ).length;

  const filtered = [...contributors.values()]
    .filter((c) => !EXCLUDED_ADDRESS_SET.has(c.wallet))
    .sort((a, b) => {
      // Sort by total SOL descending
      if (b.totalLamports > a.totalLamports) return 1;
      if (b.totalLamports < a.totalLamports) return -1;
      return a.wallet.localeCompare(b.wallet);
    });

  // Calculate totals
  const totalLamports = filtered.reduce((sum, c) => sum + c.totalLamports, 0n);
  const totalSol = Number(totalLamports) / 1e9;

  console.log("=== Results ===");
  console.log(`  Total transactions: ${allSignatures.length}`);
  console.log(`  SOL transfers found: ${solTransfers}`);
  console.log(`  Unique contributors: ${contributors.size}`);
  console.log(`  Excluded addresses: ${excludedCount}`);
  console.log(`  Eligible contributors: ${filtered.length}`);
  console.log(`  Total SOL received: ${totalSol.toFixed(4)} SOL`);

  // Top 20 contributors
  console.log("\n=== Top 20 Contributors ===");
  for (const c of filtered.slice(0, 20)) {
    const sol = Number(c.totalLamports) / 1e9;
    const pct = (Number(c.totalLamports) / Number(totalLamports)) * 100;
    console.log(
      `  ${c.wallet} — ${sol.toFixed(4)} SOL (${pct.toFixed(2)}%) — ${c.txCount} tx(s)`
    );
  }

  // Step 4: Export to CSV
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.outputDir, { recursive: true });

  const csvPath = path.join(config.dataDir, "presale_contributors.csv");
  const csvLines = ["wallet,lamports,sol,tx_count,first_tx,last_tx,pct_of_total"];
  for (const c of filtered) {
    const sol = Number(c.totalLamports) / 1e9;
    const pct = (Number(c.totalLamports) / Number(totalLamports)) * 100;
    csvLines.push(
      `${c.wallet},${c.totalLamports},${sol.toFixed(9)},${c.txCount},${c.firstTx},${c.lastTx},${pct.toFixed(6)}`
    );
  }
  fs.writeFileSync(csvPath, csvLines.join("\n") + "\n");
  console.log(`\nExported ${filtered.length} contributors to ${csvPath}`);

  // Step 5: Export to JSON (for integration with other scripts)
  const jsonPath = path.join(config.dataDir, "presale_contributors.json");
  const jsonData = filtered.map((c, index) => ({
    index,
    wallet: c.wallet,
    lamports: c.totalLamports.toString(),
    sol: Number(c.totalLamports) / 1e9,
    txCount: c.txCount,
    firstTx: c.firstTx,
    lastTx: c.lastTx,
    pctOfTotal: (Number(c.totalLamports) / Number(totalLamports)) * 100,
  }));
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + "\n");
  console.log(`Exported ${filtered.length} contributors to ${jsonPath}`);

  // Summary stats
  const summaryPath = path.join(config.dataDir, "presale_summary.json");
  const summary = {
    presaleAddress: PRESALE_ADDRESS,
    snapshotTime: new Date().toISOString(),
    totalTransactions: allSignatures.length,
    solTransfersFound: solTransfers,
    uniqueContributors: contributors.size,
    excludedAddresses: excludedCount,
    eligibleContributors: filtered.length,
    totalLamports: totalLamports.toString(),
    totalSol: totalSol,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  console.log(`Exported summary to ${summaryPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
