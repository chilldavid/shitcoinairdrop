"use client";

import { useState } from "react";
import styles from "./landing.module.css";

const CONTRACT_ADDRESS = "9CSzePps7jLo4WjTXNxstAYkYfKxVFotbZJVrorApump";

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
        </div>

        <div className={styles.contractSection}>
          <span className={styles.contractCaption}>Get $SAFARI</span>
          <div className={styles.contractBar}>
            <span className={styles.contractLabel}>CA</span>
            <span className={styles.contractAddress}>{CONTRACT_ADDRESS}</span>
            <button
              className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
              onClick={copyAddress}
            >
              {copied ? "COPIED!" : "COPY"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.scanlines} />
    </div>
  );
}
