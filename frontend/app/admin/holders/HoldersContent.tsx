'use client';

import { useLanguage } from '@/lib/i18n/context';

interface Holder {
  wallet_address: string;
  label: string;
  type: string;
  balance: number;
  percentage: number;
  status: string;
}

interface HoldersContentProps {
  holders: Holder[];
}

export default function HoldersContent({ holders }: HoldersContentProps) {
  const { t } = useLanguage();

  const totalTokens = holders.reduce((acc, h) => acc + h.balance, 0);
  const stakedSupply = holders
    .filter((h) => h.status === 'Staked' || h.status === 'System') 
    .reduce((acc, h) => acc + h.balance, 0);
  
  const humanHolders = holders.filter((h) => h.type === 'Human').length;

  return (
    <div>
      <h2 className="glow-text-pink" style={{ marginBottom: '30px', textTransform: 'uppercase' }}>
        {t('HOLDER_DIRECTORY_TITLE')}
      </h2>

      <div className="stat-grid" style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="stat-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          <p className="stat-label" style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '10px' }}>
            {t('TOTAL_HUMAN_HOLDERS')}
          </p>
          <p className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{humanHolders}</p>
        </div>
        <div className="stat-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          <p className="stat-label" style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '10px' }}>
            {t('STAKED_SYSTEM_SUPPLY')}
          </p>
          <p className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stakedSupply.toLocaleString()} SMDT</p>
        </div>
        <div className="stat-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          <p className="stat-label" style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '10px' }}>
            {t('GLOBAL_SUPPLY_CHECK')}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <p className="stat-value" style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                color: totalTokens === 50000 ? 'var(--accent-cyan)' : 'var(--accent-pink)'
            }}>
                {totalTokens.toLocaleString()}
            </p>
            <span style={{ opacity: 0.4, fontSize: '1rem' }}>/ 50,000</span>
          </div>
          <p style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '8px', fontStyle: 'italic' }}>
            {t('HOLDER_LEGEND_NOTE')}
          </p>
        </div>
      </div>

      <div className="data-panel" style={{ padding: '25px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ width: '25%', padding: '15px', textAlign: 'left', opacity: 0.7, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {t('WALLET_ADDRESS_COL')}
              </th>
              <th style={{ width: '15%', padding: '15px', textAlign: 'center', opacity: 0.7, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {t('HOLDER_LABEL_COL')}
              </th>
              <th style={{ width: '10%', padding: '15px', textAlign: 'center', opacity: 0.7, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {t('HOLDER_TYPE_COL')}
              </th>
              <th style={{ width: '15%', padding: '15px', textAlign: 'center', opacity: 0.7, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {t('BALANCE_SMDT_COL')}
              </th>
              <th style={{ width: '15%', padding: '15px', textAlign: 'center', opacity: 0.7, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {t('SHARE_PERCENTAGE_COL')}
              </th>
              <th style={{ width: '20%', padding: '15px', textAlign: 'center', opacity: 0.7, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {t('STATUS_COL')}
              </th>
            </tr>
          </thead>
          <tbody>
            {holders.map((holder, index) => (
              <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="table-row-hover">
                <td style={{ padding: '15px', fontFamily: 'monospace', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                  {holder.wallet_address}
                </td>
                <td style={{ padding: '15px', textAlign: 'center', opacity: 0.8, fontSize: '0.9rem' }}>
                  {holder.label}
                </td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
                    background: holder.type === 'System' ? 'rgba(255,184,0,0.1)' : 'rgba(255,255,255,0.05)',
                    color: holder.type === 'System' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.6)',
                    border: holder.type === 'System' ? '1px solid rgba(255,184,0,0.2)' : '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {holder.type?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </td>
                <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                  {holder.balance.toLocaleString()}
                </td>
                <td style={{ padding: '15px', textAlign: 'center', opacity: 0.9 }}>
                  {holder.percentage}%
                </td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '6px 12px', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    background: holder.status === 'Staked' ? 'rgba(0, 212, 255, 0.15)' : (holder.status === 'System' ? 'rgba(255,184,0,0.15)' : 'rgba(255,255,255,0.05)'),
                    color: holder.status === 'Staked' ? 'var(--accent-cyan)' : (holder.status === 'System' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.6)'),
                    border: holder.status === 'Staked' ? '1px solid rgba(0, 212, 255, 0.3)' : (holder.status === 'System' ? '1px solid rgba(255,184,0,0.3)' : '1px solid rgba(255,255,255,0.1)')
                  }}>
                    {holder.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .table-row-hover:hover {
          background: rgba(255,255,255,0.02);
        }
      `}</style>
    </div>
  );
}
