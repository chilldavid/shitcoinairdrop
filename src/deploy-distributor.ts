/**
 * Deploy and initialize the Token-2022 compatible Merkle Claim distributor.
 *
 * Usage:
 *   1. Build the program: anchor build
 *   2. Get program ID: solana address -k target/deploy/merkle_claim-keypair.json
 *   3. Update PROGRAM_ID below
 *   4. Run: npm run deploy-distributor
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import { createHash } from "crypto";
import BN from "bn.js";

dotenv.config();

// UPDATE THIS after building the program
const PROGRAM_ID = new PublicKey("CLAiM1111111111111111111111111111111111111");

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  tokenMint: new PublicKey("GkDY92hamTR9Vv8QDHhq548KgoSb5fpCXTjFdNAVpump"),
  merkleRoot: "0000000000000000000000000000000000000000000000000000000000000000", // UPDATE after running `npm run merkle`
  maxTotalClaim: BigInt("200000000000000"), // 200,000,000 tokens with 6 decimals
  maxNumNodes: BigInt(100000), // UPDATE with actual recipient count from merkle output
  clawbackStartTs: BigInt(1809216000), // May 1, 2027
};

function getDiscriminator(namespace: string, name: string): Buffer {
  return createHash("sha256")
    .update(`${namespace}:${name}`)
    .digest()
    .slice(0, 8);
}

function loadKeypair(): Keypair {
  const privateKey = process.env.ADMIN_PRIVATE_KEY;
  if (privateKey) {
    try {
      const decoded = bs58.decode(privateKey);
      return Keypair.fromSecretKey(decoded);
    } catch {
      console.error("Invalid ADMIN_PRIVATE_KEY format");
      process.exit(1);
    }
  }

  const keypairPath = process.env.ADMIN_KEYPAIR_PATH;
  if (keypairPath && fs.existsSync(keypairPath)) {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  }

  console.error("Set ADMIN_PRIVATE_KEY (base58) or ADMIN_KEYPAIR_PATH in .env");
  process.exit(1);
}

async function main() {
  const rpcUrl = process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com";

  const connection = new Connection(rpcUrl, "confirmed");
  const authority = loadKeypair();

  console.log("=== Deploy Merkle Claim Distributor ===");
  console.log("  Program ID:", PROGRAM_ID.toBase58());
  console.log("  Authority:", authority.publicKey.toBase58());
  console.log("  Token Mint:", CONFIG.tokenMint.toBase58());
  console.log("  Merkle Root:", CONFIG.merkleRoot);
  console.log("  Max Total Claim:", CONFIG.maxTotalClaim.toString());
  console.log("  Max Num Nodes:", CONFIG.maxNumNodes.toString());
  console.log("  Clawback Start:", new Date(Number(CONFIG.clawbackStartTs) * 1000).toISOString());
  console.log("");

  // Detect token program
  const mintInfo = await connection.getAccountInfo(CONFIG.tokenMint);
  if (!mintInfo) {
    console.error("Token mint not found on this network");
    process.exit(1);
  }
  const tokenProgramId = mintInfo.owner;
  const isToken2022 = tokenProgramId.equals(TOKEN_2022_PROGRAM_ID);
  console.log("  Token Program:", isToken2022 ? "Token-2022" : "Token (classic)");

  // Derive PDA for distributor
  const [distributorPda, distributorBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("distributor"),
      CONFIG.tokenMint.toBuffer(),
      authority.publicKey.toBuffer(),
    ],
    PROGRAM_ID
  );
  console.log("  Distributor PDA:", distributorPda.toBase58());

  // Derive vault (ATA of distributor PDA)
  const vault = getAssociatedTokenAddressSync(
    CONFIG.tokenMint,
    distributorPda,
    true,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("  Vault:", vault.toBase58());

  // Clawback receiver (authority's token account)
  const clawbackReceiver = getAssociatedTokenAddressSync(
    CONFIG.tokenMint,
    authority.publicKey,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("  Clawback Receiver:", clawbackReceiver.toBase58());
  console.log("");

  // Check if already initialized
  const existingDistributor = await connection.getAccountInfo(distributorPda);
  if (existingDistributor) {
    console.log("Distributor already exists at this PDA!");
    console.log("If you need to create a new one, use a different authority.");
    process.exit(1);
  }

  // Build initialize instruction
  // Data layout:
  // - 8 bytes: discriminator
  // - 32 bytes: merkle_root
  // - 8 bytes: max_total_claim (u64)
  // - 8 bytes: max_num_nodes (u64)
  // - 8 bytes: clawback_start_ts (i64)

  const discriminator = getDiscriminator("global", "initialize");
  const rootBuffer = Buffer.from(CONFIG.merkleRoot, "hex");

  const dataLength = 8 + 32 + 8 + 8 + 8;
  const data = Buffer.alloc(dataLength);
  let offset = 0;

  discriminator.copy(data, offset);
  offset += 8;

  rootBuffer.copy(data, offset);
  offset += 32;

  data.writeBigUInt64LE(CONFIG.maxTotalClaim, offset);
  offset += 8;

  data.writeBigUInt64LE(CONFIG.maxNumNodes, offset);
  offset += 8;

  data.writeBigInt64LE(CONFIG.clawbackStartTs, offset);

  console.log("  Discriminator:", discriminator.toString("hex"));

  const initializeIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: distributorPda, isSigner: false, isWritable: true },
      { pubkey: CONFIG.tokenMint, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: clawbackReceiver, isSigner: false, isWritable: false },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const transaction = new Transaction().add(initializeIx);

  // Check balance
  const balance = await connection.getBalance(authority.publicKey);
  console.log("  Authority Balance:", (balance / 1e9).toFixed(4), "SOL");

  if (balance < 0.1 * 1e9) {
    console.error("Need at least 0.1 SOL for deployment");
    process.exit(1);
  }

  // Simulate first
  console.log("\nSimulating transaction...");
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority.publicKey;

  const simulation = await connection.simulateTransaction(transaction, [authority]);
  if (simulation.value.err) {
    console.error("Simulation failed:", simulation.value.err);
    if (simulation.value.logs) {
      console.error("Logs:");
      simulation.value.logs.forEach((log) => console.error("  ", log));
    }
    process.exit(1);
  }

  console.log("Simulation successful!");
  console.log("\nSending transaction...");

  try {
    const sig = await sendAndConfirmTransaction(connection, transaction, [authority], {
      commitment: "confirmed",
    });
    console.log("\n=== SUCCESS ===");
    console.log("Transaction:", sig);
    console.log("Distributor:", distributorPda.toBase58());
    console.log("Vault:", vault.toBase58());
    console.log("\nNext steps:");
    console.log(`1. Send tokens to vault: ${vault.toBase58()}`);
    console.log("2. Update claim-app/lib/constants.ts with:");
    console.log(`   PROGRAM_ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`   DISTRIBUTOR_PUBKEY: ${distributorPda.toBase58()}`);
  } catch (err) {
    console.error("Transaction failed:", err);
    process.exit(1);
  }
}

main().catch(console.error);
