"use client";

import { useState, useCallback } from "react";
import styles from "./landing.module.css";

const CONTRACT_ADDRESS = "9CSzePps7jLo4WjTXNxstAYkYfKxVFotbZJVrorApump";
const SHORT_ADDRESS =
  CONTRACT_ADDRESS.slice(0, 6) + "..." + CONTRACT_ADDRESS.slice(-6);

const MEMES = [
  {
    img: "/moodeng1.png",
    name: "Moo Deng",
    desc: "The baby hippo that hippo-notized the world with her cuteness. One of the first big viral memecoin successes.",
    x: 10,
    y: 18,
  },
  {
    img: "/pnut1.png",
    name: "Peanut",
    desc: "The poor squirrel that was wrongly euthanised and which played a part in the 2024 U.S. elections, immortalised on the blockchain as one of the most successful memecoins.",
    x: 62,
    y: 8,
  },
  {
    img: "/chillguy1.png",
    name: "Chill Guy",
    desc: "A simple cartoon dog that broke the internet and redefined what virality means. Kicked off an onchain TikTok meta and onboarded more than a 100,000 new users to crypto.",
    x: 50,
    y: 82,
  },
  {
    img: "/wif1.png",
    name: "Dog Wif Hat",
    desc: "One of the most impactful memecoins which fully cemented Solana as the memecoin chain. The hat stays on.",
    x: 33,
    y: 42,
  },
  {
    img: "/pengu1.png",
    name: "Pengu",
    desc: "The ETH NFT collection turned global brand knew that Solana was the place to launch their coin and instantly became a household name in the memecoin space.",
    x: 82,
    y: 62,
  },
  {
    img: "/popcat1.png",
    name: "Popcat",
    desc: "The leading cat meme that finally gave proper representation of cats in a world full of dog-themed cryptocoins. It also pops.",
    x: 40,
    y: 60,
  },
  {
    img: "/bonk1.png",
    name: "BONK",
    desc: "Some say it was the coin that saved Solana. In the darkest of times, this dog with his baseball bat was airdropped to every Solana user.",
    x: 75,
    y: 22,
  },
  {
    img: "/spx69001.png",
    name: "SPX6900",
    desc: "Not exactly a pure Solana meme, but iconic nonetheless. With Murad at the head and an army of anime waifu pfps, this community aims to flip the stock market some day.",
    x: 18,
    y: 52,
  },
  {
    img: "/gigachad1.png",
    name: "Giga Chad",
    desc: "A bunch of bodybuilding chads made their way to the blockchain and tokenized this iconic meme.",
    x: 55,
    y: 32,
  },
  {
    img: "/fartcoin1.png",
    name: "Fart Coin",
    desc: "The world\u2019s oldest meme that can be understood without saying a word. This ridiculous sounding memecoin made its impact on the world as the silliest investment one can make.",
    x: 12,
    y: 78,
  },
];

export default function Landing() {
  const [copied, setCopied] = useState(false);
  const [activeMeme, setActiveMeme] = useState<number | null>(null);

  const toggleMeme = useCallback((index: number) => {
    setActiveMeme((prev) => (prev === index ? null : index));
  }, []);

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
            "bonk1.png",
            "spx69001.png",
            "chillguy1.png",
            "fartcoin1.png",
            "gigachad1.png",
            "popcat1.png",
            "wif1.png",
            "pengu1.png",
            "moodeng1.png",
            "pnut1.png",
            "bonk1.png",
            "spx69001.png",
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
                src="/catch.png"
                alt="Catching a meme"
                className={styles.stepImg}
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

      {/* Section 3: Meet our Memes */}
      <div className={styles.section3Memes}>
        <h2 className={styles.memesTitle}>Meet our Memes</h2>
        <p className={styles.memesSubtitle}>
          The first collection consists of the 10 most impactful memes on Solana
        </p>

        {/* Interactive map */}
        <div className={styles.mapContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/map_1x.png"
            alt="Safari map"
            className={styles.mapImage}
          />
          <div className={styles.mapOverlay} />

          {MEMES.map((meme, i) => (
            <div
              key={i}
              className={`${styles.mapMeme} ${activeMeme === i ? styles.mapMemeActive : ""}`}
              style={{ left: `${meme.x}%`, top: `${meme.y}%` }}
              onClick={() => toggleMeme(i)}
              onMouseEnter={() => setActiveMeme(i)}
              onMouseLeave={() => setActiveMeme(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meme.img}
                alt={meme.name}
                className={styles.mapMemeSprite}
              />
              <div className={`${styles.mapTooltip} ${meme.x > 60 ? styles.tooltipLeft : ""}`}>
                <h4 className={styles.tooltipName}>{meme.name}</h4>
                <p className={styles.tooltipDesc}>{meme.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.memesBottom}>
          What memes should we add in our next season? Let us know!
        </p>
      </div>

      {/* Section 4: Bonus Rewards */}
      <div className={styles.section3}>
        <h2 className={styles.section3Title}>Bonus Rewards</h2>

        <div className={styles.bonusGrid}>
          <div className={`${styles.bonusCard} ${styles.bonusLeft}`}>
            <div className={styles.bonusScreenshotWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/collection_screenshot.png"
                alt="Collection screenshot"
                className={styles.bonusScreenshot}
              />
            </div>
            <h3 className={styles.bonusHeading}>Catch them all</h3>
            <p className={styles.bonusSub}>
              Every time you catch all 10 memes, you can hand in your collection
              for a $SAFARI prize. You can repeat this again and again.
            </p>
            <p className={styles.bonusSub}>
              The collection rewards are higher in the higher buy-in tiers.
            </p>
          </div>

          <div className={`${styles.bonusCard} ${styles.bonusRight}`}>
            <div className={styles.bonusScreenshotWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/frenzy_screenshot.png"
                alt="Frenzy mode screenshot"
                className={styles.bonusScreenshot}
              />
            </div>
            <h3 className={styles.bonusHeading}>Frenzy Mode</h3>
            <p className={styles.bonusSub}>
              Every game you start has a chance to spawn a Frenzy Shard. If you
              see it, walk over it to collect it. Mind your step count though!
            </p>
            <p className={styles.bonusSub}>
              Collect three Frenzy shards within the day and you&apos;ll get
              access to the Frenzy zone where you can catch as many memes as
              you can in one minute.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.scanlines} />
    </div>
  );
}
