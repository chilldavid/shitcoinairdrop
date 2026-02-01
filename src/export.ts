/**
 * Export the eligible wallet list using tiered airdrop scoring.
 *
 * Tier system (per token holding):
 *   Tier 1: 0.0001% - 0.001% of supply  →  1 point
 *   Tier 2: 0.001%  - 0.01%  of supply  →  4 points  (4x T1)
 *   Tier 3: 0.01%   - 0.1%   of supply  → 12 points  (3x T2)
 *   Tier 4: 0.1%+   of supply            → 24 points  (2x T3)
 *
 * Points stack across all token holdings. Each token is scored independently.
 * Holdings below 0.0001% are excluded.
 *
 * Usage:
 *   npm run export                                 # export with point scores
 *   npm run export -- --total-supply 1000000000    # set total airdrop supply (raw)
 *
 * Outputs:
 *   output/eligible_wallets.csv   — CSV for inspection
 *   output/eligible_wallets.json  — JSON for Merkle tree generation
 */
import fs from "fs";
import {
  getEligibleWallets,
  getSnapshotSummary,
  parseHoldings,
  closeDb,
  TokenHolding,
} from "./db";
import { config } from "./config";

// --- Tier Configuration ---
interface Tier {
  name: string;
  minPct: number;   // inclusive
  maxPct: number;   // exclusive
  points: number;
}

const TIERS: Tier[] = [
  { name: "Tier 1", minPct: 0.0001, maxPct: 0.001,    points: 1 },
  { name: "Tier 2", minPct: 0.001,  maxPct: 0.01,     points: 4 },
  { name: "Tier 3", minPct: 0.01,   maxPct: 0.1,      points: 12 },
  { name: "Tier 4", minPct: 0.1,    maxPct: Infinity,  points: 24 },
];

function getTier(pctOfSupply: number): Tier | null {
  for (const tier of TIERS) {
    if (pctOfSupply >= tier.minPct && pctOfSupply < tier.maxPct) {
      return tier;
    }
  }
  return null; // below 0.0001%, not eligible
}

function scoreHoldings(holdings: TokenHolding[]): {
  totalPoints: number;
  tierBreakdown: { token: string; tier: string; pct: number; points: number }[];
} {
  let totalPoints = 0;
  const tierBreakdown: { token: string; tier: string; pct: number; points: number }[] = [];

  for (const h of holdings) {
    const tier = getTier(h.pctOfSupply);
    if (!tier) continue; // below minimum threshold

    totalPoints += tier.points;
    tierBreakdown.push({
      token: h.name,
      tier: tier.name,
      pct: h.pctOfSupply,
      points: tier.points,
    });
  }

  return { totalPoints, tierBreakdown };
}

function main(): void {
  fs.mkdirSync(config.outputDir, { recursive: true });

  const args = process.argv.slice(2);

  // Parse total airdrop supply (raw token amount with decimals)
  const supplyIdx = args.indexOf("--total-supply");
  const totalAirdropSupply =
    supplyIdx !== -1 && args[supplyIdx + 1]
      ? BigInt(args[supplyIdx + 1])
      : null;

  // Get eligible wallets (min 1 token, exclude known addresses)
  const summary = getSnapshotSummary();
  if (summary.length === 0) {
    console.error("No snapshots found. Run `npm run snapshot` first.");
    process.exit(1);
  }

  const eligible = getEligibleWallets(1, true);
  if (eligible.length === 0) {
    console.error("No eligible wallets found.");
    process.exit(1);
  }

  // Score every wallet
  const scored: {
    wallet: string;
    points: number;
    tokenCount: number;
    breakdown: { token: string; tier: string; pct: number; points: number }[];
  }[] = [];

  let grandTotalPoints = 0;
  const tierStats = new Map<string, { walletEntries: number; totalPoints: number }>();
  for (const t of TIERS) {
    tierStats.set(t.name, { walletEntries: 0, totalPoints: 0 });
  }

  for (const h of eligible) {
    const holdings = parseHoldings(h.tokens);
    const { totalPoints, tierBreakdown } = scoreHoldings(holdings);

    if (totalPoints === 0) continue; // no holdings above 0.0001%

    grandTotalPoints += totalPoints;
    scored.push({
      wallet: h.wallet,
      points: totalPoints,
      tokenCount: h.tokenCount,
      breakdown: tierBreakdown,
    });

    for (const entry of tierBreakdown) {
      const stat = tierStats.get(entry.tier);
      if (stat) {
        stat.walletEntries++;
        stat.totalPoints += entry.points;
      }
    }
  }

  // Sort by points descending
  scored.sort((a, b) => b.points - a.points || a.wallet.localeCompare(b.wallet));

  // Calculate airdrop amounts
  const entries = scored.map((s, index) => {
    let amount: string;
    if (totalAirdropSupply !== null && grandTotalPoints > 0) {
      const share =
        (totalAirdropSupply * BigInt(s.points)) / BigInt(grandTotalPoints);
      amount = share.toString();
    } else {
      amount = s.points.toString(); // just output points if no supply set
    }

    return {
      index,
      wallet: s.wallet,
      amount,
      points: s.points,
      tokenCount: s.tokenCount,
      breakdown: s.breakdown,
    };
  });

  // --- Print Tier Summary ---
  console.log("=== Tier Configuration ===");
  for (const t of TIERS) {
    const maxLabel = t.maxPct === Infinity ? "+" : `- ${t.maxPct}%`;
    console.log(`  ${t.name}: ${t.minPct}% ${maxLabel}  →  ${t.points} point(s)`);
  }

  console.log("\n=== Tier Distribution ===");
  console.log(
    "  " +
      "Tier".padEnd(10) +
      "Token-Holdings".padEnd(18) +
      "Total Points".padEnd(16) +
      "% of Airdrop"
  );
  console.log("  " + "-".repeat(55));
  for (const t of TIERS) {
    const stat = tierStats.get(t.name)!;
    const pct =
      grandTotalPoints > 0
        ? ((stat.totalPoints / grandTotalPoints) * 100).toFixed(1)
        : "0";
    console.log(
      "  " +
        t.name.padEnd(10) +
        stat.walletEntries.toLocaleString().padEnd(18) +
        stat.totalPoints.toLocaleString().padEnd(16) +
        `${pct}%`
    );
  }
  console.log(
    "  " +
      "Total".padEnd(10) +
      "".padEnd(18) +
      grandTotalPoints.toLocaleString().padEnd(16)
  );

  console.log(`\n=== Eligible Wallets: ${scored.length.toLocaleString()} ===`);

  // Per-point value
  if (totalAirdropSupply !== null) {
    const perPoint = Number(totalAirdropSupply) / grandTotalPoints;
    console.log(`  Total airdrop supply: ${totalAirdropSupply.toString()}`);
    console.log(`  Per point: ${perPoint.toFixed(2)} tokens`);
    console.log("");
    for (const t of TIERS) {
      console.log(`  ${t.name} per token held: ${(perPoint * t.points).toFixed(2)} tokens`);
    }
  }

  // Top 20
  console.log("\n=== Top 20 Wallets ===");
  for (const e of entries.slice(0, 20)) {
    const details = e.breakdown
      .map((b) => `${b.token}(${b.tier}:${b.pct.toFixed(4)}%)`)
      .join(", ");
    console.log(`  ${e.wallet} — ${e.points} pts (${e.amount} tokens)`);
    console.log(`    ${details}`);
  }

  // --- Export CSV ---
  const csvPath = `${config.outputDir}/eligible_wallets.csv`;
  const csvLines = ["wallet,airdrop_amount,points,token_count,breakdown"];
  for (const e of entries) {
    const breakdownStr = e.breakdown
      .map((b) => `${b.token}:${b.tier}:${b.pct.toFixed(6)}%:${b.points}pts`)
      .join("|");
    csvLines.push(
      `${e.wallet},${e.amount},${e.points},${e.tokenCount},${breakdownStr}`
    );
  }
  fs.writeFileSync(csvPath, csvLines.join("\n") + "\n");
  console.log(`\nExported ${entries.length} wallets to ${csvPath}`);

  // --- Export JSON ---
  const jsonPath = `${config.outputDir}/eligible_wallets.json`;
  const jsonData = entries.map((e) => ({
    index: e.index,
    wallet: e.wallet,
    amount: e.amount,
    points: e.points,
    tokenCount: e.tokenCount,
    breakdown: e.breakdown,
  }));
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + "\n");
  console.log(`Exported ${entries.length} wallets to ${jsonPath}`);

  closeDb();
}

main();
