/**
 * Create a test Token-2022 mint on devnet for testing the merkle claim program.
 *
 * Usage:
 *   Set ADMIN_PRIVATE_KEY in .env (base58 string) or ADMIN_KEYPAIR_PATH (JSON file path)
 *   npx ts-node src/create-test-token.ts
 */
import {
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as dotenv from "dotenv";
import bs58 from "bs58";

dotenv.config();

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
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const admin = loadKeypair();

  console.log("=== Create Test Token-2022 on Devnet ===");
  console.log("  Admin:", admin.publicKey.toBase58());

  // Check admin balance
  const balance = await connection.getBalance(admin.publicKey);
  console.log("  SOL Balance:", (balance / 1e9).toFixed(4), "SOL");

  if (balance < 0.1 * 1e9) {
    console.error("Insufficient SOL. Need at least 0.1 SOL.");
    console.error("Get devnet SOL from: https://faucet.solana.com/");
    process.exit(1);
  }

  // Create mint keypair
  const mintKeypair = Keypair.generate();
  const decimals = 6;

  console.log("  Creating Token-2022 mint:", mintKeypair.publicKey.toBase58());

  // Get mint account size
  const mintLen = getMintLen([]);
  const mintRent = await connection.getMinimumBalanceForRentExemption(mintLen);

  // Create mint account
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: admin.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: mintLen,
    lamports: mintRent,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // Initialize mint
  const initMintIx = createInitializeMintInstruction(
    mintKeypair.publicKey,
    decimals,
    admin.publicKey, // mint authority
    admin.publicKey, // freeze authority
    TOKEN_2022_PROGRAM_ID
  );

  // Create admin's token account
  const adminAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    admin.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const createAtaIx = createAssociatedTokenAccountInstruction(
    admin.publicKey,
    adminAta,
    admin.publicKey,
    mintKeypair.publicKey,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Mint 1 million tokens to admin
  const mintAmount = BigInt(1_000_000) * BigInt(10 ** decimals);
  const mintToIx = createMintToInstruction(
    mintKeypair.publicKey,
    adminAta,
    admin.publicKey,
    mintAmount,
    [],
    TOKEN_2022_PROGRAM_ID
  );

  const transaction = new Transaction().add(
    createMintAccountIx,
    initMintIx,
    createAtaIx,
    mintToIx
  );

  console.log("  Sending transaction...");
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [admin, mintKeypair],
    { commitment: "confirmed" }
  );

  console.log("");
  console.log("=== Test Token Created! ===");
  console.log("  Transaction:", signature);
  console.log("");
  console.log("  MINT:", mintKeypair.publicKey.toBase58());
  console.log("  Admin ATA:", adminAta.toBase58());
  console.log("  Minted:", (Number(mintAmount) / 10 ** decimals).toLocaleString(), "tokens");
  console.log("");
  console.log("Update CONFIG.tokenMint in src/create-distributor.ts with:");
  console.log(`  tokenMint: new PublicKey("${mintKeypair.publicKey.toBase58()}"),`);

  // Save mint info
  if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
  }
  const infoPath = "output/test_token_info.json";
  fs.writeFileSync(
    infoPath,
    JSON.stringify(
      {
        network: "devnet",
        mint: mintKeypair.publicKey.toBase58(),
        mintSecretKey: bs58.encode(mintKeypair.secretKey),
        decimals,
        adminAta: adminAta.toBase58(),
        mintedAmount: mintAmount.toString(),
        transaction: signature,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`  Saved test token info to ${infoPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
