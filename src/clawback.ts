import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

// Merkle Distributor Program ID
const MERKLE_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv"
);

// Clawback instruction discriminator (first 8 bytes of sha256("global:clawback"))
const CLAWBACK_DISCRIMINATOR = Buffer.from([
  0x5c, 0x47, 0x5c, 0x57, 0xcc, 0x37, 0x6f, 0x26,
]);

interface Config {
  distributorPubkey: string;
  tokenMint: string;
  clawbackReceiver: string;
}

async function clawback() {
  // Load config
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("Usage: npm run clawback -- <config.json>");
    console.error("");
    console.error("config.json should contain:");
    console.error(
      JSON.stringify(
        {
          distributorPubkey: "YOUR_DISTRIBUTOR_PDA",
          tokenMint: "YOUR_TOKEN_MINT",
          clawbackReceiver: "YOUR_ADMIN_WALLET",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const config: Config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  // Load admin keypair from environment or file
  const adminKeyPath = process.env.ADMIN_KEYPAIR_PATH;
  if (!adminKeyPath) {
    console.error("Set ADMIN_KEYPAIR_PATH environment variable to your keypair file");
    process.exit(1);
  }

  const adminKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(adminKeyPath, "utf-8")))
  );

  const rpcUrl = process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com";

  const connection = new Connection(rpcUrl, "confirmed");

  const distributor = new PublicKey(config.distributorPubkey);
  const tokenMint = new PublicKey(config.tokenMint);
  const clawbackReceiver = new PublicKey(config.clawbackReceiver);

  console.log("Clawback Configuration:");
  console.log("  Distributor:", distributor.toBase58());
  console.log("  Token Mint:", tokenMint.toBase58());
  console.log("  Clawback Receiver:", clawbackReceiver.toBase58());
  console.log("  Admin:", adminKeypair.publicKey.toBase58());
  console.log("");

  // Derive the distributor's token vault PDA
  const [tokenVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_vault"), distributor.toBuffer()],
    MERKLE_DISTRIBUTOR_PROGRAM_ID
  );

  console.log("  Token Vault:", tokenVault.toBase58());

  // Get vault balance
  const vaultBalance = await connection.getTokenAccountBalance(tokenVault);
  console.log(
    "  Vault Balance:",
    vaultBalance.value.uiAmountString,
    "tokens"
  );
  console.log("");

  if (vaultBalance.value.uiAmount === 0) {
    console.log("Vault is empty, nothing to clawback.");
    return;
  }

  // Get or create receiver's token account
  const receiverAta = await getAssociatedTokenAddress(
    tokenMint,
    clawbackReceiver
  );

  const transaction = new Transaction();

  // Check if receiver ATA exists
  const receiverAtaInfo = await connection.getAccountInfo(receiverAta);
  if (!receiverAtaInfo) {
    console.log("Creating receiver token account...");
    transaction.add(
      createAssociatedTokenAccountInstruction(
        adminKeypair.publicKey,
        receiverAta,
        clawbackReceiver,
        tokenMint
      )
    );
  }

  // Build clawback instruction
  // Accounts for clawback:
  // 1. distributor (mut)
  // 2. token_vault (mut)
  // 3. clawback_receiver_token_account (mut)
  // 4. admin (signer)
  // 5. token_program
  const clawbackIx = new TransactionInstruction({
    programId: MERKLE_DISTRIBUTOR_PROGRAM_ID,
    keys: [
      { pubkey: distributor, isSigner: false, isWritable: true },
      { pubkey: tokenVault, isSigner: false, isWritable: true },
      { pubkey: receiverAta, isSigner: false, isWritable: true },
      { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: CLAWBACK_DISCRIMINATOR,
  });

  transaction.add(clawbackIx);

  // Simulate first
  console.log("Simulating transaction...");
  const simulation = await connection.simulateTransaction(transaction, [
    adminKeypair,
  ]);

  if (simulation.value.err) {
    console.error("Simulation failed:", simulation.value.err);
    if (simulation.value.logs) {
      console.error("Logs:", simulation.value.logs.join("\n"));
    }
    process.exit(1);
  }

  console.log("Simulation successful!");
  console.log("");

  // Confirm with user
  console.log(
    `This will transfer ${vaultBalance.value.uiAmountString} tokens to ${clawbackReceiver.toBase58()}`
  );
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Execute
  console.log("Sending transaction...");
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    adminKeypair,
  ]);

  console.log("");
  console.log("Clawback successful!");
  console.log("Transaction:", signature);
  console.log(
    `Recovered ${vaultBalance.value.uiAmountString} tokens to ${clawbackReceiver.toBase58()}`
  );
}

clawback().catch((err) => {
  console.error("Clawback failed:", err);
  process.exit(1);
});
