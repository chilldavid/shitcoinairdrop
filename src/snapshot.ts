/**
 * Snapshot token holders for all configured tokens.
 *
 * Usage:
 *   npm run snapshot                 # snapshot all tokens in config
 *   npm run snapshot -- --mint <ADDR> --name <NAME>  # snapshot a single token
 *
 * Requires HELIUS_API_KEY in .env (or falls back to standard RPC).
 */
import { config, tokens, TokenConfig } from "./config";
import { getTokenHolders } from "./helius";
import { getTokenHoldersRpc } from "./rpc-fallback";
import { insertHolders, closeDb, getSnapshotSummary } from "./db";
import fs from "fs";

async function snapshotToken(token: TokenConfig): Promise<void> {
  const minBalance = BigInt(token.minBalance || "0");

  console.log(`\n--- Snapshotting ${token.name} (${token.mint}) ---`);

  let holders: Map<string, bigint>;

  if (config.heliusApiKey) {
    console.log(`  Using Helius getTokenAccounts API...`);
    holders = await getTokenHolders(token.mint, minBalance, (fetched) => {
      process.stdout.write(`\r  Fetched ${fetched} token accounts...`);
    });
    console.log(""); // newline after progress
  } else {
    console.log(`  Using standard RPC (no Helius key found)...`);
    holders = await getTokenHoldersRpc(token.mint, minBalance);
  }

  console.log(`  Found ${holders.size} unique holders`);

  // Save to database
  insertHolders(token.mint, token.name, holders);
  console.log(`  Saved to database`);

  // Also save raw CSV to data/ for inspection
  const csvPath = `${config.dataDir}/${token.name}_holders.csv`;
  const totalSupply = BigInt(token.totalSupplyRaw || "0");
  const csvLines = ["wallet,amount,pct_of_supply"];
  for (const [wallet, amount] of holders) {
    const pct =
      totalSupply > 0n
        ? ((Number(amount) / Number(totalSupply)) * 100).toFixed(8)
        : "0";
    csvLines.push(`${wallet},${amount},${pct}`);
  }
  fs.writeFileSync(csvPath, csvLines.join("\n") + "\n");
  console.log(`  Exported to ${csvPath}`);
}

async function main(): Promise<void> {
  // Ensure data directory exists
  fs.mkdirSync(config.dataDir, { recursive: true });

  // Parse CLI arguments
  const args = process.argv.slice(2);
  const mintIndex = args.indexOf("--mint");
  const nameIndex = args.indexOf("--name");

  let tokensToSnapshot: TokenConfig[];

  if (mintIndex !== -1 && args[mintIndex + 1]) {
    // Single token mode
    const mint = args[mintIndex + 1];
    const name =
      nameIndex !== -1 && args[nameIndex + 1]
        ? args[nameIndex + 1]
        : "CUSTOM";
    tokensToSnapshot = [{ name, mint, minBalance: "0", decimals: 0, totalSupplyRaw: "0" }];
  } else {
    // Snapshot all configured tokens
    tokensToSnapshot = tokens.filter(
      (t) => !t.mint.startsWith("REPLACE_WITH_")
    );

    if (tokensToSnapshot.length === 0) {
      console.error(
        "No tokens configured! Edit src/config.ts and add your token mint addresses."
      );
      process.exit(1);
    }
  }

  console.log(`Snapshotting ${tokensToSnapshot.length} token(s)...`);
  console.log(
    `RPC: ${config.heliusApiKey ? "Helius" : "Standard"} (${config.rateLimitRps} RPS)`
  );

  for (const token of tokensToSnapshot) {
    try {
      await snapshotToken(token);
    } catch (err) {
      console.error(`\n  ERROR snapshotting ${token.name}:`, err);
      console.error(`  Skipping ${token.name} and continuing...`);
    }
  }

  // Print summary
  console.log("\n=== Snapshot Summary ===");
  const summary = getSnapshotSummary();
  for (const s of summary) {
    console.log(`  ${s.name}: ${s.holders} holders (${s.timestamp})`);
  }

  closeDb();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
