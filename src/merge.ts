/**
 * Merge snapshotted token holders across all tokens and display eligibility stats.
 *
 * Usage:
 *   npm run merge                    # show stats for all holders
 *   npm run merge -- --min-tokens 3  # require holding at least 3 tokens
 */
import {
  getEligibleWallets,
  getSnapshotSummary,
  closeDb,
} from "./db";

function main(): void {
  const args = process.argv.slice(2);
  const minTokensIdx = args.indexOf("--min-tokens");
  const minTokens =
    minTokensIdx !== -1 && args[minTokensIdx + 1]
      ? parseInt(args[minTokensIdx + 1], 10)
      : 1;

  // Show what's been snapshotted
  const summary = getSnapshotSummary();
  if (summary.length === 0) {
    console.error("No snapshots found. Run `npm run snapshot` first.");
    process.exit(1);
  }

  console.log("=== Snapshotted Tokens ===");
  let totalHolders = 0;
  for (const s of summary) {
    console.log(`  ${s.name}: ${s.holders.toLocaleString()} holders`);
    totalHolders += s.holders;
  }
  console.log(`  Total token accounts: ${totalHolders.toLocaleString()}`);

  // Merge and filter
  console.log(`\n=== Eligibility (min ${minTokens} token(s)) ===`);
  const eligible = getEligibleWallets(minTokens);

  console.log(`  Eligible wallets: ${eligible.length.toLocaleString()}`);

  // Distribution by number of tokens held
  const distribution = new Map<number, number>();
  for (const h of eligible) {
    const count = distribution.get(h.tokenCount) || 0;
    distribution.set(h.tokenCount, count + 1);
  }

  console.log("\n=== Distribution ===");
  for (const [tokenCount, walletCount] of [...distribution.entries()].sort(
    (a, b) => b[0] - a[0]
  )) {
    console.log(
      `  Holds ${tokenCount} token(s): ${walletCount.toLocaleString()} wallets`
    );
  }

  // Show top holders
  console.log("\n=== Top 20 Wallets (by tokens held) ===");
  for (const h of eligible.slice(0, 20)) {
    const tokenNames = h.tokens
      .split(",")
      .map((t) => t.split(":")[0])
      .join(", ");
    console.log(`  ${h.wallet} — ${h.tokenCount} tokens (${tokenNames})`);
  }

  closeDb();
}

main();
