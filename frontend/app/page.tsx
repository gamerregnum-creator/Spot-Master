import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>REGNA <span className="glow-text-cyan">REVOLUTION</span></div>
        <nav className={styles.nav}>
          <a href="#about">Ecosystem</a>
          <a href="#investors">Investors</a>
          <a href="#marketplace">Marketplace</a>
          <button className="btn-premium">CONNECT WALLET</button>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className="glow-text-pink">The Next Frontier of <br />Hybrid Gaming</h1>
          <p>
            Experience the fusion of physical assets and digital ownership. 
            Powered by Solana, Built for the Revolution.
          </p>
          <div className={styles.heroActions}>
            <button className="btn-premium">EXPLORE NOW</button>
            <button className={`${styles.btnSecondary} glass-panel`}>VIEW PORTFOLIO</button>
          </div>
        </div>
        <div className={styles.heroVisual}>
          {/* Placeholder for 3D Asset or Scroll-Animation */}
          <div className={styles.assetPlaceholder}>
            <div className={styles.innerGlow}></div>
          </div>
        </div>
      </section>

      <div className={styles.starfield}></div>
    </main>
  );
}
