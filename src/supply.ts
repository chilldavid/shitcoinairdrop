/**
 * Fetch total supply and decimals for all configured tokens.
 *
 * Usage:
 *   npm run supply
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { config, tokens } from "./config";

async function main(): Promise<void> {
  const connection = new Connection(
    config.heliusRpcUrl || config.solanaRpcUrl,
    "confirmed"
  );

  console.log("=== Token Supply Info ===\n");
  console.log(
    "Token".padEnd(12) +
      "Decimals".padEnd(10) +
      "Total Supply (raw)".padEnd(30) +
      "Total Supply (formatted)"
  );
  console.log("-".repeat(85));

  for (const token of tokens) {
    try {
      const mint = new PublicKey(token.mint);
      const supplyResp = await connection.getTokenSupply(mint);
      const raw = supplyResp.value.amount;
      const decimals = supplyResp.value.decimals;
      const formatted = supplyResp.value.uiAmountString ?? "N/A";

      console.log(
        token.name.padEnd(12) +
          String(decimals).padEnd(10) +
          raw.padEnd(30) +
          Number(formatted).toLocaleString()
      );
    } catch (err) {
      console.error(
        `  ${token.name}: ERROR - ${err instanceof Error ? err.message : err}`
      );
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
