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
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  MERKLE_CLAIM_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  DISTRIBUTOR_PUBKEY,
  TOKEN_MINT,
  TOKEN_DECIMALS,
  TOKEN_SYMBOL,
  EXPLORER_URL,
} from "@/lib/constants";
import { createHash } from "crypto";
import styles from "@/app/claim/claim.module.css";

interface BreakdownEntry {
  token: string;
  tier: string;
  pct: number;
  points: number;
}

interface ProofData {
  eligible: boolean;
  index?: number;
  amount?: string;
  proof?: string[];
  points?: number;
  breakdown?: BreakdownEntry[];
  error?: string;
}

interface ClaimStatus {
  hasClaimed: boolean;
}

interface ClaimButtonProps {
  tokenSprites?: Record<string, string>;
  mockProofData?: ProofData;
}

// Calculate Anchor discriminator
function getDiscriminator(name: string): Buffer {
  const preimage = `global:${name}`;
  return Buffer.from(
    createHash("sha256").update(preimage).digest()
  ).slice(0, 8);
}

export const ClaimButton: FC<ClaimButtonProps> = ({
  tokenSprites = {},
  mockProofData,
}) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();

  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use mock data if provided, otherwise use real proof data
  const displayData = mockProofData || proofData;

  // Fetch proof data when wallet connects (only when not mocking)
  useEffect(() => {
    if (mockProofData) return;

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
  }, [publicKey, mockProofData]);

  // Check if user has already claimed
  useEffect(() => {
    if (mockProofData) return;

    if (!publicKey || !proofData?.eligible || proofData.index === undefined) {
      setClaimStatus(null);
      return;
    }

    const checkClaimStatus = async () => {
      try {
        // Derive ClaimStatus PDA: ["claim", distributor, index]
        const indexBytes = Buffer.alloc(8);
        indexBytes.writeBigUInt64LE(BigInt(proofData.index!), 0);

        const [claimStatusPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("claim"),
            DISTRIBUTOR_PUBKEY.toBuffer(),
            indexBytes,
          ],
          MERKLE_CLAIM_PROGRAM_ID
        );

        // Check if the account exists (means already claimed)
        const accountInfo = await connection.getAccountInfo(claimStatusPda);
        setClaimStatus({ hasClaimed: accountInfo !== null });
      } catch (err) {
        console.error("Failed to check claim status:", err);
      }
    };

    checkClaimStatus();
  }, [publicKey, proofData, connection, mockProofData]);

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

      // Derive ClaimStatus PDA: ["claim", distributor, index]
      const indexBytes = Buffer.alloc(8);
      indexBytes.writeBigUInt64LE(BigInt(index), 0);

      const [claimStatusPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("claim"),
          DISTRIBUTOR_PUBKEY.toBuffer(),
          indexBytes,
        ],
        MERKLE_CLAIM_PROGRAM_ID
      );

      // Get vault ATA (owned by distributor)
      const vault = getAssociatedTokenAddressSync(
        TOKEN_MINT,
        DISTRIBUTOR_PUBKEY,
        true, // allowOwnerOffCurve for PDA
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // User's ATA
      const userAta = getAssociatedTokenAddressSync(
        TOKEN_MINT,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const instructions: TransactionInstruction[] = [];

      // Check if user has an ATA, if not create it
      const userAtaInfo = await connection.getAccountInfo(userAta);
      if (!userAtaInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            userAta, // ata address
            publicKey, // owner
            TOKEN_MINT, // mint
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Build claim instruction data
      // Layout: 8-byte discriminator + u64 index + u64 amount + Vec<[u8; 32]> proof
      const discriminator = getDiscriminator("claim");
      const amountBuf = Buffer.alloc(8);
      amountBuf.writeBigUInt64LE(BigInt(amount), 0);

      // Proof vector: 4-byte length + concatenated 32-byte hashes
      const proofBufs = proof.map((p) => Buffer.from(p, "hex"));
      const proofLenBuf = Buffer.alloc(4);
      proofLenBuf.writeUInt32LE(proofBufs.length, 0);
      const proofDataBuf = Buffer.concat([proofLenBuf, ...proofBufs]);

      const data = Buffer.concat([discriminator, indexBytes, amountBuf, proofDataBuf]);

      // Build claim instruction
      const claimIx = new TransactionInstruction({
        programId: MERKLE_CLAIM_PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: DISTRIBUTOR_PUBKEY, isSigner: false, isWritable: true },
          { pubkey: claimStatusPda, isSigner: false, isWritable: true },
          { pubkey: TOKEN_MINT, isSigner: false, isWritable: false },
          { pubkey: vault, isSigner: false, isWritable: true },
          { pubkey: userAta, isSigner: false, isWritable: true },
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
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
        console.error("Logs:", simulation.value.logs);
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

  const getExplorerUrl = (signature: string) => {
    return EXPLORER_URL.replace("{signature}", signature);
  };

  /** Shared breakdown renderer with mascot icons */
  const renderBreakdown = (breakdown: BreakdownEntry[]) => (
    <div className={styles.breakdown}>
      <p className={styles.breakdownTitle}>Your holdings at snapshot:</p>
      <ul className={styles.breakdownList}>
        {breakdown.map((entry, i) => (
          <li key={i} className={styles.breakdownItem}>
            {tokenSprites[entry.token] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tokenSprites[entry.token]}
                alt={entry.token}
                className={styles.mascotIcon}
              />
            )}
            <span className={styles.tokenName}>{entry.token}</span>
            <span className={styles.tierBadge}>{entry.tier}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  // ── Not connected ──
  if (!connected && !mockProofData) {
    return (
      <div className={styles.claimCard}>
        <h2>Connect your wallet to check eligibility</h2>
        <WalletMultiButton />
      </div>
    );
  }

  // ── Loading ──
  if (loading && !mockProofData) {
    return (
      <div className={styles.claimCard}>
        <p>Checking eligibility...</p>
      </div>
    );
  }

  // ── Error ──
  if (error && !mockProofData) {
    return (
      <div className={styles.claimCard}>
        <p className={styles.errorMsg}>{error}</p>
        <WalletMultiButton />
      </div>
    );
  }

  // ── Not eligible ──
  if (!displayData?.eligible) {
    return (
      <div className={styles.claimCard}>
        <h2>Not Eligible</h2>
        <p>
          This wallet is not eligible for the airdrop. You need to hold at least
          0.0001% of one of the qualifying tokens.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  // ── Already claimed ──
  if (claimStatus?.hasClaimed && !mockProofData) {
    return (
      <div className={styles.claimCard}>
        <h2>Already Claimed</h2>
        <p>
          You have already claimed your {formatAmount(displayData.amount!)}{" "}
          {TOKEN_SYMBOL} tokens.
        </p>
        {txSignature && (
          <a
            href={getExplorerUrl(txSignature)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.successLink}
          >
            View transaction
          </a>
        )}
        <WalletMultiButton />
      </div>
    );
  }

  // ── Claim success ──
  if (txSignature && !mockProofData) {
    return (
      <div className={styles.claimCard}>
        <h2>Claim Successful!</h2>
        <p>
          You claimed {formatAmount(displayData.amount!)} {TOKEN_SYMBOL} tokens.
        </p>
        <a
          href={getExplorerUrl(txSignature)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.successLink}
        >
          View transaction on Solscan
        </a>
        <WalletMultiButton />
      </div>
    );
  }

  // ── Eligible: show breakdown + claim button ──
  return (
    <div className={styles.claimCard}>
      <h2>You are eligible!</h2>
      <p className={styles.amount}>
        {formatAmount(displayData.amount!)} {TOKEN_SYMBOL}
      </p>
      {displayData.breakdown &&
        displayData.breakdown.length > 0 &&
        renderBreakdown(displayData.breakdown)}
      {!mockProofData && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className={`${styles.claimBtn} ${styles.claimBtnGreen}`}
        >
          {claiming ? "Claiming..." : "Claim Tokens"}
        </button>
      )}
      {mockProofData && (
        <button disabled className={styles.claimBtn}>
          Claim Tokens
        </button>
      )}
      {!mockProofData && <WalletMultiButton />}
    </div>
  );
};
