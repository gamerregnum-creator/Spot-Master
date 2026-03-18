import { fetchDashboardRevenue } from '@/lib/api';

export default async function RevenueDashboardPage() {
  const revenue = await fetchDashboardRevenue();

  const allocations = [
    { label: 'Reserved (Company)', value: revenue.pct_reserved || 4000, color: 'var(--accent-cyan)' },
    { label: 'Public Circulation + Airdrop & Bonuses', value: revenue.pct_public_airdrop || 3000, color: 'var(--accent-pink)' },
    { label: 'New Projects', value: revenue.pct_projects || 1000, color: 'var(--accent-gold)' },
    { label: 'Donations Fund', value: revenue.pct_donations || 1000, color: 'var(--accent-pink)' },
    { label: 'Dev & Programming', value: revenue.pct_dev_program || 1000, color: 'var(--accent-cyan)' },
  ];

  return (
    <div>
      <h2 className="glow-text-pink" style={{ marginBottom: '30px' }}>REVENUE ROUTER CONTROLLER</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Accrued Revenue</p>
          <p className="stat-value">{(revenue.total_revenue / 1000000).toLocaleString()} USDC</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Router Status</p>
          <p className={`stat-value ${revenue.is_paused ? 'glow-text-pink' : 'glow-text-cyan'}`} style={{fontSize: '1.2rem'}}>
            {revenue.is_paused ? 'CRITICAL PAUSE' : 'OPERATIONAL'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div className="data-panel">
            <h3 style={{ marginBottom: '25px' }}>Current Allocation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {allocations.map((item) => (
                    <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                            <span style={{opacity: 0.7}}>{item.label}</span>
                            <span style={{color: item.color, fontWeight: 'bold'}}>{item.value / 100}%</span>
                        </div>
                        <div className="progress-bar-container" style={{height: '4px', marginTop: '0'}}>
                            <div className="progress-bar-fill" style={{ width: `${item.value / 100}%`, background: item.color, boxShadow: `0 0 5px ${item.color}` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="glass-panel" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '20px', color: 'var(--accent-pink)' }}>Administrative Actions</h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '25px' }}>
                EMERGENCY STOP WILL HALT ALL PURCHASES AND RECHARGES THROUGH THE ROUTER CONTRACT. USE ONLY IN CASE OF SECRUITY BREACH.
            </p>
            
            <button className="btn-premium" style={{ width: '100%', padding: '15px', background: 'linear-gradient(45deg, #ff2d78, #7b2fff)', marginBottom: '15px' }}>
                {revenue.is_paused ? 'RESUME CONTRACT' : 'EMERGENCY PAUSE'}
            </button>
            <button className="sidebar-link" style={{ width: '100%', textAlign: 'center', borderColor: 'rgba(255,255,255,0.1)' }}>
                UPDATE PERCENTAGES
            </button>
        </div>
      </div>
    </div>
  );
}
