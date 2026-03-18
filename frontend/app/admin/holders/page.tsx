import { fetchAdminHolders } from '@/lib/api';

export default async function AdminHoldersPage() {
  const holders = await fetchAdminHolders();

  const totalTokens = holders.reduce((acc: number, h: any) => acc + h.balance, 0);
  const stakedSupply = holders
    .filter((h: any) => h.status === 'Staked' || h.status === 'System') 
    .reduce((acc: number, h: any) => acc + h.balance, 0);
  
  // "Personas" refer to holders that are NOT the system/company
  const humanHolders = holders.filter((h: any) => h.status !== 'System').length;

  return (
    <div>
      <h2 className="glow-text-pink" style={{ marginBottom: '30px' }}>HOLDER DIRECTORY & BALANCES</h2>

      <div className="stat-grid" style={{marginBottom: '30px'}}>
        <div className="stat-card">
          <p className="stat-label">Total Human Holders</p>
          <p className="stat-value">{humanHolders}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Staked + System Supply</p>
          <p className="stat-value">{stakedSupply.toLocaleString()} SMDT</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Global Supply Check</p>
          <p className="stat-value" style={{color: totalTokens === 50000 ? 'var(--success)' : 'var(--accent-pink)'}}>
            {totalTokens.toLocaleString()} / 50,000
          </p>
          <p style={{ fontSize: '0.6rem', opacity: 0.4, marginTop: '5px' }}>
            *ACTIVE = Liquid in Wallet | STAKED = Locked for Rewards
          </p>
        </div>
      </div>

      <div className="data-panel">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,b255,255,0.1)', textAlign: 'left' }}>
              <th style={{ padding: '15px' }}>Wallet Address</th>
              <th style={{ padding: '15px' }}>Balance (SMDT)</th>
              <th style={{ padding: '15px' }}>% Share</th>
              <th style={{ padding: '15px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {holders.map((holder: any, index: number) => (
              <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '15px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                  {holder.wallet_address}
                </td>
                <td style={{ padding: '15px' }}>
                  {holder.balance.toLocaleString()}
                </td>
                <td style={{ padding: '15px' }}>
                  {holder.percentage}%
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.7rem',
                    background: holder.status === 'Staked' ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                    color: holder.status === 'Staked' ? 'var(--accent-cyan)' : '#fff'
                  }}>
                    {holder.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
