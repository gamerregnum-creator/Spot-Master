import { fetchDashboardReferrals } from '@/lib/api';

export default async function ReferralDashboardPage() {
  const referrals = await fetchDashboardReferrals();

  return (
    <div>
      <h2 className="glow-text-pink" style={{ marginBottom: '30px' }}>REFERRAL SYSTEM AUDIT</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Active Sponsors</p>
          <p className="stat-value">{referrals.total_sponsors}</p>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--accent-gold)' }}>
          <p className="stat-label">Rewards Distributed</p>
          <p className="stat-value">{(referrals.total_rewards_distributed / 1000000).toLocaleString()} USDC</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">System Status</p>
          <p style={{ color: referrals.is_paused ? 'var(--accent-pink)' : 'var(--success)', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {referrals.is_paused ? 'PAUSED' : 'ACTIVE'}
          </p>
        </div>
      </div>

      <div className="data-panel">
        <h3 style={{ fontSize: '1rem', marginBottom: '25px' }}>Top Sponsors</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '15px 10px', opacity: 0.6 }}>Wallet</th>
                    <th style={{ padding: '15px 10px', opacity: 0.6 }}>Referrals</th>
                    <th style={{ padding: '15px 10px', opacity: 0.6 }}>Total Earned</th>
                    <th style={{ padding: '15px 10px', opacity: 0.6, textAlign: 'right' }}>Status</th>
                </tr>
            </thead>
            <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '15px 10px', fontFamily: 'monospace' }}>
                            7xV...{i}f2
                        </td>
                        <td style={{ padding: '15px 10px' }}>{20 - i * 3}</td>
                        <td style={{ padding: '15px 10px', color: 'var(--accent-gold)' }}>
                            {(500 - i * 50).toLocaleString()} USDC
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'right', color: 'var(--success)' }}>
                            Active
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '30px', display: 'flex', gap: '20px' }}>
          <button className="btn-premium" style={{ flex: 1, padding: '12px' }}>
              REGISTER NEW SPONSOR
          </button>
          <button className="sidebar-link" style={{ flex: 1, textAlign: 'center', borderColor: 'rgba(255,255,255,0.1)' }}>
              VIEW ALL REFERRALS
          </button>
      </div>
    </div>
  );
}
