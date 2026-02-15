"use client";

import { useState, useCallback } from "react";
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

const ALL_TOKENS = Object.keys(TOKEN_SPRITES);

const TIERS = [
  { label: "Off", value: "" },
  { label: "0.0001%-0.001%", value: "0.0001% - 0.001%" },
  { label: "0.001%-0.01%", value: "0.001% - 0.01%" },
  { label: "0.01%-0.1%", value: "0.01% - 0.1%" },
  { label: "0.1%-1%", value: "0.1% - 1%" },
  { label: "1%-10%", value: "1% - 10%" },
  { label: "10%+", value: "10%+" },
];

interface BreakdownEntry {
  token: string;
  tier: string;
  pct: number;
  points: number;
}

/* ── BEGIN TEST PANEL (remove this block when done) ── */
function TestPanel({
  holdings,
  onToggle,
  onReset,
}: {
  holdings: Record<string, string>;
  onToggle: (token: string, tier: string) => void;
  onReset: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.testPanel}>
      <div
        className={styles.testPanelHeader}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className={styles.testPanelTitle}>TEST PANEL</span>
        <button className={styles.testPanelToggle}>
          {collapsed ? "+" : "-"}
        </button>
      </div>
      {!collapsed && (
        <div className={styles.testPanelBody}>
          {ALL_TOKENS.map((token) => {
            const active = !!holdings[token];
            return (
              <div
                key={token}
                className={`${styles.testCoinRow} ${active ? styles.testCoinActive : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={TOKEN_SPRITES[token]}
                  alt={token}
                  className={styles.testCoinIcon}
                />
                <span className={styles.testCoinName}>{token}</span>
                <select
                  className={styles.testTierSelect}
                  value={holdings[token] || ""}
                  onChange={(e) => onToggle(token, e.target.value)}
                >
                  {TIERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <button className={styles.testResetBtn} onClick={onReset}>
            RESET ALL
          </button>
        </div>
      )}
    </div>
  );
}
/* ── END TEST PANEL ── */

export default function ClaimPage() {
  const now = Math.floor(Date.now() / 1000);
  const isExpired = now >= CLAWBACK_START_TS;

  /* ── BEGIN TEST STATE (remove this block when done) ── */
  const [testHoldings, setTestHoldings] = useState<Record<string, string>>({});

  const handleToggle = useCallback((token: string, tier: string) => {
    setTestHoldings((prev) => {
      const next = { ...prev };
      if (tier === "") {
        delete next[token];
      } else {
        next[token] = tier;
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => setTestHoldings({}), []);

  // Build mock breakdown from test panel selections
  const activeTokens = Object.entries(testHoldings).filter(([, tier]) => tier);
  const mockBreakdown: BreakdownEntry[] | undefined =
    activeTokens.length > 0
      ? activeTokens.map(([token, tier]) => ({
          token,
          tier,
          pct: parseTierMidpoint(tier),
          points: 100,
        }))
      : undefined;

  const mockProofData =
    mockBreakdown && mockBreakdown.length > 0
      ? {
          eligible: true,
          index: 0,
          amount: String(mockBreakdown.length * 1000000000),
          proof: [],
          points: mockBreakdown.length * 100,
          breakdown: mockBreakdown,
        }
      : undefined;
  /* ── END TEST STATE ── */

  return (
    <div className={styles.page}>
      {/* Parallax background */}
      <div className={styles.bgSky} />
      <div className={styles.bgMountainsFar} />
      <div className={styles.bgMountainsClose} />
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
          <ClaimButton
            tokenSprites={TOKEN_SPRITES}
            mockProofData={mockProofData}
          />
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <p>
            Qualifying tokens: MOODENG, PNUT, CHILLGUY, WIF, POPCAT, PENGU,
            FARTCOIN, GIGA, SPX, BONK
          </p>
        </div>
      </div>

      {/* ── BEGIN TEST PANEL RENDER (remove this line when done) ── */}
      <TestPanel
        holdings={testHoldings}
        onToggle={handleToggle}
        onReset={handleReset}
      />
      {/* ── END TEST PANEL RENDER ── */}
    </div>
  );
}

/** Parse a tier string to a representative midpoint percentage */
function parseTierMidpoint(tier: string): number {
  if (tier.includes("10%+")) return 15;
  const match = tier.match(/([\d.]+)%\s*-\s*([\d.]+)%/);
  if (match) return (parseFloat(match[1]) + parseFloat(match[2])) / 2;
  return 0.001;
}
