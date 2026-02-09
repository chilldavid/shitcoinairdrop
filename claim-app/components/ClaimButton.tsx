"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  MERKLE_DISTRIBUTOR_PROGRAM_ID,
  DISTRIBUTOR_PUBKEY,
  TOKEN_MINT,
  TOKEN_DECIMALS,
  TOKEN_SYMBOL,
} from "@/lib/constants";

interface ProofData {
  eligible: boolean;
  index?: number;
  amount?: string;
  proof?: string[];
  error?: string;
}

interface ClaimStatus {
  hasClaimed: boolean;
}

export const ClaimButton: FC = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();

  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch proof data when wallet connects
  useEffect(() => {
    if (!publicKey) {
      setProofData(null);
      setClaimStatus(null);
      return;
    }

    const fetchProof = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/proof/${publicKey.toBase58()}`);
        const data = await res.json();
        setProofData(data);
      } catch (err) {
        setError("Failed to check eligibility. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProof();
  }, [publicKey]);

  // Check if user has already claimed
  useEffect(() => {
    if (!publicKey || !proofData?.eligible) {
      setClaimStatus(null);
      return;
    }

    const checkClaimStatus = async () => {
      try {
        // Derive ClaimStatus PDA
        const [claimStatusPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("ClaimStatus"),
            DISTRIBUTOR_PUBKEY.toBuffer(),
            publicKey.toBuffer(),
          ],
          MERKLE_DISTRIBUTOR_PROGRAM_ID
        );

        // Check if the account exists (means already claimed)
        const accountInfo = await connection.getAccountInfo(claimStatusPda);
        setClaimStatus({ hasClaimed: accountInfo !== null });
      } catch (err) {
        console.error("Failed to check claim status:", err);
      }
    };

    checkClaimStatus();
  }, [publicKey, proofData, connection]);

  const handleClaim = useCallback(async () => {
    if (!publicKey || !signTransaction || !proofData?.eligible) return;

    setClaiming(true);
    setError(null);
    setTxSignature(null);

    try {
      const { index, amount, proof } = proofData;
      if (index === undefined || !amount || !proof) {
        throw new Error("Invalid proof data");
      }

      // Derive PDAs
      const [distributorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("MerkleDistributor"), DISTRIBUTOR_PUBKEY.toBuffer()],
        MERKLE_DISTRIBUTOR_PROGRAM_ID
      );

      const [claimStatusPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("ClaimStatus"),
          DISTRIBUTOR_PUBKEY.toBuffer(),
          publicKey.toBuffer(),
        ],
        MERKLE_DISTRIBUTOR_PROGRAM_ID
      );

      // Get token accounts
      const vault = await getAssociatedTokenAddress(
        TOKEN_MINT,
        DISTRIBUTOR_PUBKEY,
        true // allowOwnerOffCurve for PDA
      );

      const userAta = await getAssociatedTokenAddress(TOKEN_MINT, publicKey);

      // Check if user has an ATA, if not we need to create it
      const userAtaInfo = await connection.getAccountInfo(userAta);

      const instructions: TransactionInstruction[] = [];

      // Create ATA if it doesn't exist
      if (!userAtaInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            userAta, // ata address
            publicKey, // owner
            TOKEN_MINT // mint
          )
        );
      }

      // Build claim instruction data
      // Layout: 8-byte discriminator + u64 index + u64 amount + Vec<[u8; 32]> proof
      const discriminator = Buffer.from([62, 198, 214, 193, 213, 159, 108, 210]); // claim instruction
      const indexBuf = Buffer.alloc(8);
      indexBuf.writeBigUInt64LE(BigInt(index), 0);
      const amountBuf = Buffer.alloc(8);
      amountBuf.writeBigUInt64LE(BigInt(amount), 0);

      // Proof vector: 4-byte length + concatenated 32-byte hashes
      const proofBufs = proof.map((p) => Buffer.from(p, "hex"));
      const proofLenBuf = Buffer.alloc(4);
      proofLenBuf.writeUInt32LE(proofBufs.length, 0);
      const proofData = Buffer.concat([proofLenBuf, ...proofBufs]);

      const data = Buffer.concat([discriminator, indexBuf, amountBuf, proofData]);

      // Build claim instruction
      const claimIx = new TransactionInstruction({
        programId: MERKLE_DISTRIBUTOR_PROGRAM_ID,
        keys: [
          { pubkey: DISTRIBUTOR_PUBKEY, isSigner: false, isWritable: true },
          { pubkey: claimStatusPda, isSigner: false, isWritable: true },
          { pubkey: vault, isSigner: false, isWritable: true },
          { pubkey: userAta, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_MINT, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });

      instructions.push(claimIx);

      // Build transaction
      const tx = new Transaction().add(...instructions);
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Simulate first
      console.log("Simulating transaction...");
      const simulation = await connection.simulateTransaction(tx);
      if (simulation.value.err) {
        console.error("Simulation error:", simulation.value.err);
        throw new Error(
          `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`
        );
      }
      console.log("Simulation successful");

      // Sign and send
      const signed = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      console.log("Transaction sent:", signature);

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setTxSignature(signature);
      setClaimStatus({ hasClaimed: true });
    } catch (err) {
      console.error("Claim error:", err);
      setError(err instanceof Error ? err.message : "Failed to claim tokens");
    } finally {
      setClaiming(false);
    }
  }, [publicKey, signTransaction, proofData, connection]);

  // Format token amount for display
  const formatAmount = (raw: string) => {
    const num = Number(raw) / 10 ** TOKEN_DECIMALS;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!connected) {
    return (
      <div className="claim-container">
        <h2>Connect your wallet to check eligibility</h2>
        <WalletMultiButton />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="claim-container">
        <p>Checking eligibility...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="claim-container">
        <p className="error">{error}</p>
        <WalletMultiButton />
      </div>
    );
  }

  if (!proofData?.eligible) {
    return (
      <div className="claim-container">
        <h2>Not Eligible</h2>
        <p>
          This wallet is not eligible for the airdrop. You need to hold at least
          0.0001% of one of the qualifying tokens.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  if (claimStatus?.hasClaimed) {
    return (
      <div className="claim-container">
        <h2>Already Claimed</h2>
        <p>
          You have already claimed your {formatAmount(proofData.amount!)}{" "}
          {TOKEN_SYMBOL} tokens.
        </p>
        {txSignature && (
          <a
            href={`https://solscan.io/tx/${txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction
          </a>
        )}
        <WalletMultiButton />
      </div>
    );
  }

  if (txSignature) {
    return (
      <div className="claim-container">
        <h2>Claim Successful!</h2>
        <p>
          You claimed {formatAmount(proofData.amount!)} {TOKEN_SYMBOL} tokens.
        </p>
        <a
          href={`https://solscan.io/tx/${txSignature}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View transaction on Solscan
        </a>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="claim-container">
      <h2>You are eligible!</h2>
      <p className="amount">
        {formatAmount(proofData.amount!)} {TOKEN_SYMBOL}
      </p>
      <button
        onClick={handleClaim}
        disabled={claiming}
        className="claim-button"
      >
        {claiming ? "Claiming..." : "Claim Tokens"}
      </button>
      <p className="note">You will pay a small SOL fee (~0.005 SOL) for the transaction.</p>
      <WalletMultiButton />
    </div>
  );
};
