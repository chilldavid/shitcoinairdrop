import Database from "better-sqlite3";
import path from "path";
import { config } from "./config";

const DB_PATH = path.join(config.dataDir, "holders.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS token_holders (
        wallet  TEXT NOT NULL,
        mint    TEXT NOT NULL,
        name    TEXT NOT NULL,
        amount  TEXT NOT NULL,
        PRIMARY KEY (wallet, mint)
      );

      CREATE INDEX IF NOT EXISTS idx_wallet ON token_holders(wallet);
      CREATE INDEX IF NOT EXISTS idx_mint ON token_holders(mint);

      CREATE TABLE IF NOT EXISTS snapshot_meta (
        mint       TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        holders    INTEGER NOT NULL,
        timestamp  TEXT NOT NULL
      );
    `);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function insertHolders(
  mint: string,
  name: string,
  holders: Map<string, bigint>
): void {
  const db = getDb();

  // Clear previous snapshot for this mint
  db.prepare("DELETE FROM token_holders WHERE mint = ?").run(mint);
  db.prepare("DELETE FROM snapshot_meta WHERE mint = ?").run(mint);

  const insert = db.prepare(
    "INSERT INTO token_holders (wallet, mint, name, amount) VALUES (?, ?, ?, ?)"
  );

  const insertMany = db.transaction((entries: [string, bigint][]) => {
    for (const [wallet, amount] of entries) {
      insert.run(wallet, mint, name, amount.toString());
    }
  });

  insertMany([...holders.entries()]);

  db.prepare(
    "INSERT INTO snapshot_meta (mint, name, holders, timestamp) VALUES (?, ?, ?, ?)"
  ).run(mint, name, holders.size, new Date().toISOString());
}

export interface MergedHolder {
  wallet: string;
  tokenCount: number;
  tokens: string; // comma-separated "name:amount" pairs
}

/**
 * Query all wallets that hold at least `minTokens` of the snapshotted tokens.
 */
export function getEligibleWallets(minTokens: number = 1): MergedHolder[] {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT
      wallet,
      COUNT(DISTINCT mint) as tokenCount,
      GROUP_CONCAT(name || ':' || amount) as tokens
    FROM token_holders
    WHERE CAST(amount AS INTEGER) > 0
    GROUP BY wallet
    HAVING COUNT(DISTINCT mint) >= ?
    ORDER BY tokenCount DESC, wallet ASC
    `
    )
    .all(minTokens) as MergedHolder[];
}

/**
 * Get snapshot metadata for all tokens that have been snapshotted.
 */
export function getSnapshotSummary(): {
  mint: string;
  name: string;
  holders: number;
  timestamp: string;
}[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM snapshot_meta ORDER BY name ASC")
    .all() as any[];
}
