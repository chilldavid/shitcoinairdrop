/**
 * Create a Merkle Distributor on-chain.
 *
 * Usage:
 *   Set ADMIN_PRIVATE_KEY in .env (base58 string) or ADMIN_KEYPAIR_PATH (JSON file path)
 *   npm run create-distributor
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
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import { createHash } from "crypto";

dotenv.config();

// Jito/OpenSea Merkle Distributor Program
const MERKLE_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv"
);

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  tokenMint: new PublicKey("GkDY92hamTR9Vv8QDHhq548KgoSb5fpCXTjFdNAVpump"),
  merkleRoot: "0000000000000000000000000000000000000000000000000000000000000000", // UPDATE after running `npm run merkle`
  maxTotalClaim: BigInt("200000000000000"), // 200,000,000 tokens with 6 decimals
  maxNumNodes: BigInt(100000), // UPDATE with actual recipient count from merkle output
  clawbackStartTs: BigInt(1809216000), // May 1, 2027
  clawbackReceiver: new PublicKey("3JZqLjJkir7QMxaJoBnba1q53H88nuZFcSjwiXyQE7o4"),
};

// Calculate Anchor discriminator: sha256("global:new_distributor")[0..8]
function getDiscriminator(name: string): Buffer {
  const disc = createHash("sha256").update(`global:${name}`).digest().slice(0, 8);
  console.log(`  Discriminator for "${name}": ${disc.toString("hex")}`);
  return disc;
}

function loadKeypair(): Keypair {
  // Try private key from env first
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

  // Try keypair file path
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
  const admin = loadKeypair();

  console.log("=== Create Merkle Distributor ===");
  console.log("  Admin:", admin.publicKey.toBase58());
  console.log("  Token Mint:", CONFIG.tokenMint.toBase58());
  console.log("  Merkle Root:", CONFIG.merkleRoot);
  console.log("  Max Total Claim:", CONFIG.maxTotalClaim.toString());
  console.log("  Max Num Nodes:", CONFIG.maxNumNodes.toString());
  console.log("  Clawback Start:", new Date(Number(CONFIG.clawbackStartTs) * 1000).toISOString());
  console.log("  Clawback Receiver:", CONFIG.clawbackReceiver.toBase58());
  console.log("");

  // Generate a new keypair for the distributor base
  const base = Keypair.generate();

  // Derive the distributor PDA
  const [distributorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("MerkleDistributor"), base.publicKey.toBuffer()],
    MERKLE_DISTRIBUTOR_PROGRAM_ID
  );

  console.log("  Base Keypair:", base.publicKey.toBase58());
  console.log("  Distributor PDA:", distributorPda.toBase58());

  // Detect token program (Token vs Token-2022) - must happen before ATA derivation
  const mintInfo = await connection.getAccountInfo(CONFIG.tokenMint);
  if (!mintInfo) {
    console.error("Token mint not found");
    process.exit(1);
  }
  const tokenProgramId = mintInfo.owner;
  const isToken2022 = tokenProgramId.equals(TOKEN_2022_PROGRAM_ID);
  console.log("  Token Program:", isToken2022 ? "Token-2022" : "Token (classic)");

  // Derive the token vault (using correct token program)
  const tokenVault = getAssociatedTokenAddressSync(
    CONFIG.tokenMint,
    distributorPda,
    true, // allowOwnerOffCurve
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("  Token Vault:", tokenVault.toBase58());

  // Derive the clawback receiver's token account (ATA)
  console.log("  DEBUG - ATA derivation inputs:");
  console.log("    Mint:", CONFIG.tokenMint.toBase58());
  console.log("    Owner:", CONFIG.clawbackReceiver.toBase58());
  console.log("    Token Program:", tokenProgramId.toBase58());

  const clawbackReceiverAta = getAssociatedTokenAddressSync(
    CONFIG.tokenMint,
    CONFIG.clawbackReceiver,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("  Clawback Receiver ATA:", clawbackReceiverAta.toBase58());
  console.log("");

  // Check admin balance
  const balance = await connection.getBalance(admin.publicKey);
  console.log("  Admin SOL Balance:", (balance / 1e9).toFixed(4), "SOL");

  if (balance < 0.05 * 1e9) {
    console.error("Insufficient SOL balance. Need at least 0.05 SOL for rent and fees.");
    process.exit(1);
  }

  // Build the new_distributor instruction
  // Data layout from Jito distributor:
  // - 8 bytes: discriminator
  // - 1 byte: version
  // - 32 bytes: root
  // - 8 bytes: max_total_claim (u64)
  // - 8 bytes: max_num_nodes (u64)
  // - 8 bytes: unlock_time (i64)
  // - 8 bytes: start_vesting_ts (i64)
  // - 8 bytes: end_vesting_ts (i64)
  // - 8 bytes: clawback_start_ts (i64)
  // - 8 bytes: enable_slot (u64)

  const rootBuffer = Buffer.from(CONFIG.merkleRoot, "hex");
  const discriminator = getDiscriminator("new_distributor");

  const dataLength = 8 + 1 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8;
  const data = Buffer.alloc(dataLength);
  let offset = 0;

  // Discriminator
  discriminator.copy(data, offset);
  offset += 8;

  // Version
  data.writeUInt8(0, offset);
  offset += 1;

  // Root
  rootBuffer.copy(data, offset);
  offset += 32;

  // max_total_claim
  data.writeBigUInt64LE(CONFIG.maxTotalClaim, offset);
  offset += 8;

  // max_num_nodes
  data.writeBigUInt64LE(CONFIG.maxNumNodes, offset);
  offset += 8;

  // unlock_time (0 = immediate)
  data.writeBigInt64LE(BigInt(0), offset);
  offset += 8;

  // start_vesting_ts (0 = no vesting)
  data.writeBigInt64LE(BigInt(0), offset);
  offset += 8;

  // end_vesting_ts (0 = no vesting)
  data.writeBigInt64LE(BigInt(0), offset);
  offset += 8;

  // clawback_start_ts
  data.writeBigInt64LE(CONFIG.clawbackStartTs, offset);
  offset += 8;

  // enable_slot (0 = disabled)
  data.writeBigUInt64LE(BigInt(0), offset);

  // Check if clawback receiver ATA exists, create if not
  // Must verify it's actually a token account for the CORRECT mint, not just any account
  const clawbackAtaInfo = await connection.getAccountInfo(clawbackReceiverAta);
  const instructions: TransactionInstruction[] = [];

  let isValidTokenAccount = false;
  console.log("  DEBUG - Checking ATA at:", clawbackReceiverAta.toBase58());
  if (clawbackAtaInfo) {
    console.log("    Account exists, owner:", clawbackAtaInfo.owner.toBase58());
    console.log("    Data length:", clawbackAtaInfo.data.length);
    if (clawbackAtaInfo.data.length >= 32) {
      const accountMint = new PublicKey(clawbackAtaInfo.data.slice(0, 32));
      console.log("    First 32 bytes (mint?):", accountMint.toBase58());
    }
    if (clawbackAtaInfo.data.length >= 64) {
      const accountOwner = new PublicKey(clawbackAtaInfo.data.slice(32, 64));
      console.log("    Bytes 32-64 (owner?):", accountOwner.toBase58());
    }
  } else {
    console.log("    Account does NOT exist");
  }

  if (clawbackAtaInfo &&
      (clawbackAtaInfo.owner.equals(TOKEN_PROGRAM_ID) || clawbackAtaInfo.owner.equals(TOKEN_2022_PROGRAM_ID))) {
    // Check if this is a token account (not a mint) by verifying the mint field matches
    // Token account layout: first 32 bytes = mint pubkey
    if (clawbackAtaInfo.data.length >= 32) {
      const accountMint = new PublicKey(clawbackAtaInfo.data.slice(0, 32));
      isValidTokenAccount = accountMint.equals(CONFIG.tokenMint);
      if (!isValidTokenAccount) {
        console.log("  Found account at ATA address but mint doesn't match (might be a different token or mint account)");
      }
    }
  }

  if (!isValidTokenAccount) {
    console.log("  Creating clawback receiver token account...");
    instructions.push(
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        clawbackReceiverAta,
        CONFIG.clawbackReceiver,
        CONFIG.tokenMint,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  } else {
    console.log("  Clawback receiver ATA already exists and is valid.");
  }

  const newDistributorIx = new TransactionInstruction({
    programId: MERKLE_DISTRIBUTOR_PROGRAM_ID,
    keys: [
      { pubkey: base.publicKey, isSigner: true, isWritable: false },
      { pubkey: distributorPda, isSigner: false, isWritable: true },
      { pubkey: CONFIG.tokenMint, isSigner: false, isWritable: false },
      { pubkey: tokenVault, isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: clawbackReceiverAta, isSigner: false, isWritable: false }, // clawback_receiver TOKEN ACCOUNT
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // Associated Token Program
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }, // Token Program (classic or 2022)
    ],
    data,
  });
  instructions.push(newDistributorIx);

  const transaction = new Transaction().add(...instructions);

  // Simulate first
  console.log("Simulating transaction...");
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = admin.publicKey;

  const simulation = await connection.simulateTransaction(transaction, [admin, base]);
  if (simulation.value.err) {
    console.error("Simulation failed:", simulation.value.err);
    if (simulation.value.logs) {
      console.error("Logs:");
      simulation.value.logs.forEach((log) => console.error("  ", log));
    }
    process.exit(1);
  }

  console.log("Simulation successful!");
  console.log("");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Send transaction
  console.log("Sending transaction...");
  const signature = await sendAndConfirmTransaction(connection, transaction, [admin, base], {
    commitment: "confirmed",
  });

  console.log("");
  console.log("=== Distributor Created Successfully! ===");
  console.log("  Transaction:", signature);
  console.log("");
  console.log("  DISTRIBUTOR_PUBKEY:", distributorPda.toBase58());
  console.log("  TOKEN_VAULT:", tokenVault.toBase58());
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Send 200,000,000 tokens to the vault: ${tokenVault.toBase58()}`);
  console.log("  2. Update claim-app/lib/constants.ts DISTRIBUTOR_PUBKEY with:", distributorPda.toBase58());
  console.log("  3. Deploy the claim app");

  // Save distributor info
  const infoPath = "output/distributor_info.json";
  fs.writeFileSync(
    infoPath,
    JSON.stringify(
      {
        distributorPubkey: distributorPda.toBase58(),
        tokenVault: tokenVault.toBase58(),
        base: base.publicKey.toBase58(),
        baseSecretKey: bs58.encode(base.secretKey),
        tokenMint: CONFIG.tokenMint.toBase58(),
        merkleRoot: CONFIG.merkleRoot,
        maxTotalClaim: CONFIG.maxTotalClaim.toString(),
        clawbackStartTs: CONFIG.clawbackStartTs.toString(),
        clawbackReceiver: CONFIG.clawbackReceiver.toBase58(),
        transaction: signature,
      },
      null,
      2
    )
  );
  console.log(`  Saved distributor info to ${infoPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
