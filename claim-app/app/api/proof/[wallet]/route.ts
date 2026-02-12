import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";

interface BreakdownEntry {
  token: string;
  tier: string;
  pct: number;
  points: number;
}

interface ProofEntry {
  index: number;
  amount: string;
  proof: string[];
  points: number;
  breakdown: BreakdownEntry[];
}

interface MerkleProofs {
  root: string;
  proofs: Record<string, ProofEntry>;
}

// Cache the proofs in memory after first load
let cachedProofs: MerkleProofs | null = null;

function loadProofs(): MerkleProofs {
  if (cachedProofs) return cachedProofs;

  // Try claim-app/data first (for Vercel), then fall back to ../output (local dev)
  const vercelPath = path.join(process.cwd(), "data", "merkle_proofs.json");
  const localPath = path.join(process.cwd(), "..", "output", "merkle_proofs.json");
  const proofsPath = fs.existsSync(vercelPath) ? vercelPath : localPath;

  if (!fs.existsSync(proofsPath)) {
    throw new Error("Merkle proofs file not found. Run `npm run merkle` first.");
  }

  cachedProofs = JSON.parse(fs.readFileSync(proofsPath, "utf-8"));
  return cachedProofs!;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet;

    // Validate wallet address format
    try {
      new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { eligible: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const { proofs } = loadProofs();

    const entry = proofs[wallet];

    if (!entry) {
      return NextResponse.json({ eligible: false });
    }

    return NextResponse.json({
      eligible: true,
      index: entry.index,
      amount: entry.amount,
      proof: entry.proof,
      points: entry.points,
      breakdown: entry.breakdown,
    });
  } catch (err) {
    console.error("Proof API error:", err);
    return NextResponse.json(
      { eligible: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
