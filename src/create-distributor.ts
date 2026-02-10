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
} from "@solana/spl-token";
import * as fs from "fs";
import * as dotenv from "dotenv";
import bs58 from "bs58";

dotenv.config();

// Jito/OpenSea Merkle Distributor Program
const MERKLE_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv"
);

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  tokenMint: new PublicKey("9XEk9BFJQ6d9zuFxMqekmxitx8a8aXvf4XHddEC86AFf"),
  merkleRoot: "3da7641a2461ebe6e0140dc4dedbab928a048d18abcce05100832b0d3baf0028",
  maxTotalClaim: BigInt("70000000000"), // 70,000 tokens with 6 decimals
  maxNumNodes: BigInt(93107),
  clawbackStartTs: BigInt(1746057600), // May 1, 2025
  clawbackReceiver: new PublicKey("53ta1BRk53xZa5L9CpgFX7gapc1MvLL1VsxESnSsTpPb"),
};

// New Distributor instruction discriminator
const NEW_DISTRIBUTOR_DISCRIMINATOR = Buffer.from([
  0x20, 0x6d, 0x97, 0xe5, 0x9f, 0xf6, 0xf1, 0xaa,
]);

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

  // Derive the token vault
  const tokenVault = await getAssociatedTokenAddress(
    CONFIG.tokenMint,
    distributorPda,
    true // allowOwnerOffCurve
  );

  console.log("  Token Vault:", tokenVault.toBase58());
  console.log("");

  // Check admin balance
  const balance = await connection.getBalance(admin.publicKey);
  console.log("  Admin SOL Balance:", (balance / 1e9).toFixed(4), "SOL");

  if (balance < 0.05 * 1e9) {
    console.error("Insufficient SOL balance. Need at least 0.05 SOL for rent and fees.");
    process.exit(1);
  }

  // Build the new_distributor instruction
  // Data layout:
  // - 8 bytes: discriminator
  // - 1 byte: version (0)
  // - 32 bytes: root
  // - 8 bytes: max_total_claim
  // - 8 bytes: max_num_nodes
  // - 8 bytes: unlock_time (0 for immediate)
  // - 8 bytes: start_vesting_ts (0)
  // - 8 bytes: end_vesting_ts (0)
  // - 8 bytes: clawback_start_ts
  // - 1 byte: clawback_receiver_owner (0 = admin)
  // - 1 byte: enable_slot (0)

  const rootBuffer = Buffer.from(CONFIG.merkleRoot, "hex");

  const dataLength = 8 + 1 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
  const data = Buffer.alloc(dataLength);
  let offset = 0;

  // Discriminator
  NEW_DISTRIBUTOR_DISCRIMINATOR.copy(data, offset);
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
  data.writeBigUInt64LE(BigInt(0), offset);
  offset += 8;

  // start_vesting_ts (0 = no vesting)
  data.writeBigUInt64LE(BigInt(0), offset);
  offset += 8;

  // end_vesting_ts (0 = no vesting)
  data.writeBigUInt64LE(BigInt(0), offset);
  offset += 8;

  // clawback_start_ts
  data.writeBigUInt64LE(CONFIG.clawbackStartTs, offset);
  offset += 8;

  // clawback_receiver_owner (0 = use admin as clawback receiver)
  data.writeUInt8(0, offset);
  offset += 1;

  // enable_slot (0 = disabled)
  data.writeUInt8(0, offset);

  const newDistributorIx = new TransactionInstruction({
    programId: MERKLE_DISTRIBUTOR_PROGRAM_ID,
    keys: [
      { pubkey: base.publicKey, isSigner: true, isWritable: false },
      { pubkey: distributorPda, isSigner: false, isWritable: true },
      { pubkey: CONFIG.tokenMint, isSigner: false, isWritable: false },
      { pubkey: tokenVault, isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), isSigner: false, isWritable: false }, // Associated Token Program
    ],
    data,
  });

  const transaction = new Transaction().add(newDistributorIx);

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
  console.log(`  1. Send 70,000 tokens to the vault: ${tokenVault.toBase58()}`);
  console.log("  2. Update claim-app/lib/constants.ts with DISTRIBUTOR_PUBKEY");
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
