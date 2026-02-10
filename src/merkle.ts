/**
 * Generate a Merkle tree compatible with the Jito/OpenSea Merkle Distributor.
 *
 * Leaf format: keccak256(abi.encodePacked(index, claimant, amount))
 * - index: uint64 (8 bytes, little-endian)
 * - claimant: bytes32 (32 bytes, Solana public key)
 * - amount: uint64 (8 bytes, little-endian)
 *
 * Usage:
 *   npm run merkle                                  # generate from eligible_wallets.json
 *   npm run merkle -- --total-supply 200000000000000  # with supply conversion
 *
 * Outputs:
 *   output/merkle_tree.json  — full tree with proofs for each claimant
 */
import fs from "fs";
import { PublicKey } from "@solana/web3.js";
import { keccak_256 } from "@noble/hashes/sha3";
import { config } from "./config";

// --- Merkle Tree Implementation ---

function hashLeaf(index: bigint, claimant: Buffer, amount: bigint): Buffer {
  // Pack: index (8 bytes LE) + claimant (32 bytes) + amount (8 bytes LE)
  const buf = Buffer.alloc(48);
  buf.writeBigUInt64LE(index, 0);
  claimant.copy(buf, 8);
  buf.writeBigUInt64LE(amount, 40);
  return Buffer.from(keccak_256(buf));
}

function hashPair(a: Buffer, b: Buffer): Buffer {
  // Sort the pair for deterministic ordering
  const [first, second] = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a];
  return Buffer.from(keccak_256(Buffer.concat([first, second])));
}

interface MerkleLeaf {
  index: number;
  wallet: string;
  amount: string;
  hash: Buffer;
}

interface MerkleTreeResult {
  root: string;
  totalAmount: string;
  recipientCount: number;
  leaves: {
    index: number;
    wallet: string;
    amount: string;
    proof: string[];
  }[];
}

function buildMerkleTree(leaves: MerkleLeaf[]): { root: Buffer; proofs: Map<number, Buffer[]> } {
  if (leaves.length === 0) {
    throw new Error("Cannot build Merkle tree with no leaves");
  }

  // Sort leaves by hash for deterministic tree structure
  const sortedLeaves = [...leaves].sort((a, b) => Buffer.compare(a.hash, b.hash));
  const indexToSortedIdx = new Map<number, number>();
  sortedLeaves.forEach((leaf, idx) => indexToSortedIdx.set(leaf.index, idx));

  // Build tree layers
  let currentLayer = sortedLeaves.map((l) => l.hash);
  const layers: Buffer[][] = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer: Buffer[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(hashPair(currentLayer[i]!, currentLayer[i + 1]!));
      } else {
        // Odd node, promote to next level
        nextLayer.push(currentLayer[i]!);
      }
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  const root = layers[layers.length - 1]![0]!;

  // Generate proofs for each leaf
  const proofs = new Map<number, Buffer[]>();
  for (const leaf of leaves) {
    const proof: Buffer[] = [];
    let idx = indexToSortedIdx.get(leaf.index)!;

    for (let layerIdx = 0; layerIdx < layers.length - 1; layerIdx++) {
      const layer = layers[layerIdx]!;
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

      if (siblingIdx < layer.length) {
        proof.push(layer[siblingIdx]!);
      }

      idx = Math.floor(idx / 2);
    }

    proofs.set(leaf.index, proof);
  }

  return { root, proofs };
}

// --- Main ---

function main(): void {
  const args = process.argv.slice(2);

  // Load eligible wallets
  const inputPath = `${config.outputDir}/eligible_wallets.json`;
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    console.error("Run `npm run export` first to generate the eligible wallets list.");
    process.exit(1);
  }

  interface WalletEntry {
    index: number;
    wallet: string;
    amount: string;
    points: number;
    breakdown?: { token: string; tier: string; pct: number; points: number }[];
  }

  const wallets: WalletEntry[] = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  if (wallets.length === 0) {
    console.error("No eligible wallets found in input file.");
    process.exit(1);
  }

  console.log(`Loaded ${wallets.length.toLocaleString()} eligible wallets`);

  // Build leaves
  const leaves: MerkleLeaf[] = wallets.map((w, i) => {
    const claimant = new PublicKey(w.wallet).toBuffer();
    const amount = BigInt(w.amount);
    const index = BigInt(i);
    const hash = hashLeaf(index, claimant, amount);

    return {
      index: i,
      wallet: w.wallet,
      amount: w.amount,
      hash,
    };
  });

  console.log("Building Merkle tree...");
  const { root, proofs } = buildMerkleTree(leaves);

  // Compute totals
  const totalAmount = leaves.reduce((sum, l) => sum + BigInt(l.amount), 0n);

  // Build output
  const result: MerkleTreeResult = {
    root: root.toString("hex"),
    totalAmount: totalAmount.toString(),
    recipientCount: leaves.length,
    leaves: leaves.map((l) => ({
      index: l.index,
      wallet: l.wallet,
      amount: l.amount,
      proof: proofs.get(l.index)!.map((p) => p.toString("hex")),
    })),
  };

  // Write output
  const outputPath = `${config.outputDir}/merkle_tree.json`;
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");

  console.log(`\n=== Merkle Tree Generated ===`);
  console.log(`  Root: 0x${result.root}`);
  console.log(`  Recipients: ${result.recipientCount.toLocaleString()}`);
  console.log(`  Total amount: ${result.totalAmount}`);
  console.log(`  Output: ${outputPath}`);

  // Also write a compact version for the frontend (root only + lookup by wallet)
  const lookupPath = `${config.outputDir}/merkle_proofs.json`;
  const lookup: Record<string, {
    index: number;
    amount: string;
    proof: string[];
    points: number;
    breakdown: { token: string; tier: string; pct: number; points: number }[];
  }> = {};
  for (const leaf of result.leaves) {
    const original = wallets.find((w) => w.wallet === leaf.wallet);
    lookup[leaf.wallet] = {
      index: leaf.index,
      amount: leaf.amount,
      proof: leaf.proof,
      points: original?.points ?? 0,
      breakdown: original?.breakdown ?? [],
    };
  }
  fs.writeFileSync(
    lookupPath,
    JSON.stringify({ root: result.root, proofs: lookup }, null, 2) + "\n"
  );
  console.log(`  Lookup file: ${lookupPath}`);
}

main();
