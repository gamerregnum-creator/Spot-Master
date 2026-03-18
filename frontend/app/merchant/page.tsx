import styles from "../page.module.css";

export default function MerchantBackoffice() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>MERCHANT <span className="glow-text-pink">BACKOFFICE</span></div>
      </header>

      <section className={styles.hero} style={{marginTop: '100px'}}>
        <div className="glass-panel" style={{padding: '40px', width: '100%', maxWidth: '1000px', margin: '0 auto'}}>
          <h2 className="glow-text-pink">Active Orders</h2>
          <table style={{width: '100%', marginTop: '20px', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                <th style={{padding: '10px'}}>Order ID</th>
                <th style={{padding: '10px'}}>Status</th>
                <th style={{padding: '10px'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{padding: '10px'}}>#ORD-2023-001</td>
                <td style={{padding: '10px'}}><span style={{color: 'var(--accent-cyan)'}}>PENDING</span></td>
                <td style={{padding: '10px'}}><button className="btn-premium" style={{padding: '5px 10px', fontSize: '0.7rem'}}>PREPARE</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
