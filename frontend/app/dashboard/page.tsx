'use client';

import React, { useState, useEffect } from 'react';
import { fetchDashboardRevenue, fetchDashboardStaking, fetchDashboardReferrals } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/context';

export default function DashboardOverview() {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchDashboardRevenue(),
      fetchDashboardStaking(),
      fetchDashboardReferrals(),
    ]).then(([revenue, staking, referrals]) => {
      setData({ revenue, staking, referrals });
      setLoading(false);
    });
  }, []);

  if (loading || !data) return <div className="glow-text-cyan">Loading...</div>;

  const { staking, referrals } = data;

  return (
    <div>
      <h2 className="glow-text-cyan" style={{ marginBottom: '30px' }}>{t('DASHBOARD_OVERVIEW')}</h2>
      
      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">{t('YOUR_FROZEN_TOKENS')}</p>
          <p className="stat-value">5,000 SMDT</p>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--accent-gold)' }}>
          <p className="stat-label">{t('PENDING_DIVIDENDS')}</p>
          <p className="stat-value">12,000 USDC</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('ACTIVE_MEMBERS')}</p>
          <p className="stat-value">{referrals.total_sponsors}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('PROTOCOL_STATUS')}</p>
          <p className="stat-value" style={{ color: 'var(--success)', fontSize: '1.2rem' }}>
            {t('OPERATIONAL')}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div className="data-panel">
          <h3 style={{ fontSize: '1rem', marginBottom: '20px' }}>{t('GLOBAL_POOLS')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{t('STAKING_POOL_ACC')}:</span>
                <span className="glow-text-cyan" style={{ fontWeight: 'bold' }}>{(staking.staking_pool / 1000000).toLocaleString()} USDC</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{t('VIP_POOL_ACC')}:</span>
                <span className="glow-text-gold" style={{ fontWeight: 'bold' }}>{(staking.vip_pool / 1000000).toLocaleString()} USDC</span>
            </div>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '5px' }}>
                {t('QUARTER_ENDS')} {new Date(staking.end_date).toLocaleDateString()}
            </div>
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>

        <div className="data-panel" style={{ borderLeft: '2px solid var(--accent-gold)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '20px' }}>{t('TOKEN_DISTRIBUTION_TOTAL')}</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <li style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem'}}>
                <span style={{color: 'var(--accent-cyan)', fontWeight: '600'}}>{t('RESERVED_COMPANY')}</span> 
                <span style={{fontWeight: '700'}}>20,000 (40%)</span>
             </li>
             <li style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem'}}>
                <span style={{color: 'var(--accent-cyan)', fontWeight: '600'}}>{t('DEV_PROGRAMMING')}</span> 
                <span style={{fontWeight: '700'}}>5,000 (10%)</span>
             </li>
             <li style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem'}}>
                <span style={{color: 'var(--accent-pink)', fontWeight: '600'}}>{t('DONATIONS_FUND')}</span> 
                <span style={{fontWeight: '700'}}>5,000 (10%)</span>
             </li>
             <li style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem'}}>
                <span style={{color: 'var(--accent-gold)', fontWeight: '600'}}>{t('NEW_PROJECTS')}</span> 
                <span style={{fontWeight: '700'}}>5,000 (10%)</span>
             </li>
             <li style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '5px'}}>
                <span style={{color: 'var(--accent-pink)', fontWeight: 'bold'}}>{t('Public Circulation + Airdrop & Bonuses')}</span> 
                <span style={{color: 'var(--accent-pink)', fontWeight: 'bold'}}>15,000 (30%)</span>
             </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
