/**
 * Export the eligible wallet list for use in the airdrop Merkle tree.
 *
 * Usage:
 *   npm run export                               # export all holders
 *   npm run export -- --min-tokens 2             # require holding >= 2 tokens
 *   npm run export -- --airdrop-amount 1000000   # fixed amount per wallet (raw)
 *   npm run export -- --weighted                 # weight by number of tokens held
 *
 * Outputs:
 *   output/eligible_wallets.csv   — CSV for inspection
 *   output/eligible_wallets.json  — JSON for Merkle tree generation
 */
import fs from "fs";
import {
  getEligibleWallets,
  getSnapshotSummary,
  closeDb,
  MergedHolder,
} from "./db";
import { config } from "./config";

interface AirdropEntry {
  wallet: string;
  amount: string;
  tokenCount: number;
}

function main(): void {
  fs.mkdirSync(config.outputDir, { recursive: true });

  const args = process.argv.slice(2);

  // Parse arguments
  const minTokensIdx = args.indexOf("--min-tokens");
  const minTokens =
    minTokensIdx !== -1 && args[minTokensIdx + 1]
      ? parseInt(args[minTokensIdx + 1], 10)
      : 1;

  const amountIdx = args.indexOf("--airdrop-amount");
  const fixedAmount =
    amountIdx !== -1 && args[amountIdx + 1]
      ? BigInt(args[amountIdx + 1])
      : null;

  const weighted = args.includes("--weighted");

  // Get eligible wallets
  const summary = getSnapshotSummary();
  if (summary.length === 0) {
    console.error("No snapshots found. Run `npm run snapshot` first.");
    process.exit(1);
  }

  const eligible = getEligibleWallets(minTokens);

  if (eligible.length === 0) {
    console.error("No eligible wallets found with current criteria.");
    process.exit(1);
  }

  const maxTokenCount = Math.max(...eligible.map((h) => h.tokenCount));

  // Calculate airdrop amounts
  const entries: AirdropEntry[] = eligible.map((h) => {
    let amount: bigint;

    if (fixedAmount !== null && weighted) {
      // Weighted: multiply fixed amount by (tokenCount / maxTokenCount)
      // More tokens held = more airdrop
      amount = (fixedAmount * BigInt(h.tokenCount)) / BigInt(maxTokenCount);
    } else if (fixedAmount !== null) {
      // Fixed: same amount for everyone
      amount = fixedAmount;
    } else {
      // Default: just use tokenCount as a score (you'll set amounts later)
      amount = BigInt(h.tokenCount);
    }

    return {
      wallet: h.wallet,
      amount: amount.toString(),
      tokenCount: h.tokenCount,
    };
  });

  // Export CSV
  const csvPath = `${config.outputDir}/eligible_wallets.csv`;
  const csvLines = ["wallet,amount,token_count"];
  for (const e of entries) {
    csvLines.push(`${e.wallet},${e.amount},${e.tokenCount}`);
  }
  fs.writeFileSync(csvPath, csvLines.join("\n") + "\n");
  console.log(`Exported ${entries.length} wallets to ${csvPath}`);

  // Export JSON (compatible with Merkle tree generators)
  const jsonPath = `${config.outputDir}/eligible_wallets.json`;
  const jsonData = entries.map((e, index) => ({
    index,
    wallet: e.wallet,
    amount: e.amount,
  }));
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + "\n");
  console.log(`Exported ${entries.length} wallets to ${jsonPath}`);

  // Summary
  const totalAmount = entries.reduce(
    (sum, e) => sum + BigInt(e.amount),
    0n
  );
  console.log(`\n=== Export Summary ===`);
  console.log(`  Eligible wallets: ${entries.length.toLocaleString()}`);
  console.log(`  Total airdrop amount: ${totalAmount.toString()}`);
  console.log(`  Min tokens required: ${minTokens}`);
  console.log(
    `  Allocation: ${fixedAmount ? (weighted ? "weighted" : "fixed") : "score-based (set --airdrop-amount)"}`
  );

  closeDb();
}

main();
