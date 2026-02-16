/**
 * Create a Merkle Distributor on-chain using our custom Token-2022 compatible program.
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
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import { createHash } from "crypto";

// Load .env manually as fallback for dotenv v17 issues
const envResult = dotenv.config();
if (envResult.error || !envResult.parsed || Object.keys(envResult.parsed).length === 0) {
  try {
    const envContent = fs.readFileSync(".env", "utf-8");
    for (const line of envContent.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
      if (match) process.env[match[1]] = match[2];
    }
  } catch {}
}

// Our custom Token-2022 compatible Merkle Claim Program
const MERKLE_CLAIM_PROGRAM_ID = new PublicKey(
  "DyyLURFK28R8GoTwpPsxHKydyhJ2SzYFJ17451B7he85"
);

// Load merkle tree output to get root and recipient count
function loadMerkleTree(): { root: string; totalAmount: string; recipientCount: number } {
  const treePath = "output/merkle_tree.json";
  if (!fs.existsSync(treePath)) {
    console.error(`Merkle tree not found: ${treePath}`);
    console.error("Run `npm run merkle` first.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(treePath, "utf-8"));
}

const merkleTree = loadMerkleTree();

const CONFIG = {
  tokenMint: new PublicKey("GkDY92hamTR9Vv8QDHhq548KgoSb5fpCXTjFdNAVpump"),
  merkleRoot: merkleTree.root,
  maxTotalClaim: BigInt(merkleTree.totalAmount), // from merkle tree output
  maxNumNodes: BigInt(merkleTree.recipientCount),
  clawbackStartTs: BigInt(1809148800), // May 1, 2027
  clawbackReceiver: new PublicKey("53ta1BRk53xZa5L9CpgFX7gapc1MvLL1VsxESnSsTpPb"),
  // Set to true for devnet testing, false for mainnet
  useDevnet: false,
};

// Calculate Anchor discriminator: sha256("global:initialize")[0..8]
function getDiscriminator(name: string): Buffer {
  const preimage = `global:${name}`;
  const disc = createHash("sha256").update(preimage).digest().slice(0, 8);
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

  // Try keypair file path from env
  const keypairPath = process.env.ADMIN_KEYPAIR_PATH;
  if (keypairPath && fs.existsSync(keypairPath)) {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  }

  // Fallback: check for keypair.json in project root
  if (fs.existsSync("keypair.json")) {
    console.log("  Loading keypair from ./keypair.json");
    const keypairData = JSON.parse(fs.readFileSync("keypair.json", "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  }

  console.error("Set ADMIN_PRIVATE_KEY (base58) or ADMIN_KEYPAIR_PATH in .env, or place keypair.json in project root");
  process.exit(1);
}

async function main() {
  const rpcUrl = CONFIG.useDevnet
    ? "https://api.devnet.solana.com"
    : process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : "https://api.mainnet-beta.solana.com";

  const connection = new Connection(rpcUrl, "confirmed");
  const admin = loadKeypair();

  console.log("=== Create Merkle Distributor ===");
  console.log("  Network:", CONFIG.useDevnet ? "DEVNET" : "MAINNET");
  console.log("  Program ID:", MERKLE_CLAIM_PROGRAM_ID.toBase58());
  console.log("  Admin:", admin.publicKey.toBase58());
  console.log("  Token Mint:", CONFIG.tokenMint.toBase58());
  console.log("  Merkle Root:", CONFIG.merkleRoot);
  console.log("  Max Total Claim:", CONFIG.maxTotalClaim.toString());
  console.log("  Max Num Nodes:", CONFIG.maxNumNodes.toString());
  console.log("  Clawback Start:", new Date(Number(CONFIG.clawbackStartTs) * 1000).toISOString());
  console.log("  Clawback Receiver:", CONFIG.clawbackReceiver.toBase58());
  console.log("");

  // Derive the distributor PDA
  // Seeds: ["distributor", mint, authority]
  const [distributorPda, distributorBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("distributor"),
      CONFIG.tokenMint.toBuffer(),
      admin.publicKey.toBuffer(),
    ],
    MERKLE_CLAIM_PROGRAM_ID
  );

  console.log("  Distributor PDA:", distributorPda.toBase58());
  console.log("  Distributor bump:", distributorBump);

  // Detect token program (Token vs Token-2022)
  const mintInfo = await connection.getAccountInfo(CONFIG.tokenMint);
  if (!mintInfo) {
    console.error("Token mint not found on", CONFIG.useDevnet ? "devnet" : "mainnet");
    console.error("If testing on devnet, you need a devnet token mint.");
    process.exit(1);
  }
  const tokenProgramId = mintInfo.owner;
  const isToken2022 = tokenProgramId.equals(TOKEN_2022_PROGRAM_ID);
  console.log("  Token Program:", isToken2022 ? "Token-2022" : "Token (classic)");

  // Derive the token vault (ATA owned by distributor PDA)
  const tokenVault = getAssociatedTokenAddressSync(
    CONFIG.tokenMint,
    distributorPda,
    true, // allowOwnerOffCurve
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("  Token Vault:", tokenVault.toBase58());
  console.log("");

  // Check admin balance
  const balance = await connection.getBalance(admin.publicKey);
  console.log("  Admin SOL Balance:", (balance / 1e9).toFixed(4), "SOL");

  if (balance < 0.05 * 1e9) {
    console.error("Insufficient SOL balance. Need at least 0.05 SOL for rent and fees.");
    if (CONFIG.useDevnet) {
      console.error("Get devnet SOL from: https://faucet.solana.com/");
    }
    process.exit(1);
  }

  // Check if distributor already exists
  const distributorInfo = await connection.getAccountInfo(distributorPda);
  if (distributorInfo) {
    console.error("Distributor already exists at:", distributorPda.toBase58());
    console.error("If you need to recreate, you'll need to use a different authority.");
    process.exit(1);
  }

  // Build the initialize instruction
  // Anchor instruction data layout:
  // - 8 bytes: discriminator (sha256("global:initialize")[0..8])
  // - 32 bytes: merkle_root ([u8; 32])
  // - 8 bytes: max_total_claim (u64)
  // - 8 bytes: max_num_nodes (u64)
  // - 8 bytes: clawback_start_ts (i64)

  const rootBuffer = Buffer.from(CONFIG.merkleRoot, "hex");
  const discriminator = getDiscriminator("initialize");

  const dataLength = 8 + 32 + 8 + 8 + 8;
  const data = Buffer.alloc(dataLength);
  let offset = 0;

  // Discriminator
  discriminator.copy(data, offset);
  offset += 8;

  // merkle_root
  rootBuffer.copy(data, offset);
  offset += 32;

  // max_total_claim
  data.writeBigUInt64LE(CONFIG.maxTotalClaim, offset);
  offset += 8;

  // max_num_nodes
  data.writeBigUInt64LE(CONFIG.maxNumNodes, offset);
  offset += 8;

  // clawback_start_ts
  data.writeBigInt64LE(CONFIG.clawbackStartTs, offset);
  offset += 8;

  // Build instruction
  // Accounts for Initialize (in order from the Anchor IDL):
  // 1. authority (signer, mut) - payer
  // 2. distributor (init, PDA)
  // 3. mint (InterfaceAccount<Mint>)
  // 4. vault (init, ATA)
  // 5. clawback_receiver (UncheckedAccount)
  // 6. token_program (Interface<TokenInterface>)
  // 7. associated_token_program
  // 8. system_program

  const initializeIx = new TransactionInstruction({
    programId: MERKLE_CLAIM_PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true }, // authority
      { pubkey: distributorPda, isSigner: false, isWritable: true }, // distributor
      { pubkey: CONFIG.tokenMint, isSigner: false, isWritable: false }, // mint
      { pubkey: tokenVault, isSigner: false, isWritable: true }, // vault
      { pubkey: CONFIG.clawbackReceiver, isSigner: false, isWritable: false }, // clawback_receiver
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }, // token_program
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    data,
  });

  const transaction = new Transaction().add(initializeIx);

  // Simulate first
  console.log("Simulating transaction...");
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = admin.publicKey;

  const simulation = await connection.simulateTransaction(transaction, [admin]);
  if (simulation.value.err) {
    console.error("Simulation failed:", simulation.value.err);
    if (simulation.value.logs) {
      console.error("Logs:");
      simulation.value.logs.forEach((log) => console.error("  ", log));
    }
    process.exit(1);
  }

  console.log("Simulation successful!");
  if (simulation.value.logs) {
    console.log("Logs:");
    simulation.value.logs.forEach((log) => console.log("  ", log));
  }
  console.log("");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Send transaction
  console.log("Sending transaction...");
  const signature = await sendAndConfirmTransaction(connection, transaction, [admin], {
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
  console.log("  2. Update claim-app/lib/constants.ts with DISTRIBUTOR_PUBKEY");
  console.log("  3. Deploy the claim app");

  // Save distributor info
  if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
  }
  const infoPath = "output/distributor_info.json";
  fs.writeFileSync(
    infoPath,
    JSON.stringify(
      {
        network: CONFIG.useDevnet ? "devnet" : "mainnet",
        programId: MERKLE_CLAIM_PROGRAM_ID.toBase58(),
        distributorPubkey: distributorPda.toBase58(),
        tokenVault: tokenVault.toBase58(),
        tokenMint: CONFIG.tokenMint.toBase58(),
        merkleRoot: CONFIG.merkleRoot,
        maxTotalClaim: CONFIG.maxTotalClaim.toString(),
        maxNumNodes: CONFIG.maxNumNodes.toString(),
        clawbackStartTs: CONFIG.clawbackStartTs.toString(),
        clawbackReceiver: CONFIG.clawbackReceiver.toBase58(),
        transaction: signature,
        createdAt: new Date().toISOString(),
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
