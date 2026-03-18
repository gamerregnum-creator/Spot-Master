import styles from "../page.module.css"; // Reuse some styles or create new ones

export default function InvestorPortal() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>INVESTOR <span className="glow-text-cyan">PORTAL</span></div>
        <button className="btn-premium">CONNECT WALLET</button>
      </header>

      <section className={styles.hero} style={{marginTop: '100px'}}>
        <div className="glass-panel" style={{padding: '40px', width: '100%', maxWidth: '800px', margin: '0 auto'}}>
          <h2 className="glow-text-cyan">Portfolio Overview</h2>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px'}}>
            <div className="glass-panel" style={{padding: '20px'}}>
              <p style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)'}}>TOTAL EARNINGS</p>
              <h3 style={{fontSize: '2rem', color: 'var(--accent-gold)'}}>1,250.45 USDC</h3>
            </div>
            <div className="glass-panel" style={{padding: '20px'}}>
              <p style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)'}}>STAKED SMDT</p>
              <h3 style={{fontSize: '2rem', color: 'var(--accent-cyan)'}}>50,000</h3>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
