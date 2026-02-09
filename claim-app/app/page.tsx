"use client";

import { ClaimButton } from "@/components/ClaimButton";

export default function Home() {
  return (
    <>
      <main>
        <div className="header">
          <h1>Token Airdrop</h1>
          <p>Claim your tokens if you held qualifying meme coins</p>
        </div>
        <ClaimButton />
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
