"use client";

import { useState } from "react";
import styles from "./landing.module.css";

const CONTRACT_ADDRESS = "9CSzePps7jLo4WjTXNxstAYkYfKxVFotbZJVrorApump";
const SHORT_ADDRESS =
  CONTRACT_ADDRESS.slice(0, 6) + "..." + CONTRACT_ADDRESS.slice(-6);

export default function Landing() {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(CONTRACT_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.background} />
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.heroGroup}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_text.png" alt="Shitcoin Safari" className={styles.logo} />
          <button className={styles.playBtn}>Play Now</button>
          <div className={styles.contractSection}>
            <span className={styles.contractCaption}>Get $SAFARI</span>
            <div className={styles.contractBar}>
              <span className={styles.contractLabel}>CA</span>
              <span className={styles.contractAddress}>{SHORT_ADDRESS}</span>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
                onClick={copyAddress}
              >
                {copied ? "COPIED!" : "COPY"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Meme character parade */}
      <div className={styles.paradeWrap}>
        <div className={styles.paradeTrack}>
          {[
            "chillguy1.png",
            "fartcoin1.png",
            "gigachad1.png",
            "popcat1.png",
            "wif1.png",
            "pengu1.png",
            "moodeng1.png",
            "pnut1.png",
            "chillguy1.png",
            "fartcoin1.png",
            "gigachad1.png",
            "popcat1.png",
            "wif1.png",
            "pengu1.png",
            "moodeng1.png",
            "pnut1.png",
          ].map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={`/${src}`}
              alt=""
              className={styles.paradeSprite}
            />
          ))}
        </div>
      </div>

      {/* Section 2: How it works */}
      <div className={styles.section2}>
        <h2 className={styles.section2Title}>
          A new way to engage with your favorite memecoins!
        </h2>

        <div className={styles.stepsGrid}>
          <div className={`${styles.stepCard} ${styles.stepBronze}`}>
            <span className={styles.stepBadge}>1</span>
            <div className={styles.stepImageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mainmenu.png"
                alt="Game menu"
                className={styles.stepImg}
              />
            </div>
            <div className={styles.stepText}>
              <h3 className={styles.stepHeading}>Choose SOL entry 🥉🥈🥇</h3>
              <p className={styles.stepSub}>
                There are three buy-in tiers: bronze (0.05 SOL), silver (0.5
                SOL), and gold (5 SOL). The higher the buy-in, the bigger the
                rewards.
              </p>
            </div>
          </div>

          <div className={`${styles.stepCard} ${styles.stepGrass}`}>
            <span className={styles.stepBadge}>2</span>
            <div className={styles.stepImageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/walking_grass.png"
                alt="Walking in tall grass"
                className={styles.stepImg}
              />
            </div>
            <div className={styles.stepText}>
              <h3 className={styles.stepHeading}>Search for Memes 🌿</h3>
              <p className={styles.stepSub}>
                Memes are hiding in the tall grass. You have 100 steps to walk
                through the tall grass and find them.
              </p>
            </div>
          </div>

          <div className={`${styles.stepCard} ${styles.stepCatch}`}>
            <span className={styles.stepBadge}>3</span>
            <div className={styles.stepImageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/net1.png"
                alt="Catching a meme"
                className={`${styles.stepImg} ${styles.stepImgContain}`}
              />
            </div>
            <div className={styles.stepText}>
              <h3 className={styles.stepHeading}>Catch them all! 🕸️</h3>
              <p className={styles.stepSub}>
                Once you encountered a meme, you want to try to catch it. You
                can shoot nets directly, or you can use bait or taunt to help
                you catch the meme.
              </p>
            </div>
          </div>

          <div className={`${styles.stepCard} ${styles.stepReward}`}>
            <span className={styles.stepBadge}>4</span>
            <div className={styles.stepImageWrap}>
              <div className={styles.rewardSprites}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/popcat1.png" alt="" className={styles.spriteIcon} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/wif1.png" alt="" className={styles.spriteIcon} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/pengu1.png" alt="" className={styles.spriteIcon} />
              </div>
            </div>
            <div className={styles.stepText}>
              <h3 className={styles.stepHeading}>Get rewarded 💰</h3>
              <p className={styles.stepSub}>
                The meme coins of all the memes you caught are sent directly to
                your wallet. The more you caught, the bigger your reward is.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.scanlines} />
    </div>
  );
}
