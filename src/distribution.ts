/**
 * Per-token holder distribution by % of total supply.
 *
 * Usage:
 *   npm run distribution
 */
import { getDb, closeDb } from "./db";
import { tokens } from "./config";
import { EXCLUDED_ADDRESS_SET } from "./exclusions";

interface Bucket {
  label: string;
  min: number;
  max: number;
}

const BUCKETS: Bucket[] = [
  { label: "0.0001% - 0.001%", min: 0.0001, max: 0.001 },
  { label: "0.001%  - 0.01%",  min: 0.001,  max: 0.01 },
  { label: "0.01%   - 0.1%",   min: 0.01,   max: 0.1 },
  { label: "0.1%    - 1%",     min: 0.1,     max: 1 },
  { label: "1%      - 10%",    min: 1,       max: 10 },
  { label: "10%+",             min: 10,      max: Infinity },
];

function main(): void {
  const db = getDb();

  for (const token of tokens) {
    const totalSupply = Number(token.totalSupplyRaw);
    if (totalSupply === 0) continue;

    // Get all holders for this token, excluding known addresses
    const rows = db
      .prepare(
        "SELECT wallet, amount FROM token_holders WHERE name = ? AND CAST(amount AS INTEGER) > 0"
      )
      .all(token.name) as { wallet: string; amount: string }[];

    const holders = rows.filter((r) => !EXCLUDED_ADDRESS_SET.has(r.wallet));

    // Categorize into buckets
    const bucketCounts = new Map<string, number>();
    const bucketSupply = new Map<string, number>(); // total % of supply held by wallets in each bucket
    let belowMin = 0;
    let belowMinPct = 0;

    for (const bucket of BUCKETS) {
      bucketCounts.set(bucket.label, 0);
      bucketSupply.set(bucket.label, 0);
    }

    for (const row of holders) {
      const pct = (Number(row.amount) / totalSupply) * 100;

      let placed = false;
      for (const bucket of BUCKETS) {
        if (pct >= bucket.min && pct < bucket.max) {
          bucketCounts.set(bucket.label, (bucketCounts.get(bucket.label) || 0) + 1);
          bucketSupply.set(bucket.label, (bucketSupply.get(bucket.label) || 0) + pct);
          placed = true;
          break;
        }
      }
      if (!placed) {
        belowMin++;
        belowMinPct += pct;
      }
    }

    console.log(`\n=== ${token.name} (${holders.length.toLocaleString()} holders, excl. known addresses) ===`);
    console.log(
      "  " +
        "Bucket".padEnd(22) +
        "Wallets".padEnd(12) +
        "% of Holders".padEnd(16) +
        "Combined % of Supply"
    );
    console.log("  " + "-".repeat(70));

    if (belowMin > 0) {
      const pctOfHolders = ((belowMin / holders.length) * 100).toFixed(2);
      console.log(
        "  " +
          "< 0.0001%".padEnd(22) +
          belowMin.toLocaleString().padEnd(12) +
          `${pctOfHolders}%`.padEnd(16) +
          `${belowMinPct.toFixed(4)}%`
      );
    }

    for (const bucket of BUCKETS) {
      const count = bucketCounts.get(bucket.label) || 0;
      const supply = bucketSupply.get(bucket.label) || 0;
      if (count === 0) continue;
      const pctOfHolders = ((count / holders.length) * 100).toFixed(2);
      console.log(
        "  " +
          bucket.label.padEnd(22) +
          count.toLocaleString().padEnd(12) +
          `${pctOfHolders}%`.padEnd(16) +
          `${supply.toFixed(4)}%`
      );
    }
  }

  closeDb();
}

main();
