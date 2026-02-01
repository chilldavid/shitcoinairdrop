import { Connection, PublicKey } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { config } from "./config";

/**
 * Fallback method using standard Solana RPC `getProgramAccounts`.
 * Use this if you don't have a Helius API key.
 *
 * WARNING: This returns all results in a single response (no pagination).
 * For tokens with 100k+ holders, this may time out on free/shared RPC nodes.
 * A dedicated RPC node is recommended for large token holder lists.
 */

const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

async function getHoldersFromProgram(
  connection: Connection,
  mintAddress: string,
  programId: PublicKey
): Promise<Map<string, bigint>> {
  const mint = new PublicKey(mintAddress);
  const holders = new Map<string, bigint>();

  const accounts = await connection.getProgramAccounts(programId, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: mint.toBase58() } },
    ],
  });

  for (const { account } of accounts) {
    const decoded = AccountLayout.decode(account.data);
    const owner = new PublicKey(decoded.owner).toBase58();
    const amount = decoded.amount;

    if (amount > 0n) {
      const existing = holders.get(owner) || 0n;
      holders.set(owner, existing + amount);
    }
  }

  return holders;
}

/**
 * Fetch holders using standard RPC, querying both SPL Token and Token-2022 programs.
 */
export async function getTokenHoldersRpc(
  mintAddress: string,
  minBalance: bigint = 0n
): Promise<Map<string, bigint>> {
  const connection = new Connection(config.solanaRpcUrl, "confirmed");

  console.log(`  Querying SPL Token program...`);
  const splHolders = await getHoldersFromProgram(
    connection,
    mintAddress,
    TOKEN_PROGRAM_ID
  );

  console.log(`  Querying Token-2022 program...`);
  const t22Holders = await getHoldersFromProgram(
    connection,
    mintAddress,
    TOKEN_2022_PROGRAM_ID
  );

  // Merge results
  const merged = new Map(splHolders);
  for (const [owner, amount] of t22Holders) {
    const existing = merged.get(owner) || 0n;
    merged.set(owner, existing + amount);
  }

  // Apply minimum balance filter
  if (minBalance > 0n) {
    for (const [wallet, amount] of merged) {
      if (amount < minBalance) {
        merged.delete(wallet);
      }
    }
  }

  return merged;
}
