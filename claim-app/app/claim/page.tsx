"use client";

import Link from "next/link";
import { ClaimButton } from "@/components/ClaimButton";
import { CLAIM_DEADLINE, CLAWBACK_START_TS } from "@/lib/constants";
import styles from "./claim.module.css";

/* ── Token → sprite mapping ── */
const TOKEN_SPRITES: Record<string, string> = {
  MOODENG: "/moodeng1.png",
  PNUT: "/pnut1.png",
  CHILLGUY: "/chillguy1.png",
  WIF: "/wif1.png",
  POPCAT: "/popcat1.png",
  PENGU: "/pengu1.png",
  FARTCOIN: "/fartcoin1.png",
  GIGA: "/gigachad1.png",
  SPX: "/spx69001.png",
  BONK: "/bonk1.png",
};

export default function ClaimPage() {
  const now = Math.floor(Date.now() / 1000);
  const isExpired = now >= CLAWBACK_START_TS;

  /* Falling parachute coin positions */
  const fallingCoins = [
    { left: 5,  size: 120, rotate: -12, delay: 0,    duration: 8  },
    { left: 15, size: 90,  rotate: 8,   delay: 2.5,  duration: 10 },
    { left: 25, size: 140, rotate: -6,  delay: 1,    duration: 9  },
    { left: 35, size: 80,  rotate: 15,  delay: 4,    duration: 11 },
    { left: 45, size: 110, rotate: -10, delay: 0.5,  duration: 8.5 },
    { left: 55, size: 100, rotate: 7,   delay: 3,    duration: 10.5 },
    { left: 65, size: 130, rotate: -14, delay: 1.5,  duration: 9.5 },
    { left: 75, size: 84,  rotate: 11,  delay: 5,    duration: 12 },
    { left: 85, size: 116, rotate: -8,  delay: 2,    duration: 8  },
    { left: 92, size: 96,  rotate: 13,  delay: 3.5,  duration: 10 },
    { left: 10, size: 76,  rotate: -16, delay: 6,    duration: 11 },
    { left: 50, size: 144, rotate: 5,   delay: 7,    duration: 9  },
    { left: 80, size: 88,  rotate: -9,  delay: 4.5,  duration: 10 },
    { left: 30, size: 104, rotate: 12,  delay: 8,    duration: 12 },
    { left: 70, size: 72,  rotate: -5,  delay: 6.5,  duration: 11 },
  ];

  return (
    <div className={styles.page}>
      {/* Parallax background */}
      <div className={styles.bgSky} />
      <div className={styles.bgMountainsFar} />
      <div className={styles.bgMountainsClose} />

      {/* Falling parachute coins */}
      <div className={styles.fallingCoinsLayer}>
        {fallingCoins.map((coin, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src="/gold_coin_parachute.png"
            alt=""
            className={styles.fallingCoin}
            style={{
              left: `${coin.left}%`,
              width: `${coin.size}px`,
              height: `${coin.size}px`,
              transform: `rotate(${coin.rotate}deg)`,
              animationDelay: `${coin.delay}s`,
              animationDuration: `${coin.duration}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.bgOverlay} />
      <div className={styles.scanlines} />

      <div className={styles.content}>
        <Link href="/" className={styles.backLink}>
          &larr; Back to Home
        </Link>

        {/* Header */}
        <div className={styles.header}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_text.png"
            alt="Shitcoin Safari"
            className={styles.logo}
          />
          <h1 className={styles.title}>Token Airdrop</h1>
          <p className={styles.subtitle}>
            Claim your tokens if you held qualifying meme coins
          </p>
          <div
            className={`${styles.deadline} ${isExpired ? styles.deadlineExpired : ""}`}
          >
            {isExpired ? (
              <span>Claim period has ended</span>
            ) : (
              <span>
                Claim before: {CLAIM_DEADLINE}
              </span>
            )}
          </div>
        </div>

        {/* Claim area */}
        {isExpired ? (
          <div className={styles.expiredNotice}>
            <p>
              The claim window has closed. Unclaimed tokens have been returned to
              the treasury.
            </p>
          </div>
        ) : (
          <ClaimButton tokenSprites={TOKEN_SPRITES} />
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <p>
            Qualifying tokens: MOODENG, PNUT, CHILLGUY, WIF, POPCAT, PENGU,
            FARTCOIN, GIGA, SPX, BONK
          </p>
        </div>
      </div>
    </div>
  );
}
