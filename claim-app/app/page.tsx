"use client";

import { ClaimButton } from "@/components/ClaimButton";
import { CLAIM_DEADLINE, CLAWBACK_START_TS } from "@/lib/constants";

export default function Home() {
  const now = Math.floor(Date.now() / 1000);
  const isExpired = now >= CLAWBACK_START_TS;

  return (
    <>
      <main>
        <div className="header">
          <h1>Token Airdrop</h1>
          <p>Claim your tokens if you held qualifying meme coins</p>
          <div className="deadline">
            {isExpired ? (
              <span className="expired">Claim period has ended</span>
            ) : (
              <span>Claim before: <strong>{CLAIM_DEADLINE}</strong></span>
            )}
          </div>
        </div>
        {isExpired ? (
          <div className="expired-notice">
            <p>The claim window has closed. Unclaimed tokens have been returned to the treasury.</p>
          </div>
        ) : (
          <ClaimButton />
        )}
      </main>
      <footer className="footer">
        <p>
          Questions? Check if you held MOODENG, PNUT, CHILLGUY, WIF, POPCAT,
          PENGU, FARTCOIN, GIGA, SPX, or BONK at the snapshot.
        </p>
      </footer>
    </>
  );
}
