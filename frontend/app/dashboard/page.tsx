'use client';

import React, { useState, useEffect } from 'react';
import { fetchDashboardRevenue, fetchDashboardStaking, fetchDashboardReferrals } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/context';

export default function DashboardOverview() {
  const { t, locale } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCycleActive, setIsCycleActive] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    // Maintain language-specific ordering
    return locale === 'es' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  };

  useEffect(() => {
    Promise.all([
      fetchDashboardRevenue(),
      fetchDashboardStaking(),
      fetchDashboardReferrals(),
    ]).then(([revenue, staking, referrals]) => {
      setData({ revenue, staking, referrals });
      
      if (staking?.end_date) {
        const end = new Date(staking.end_date);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0) {
          // Ensure we don't exceed 88 days for display as requested
          setDaysRemaining(diffDays % 88); 
          setIsCycleActive(true);
        } else {
          setDaysRemaining(Math.abs(diffDays) % 88);
          setIsCycleActive(false);
        }
      }
      setLoading(false);
    });
  }, []);

  if (loading || !data) return <div className="glow-text-cyan">Loading...</div>;

  const { staking, referrals } = data;

  // Calculate dynamic progress
  const now = new Date();
  const start = new Date(staking.start_date);
  const end = new Date(staking.end_date);
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  // Dynamic Token Distribution (based on 50,000 total)
  const totalSupply = 50000;
  const distribution = [
    { label: t('RESERVED_COMPANY'), balance: 20000, pct: '40%' },
    { label: t('DONATIONS_FUND'), balance: 5000, pct: '10%' },
    { label: t('DEV_PROGRAMMING'), balance: 5000, pct: '10%' },
    { label: t('NEW_PROJECTS'), balance: 5000, pct: '10%' },
    { label: t('PUBLIC_CIRCULATION'), balance: 15000, pct: '30%', isPublic: true },
  ];

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
          <p className="stat-value">
            {staking ? (
              ((5000 / staking.total_staked) * (staking.total_usdc / 1000000) + 
               (50 / staking.global_vip_units) * (staking.vip_pool / 1000000))
              .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ) : '0'} USDC
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label" style={{ fontSize: '0.65rem' }}>
            {isCycleActive ? t('CYCLE_END_COUNTDOWN') : t('CYCLE_START_COUNTDOWN')}
          </p>
          <p className="stat-value">{daysRemaining} {t('DAYS_UNIT')}</p>
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
          <h3 className="glow-text-cyan" style={{ fontSize: '1.2rem', marginBottom: '25px' }}>{t('GLOBAL_POOLS')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{t('STAKING_POOL_ACC')}:</span>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{(staking.staking_pool / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
            </div>
            {/* Restored to single line with 1rem font as requested */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-5px' }}>
                <span style={{ fontSize: '1rem', color: '#00d4ff', fontWeight: '500' }}>{t('STAKING_BRIDGE_CONTRIB')}:</span>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                  {(staking.bridge_contribution / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                <span style={{ fontSize: '1rem', color: 'var(--accent-cyan)', fontWeight: '800' }}>{t('TOTAL_USDC_STAKING_POOL')}:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#00ffa3' }}>{(staking.total_usdc / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{t('VIP_POOL_ACC')}:</span>
                <span className="glow-text-gold" style={{ fontSize: '1rem', fontWeight: 'bold' }}>{(staking.vip_pool / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />
            <div className="progress-bar-container" style={{ marginTop: '0' }}>
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#fff', textAlign: 'center', marginTop: '10px', fontWeight: '500' }}>
                {t('QUARTER_ENDS')} {formatDate(staking.end_date)}
            </div>
          </div>
        </div>

        <div className="data-panel" style={{ borderLeft: '2px solid var(--accent-pink)' }}>
          <h3 className="glow-text-pink" style={{ fontSize: '1.2rem', marginBottom: '25px' }}>{t('TOKEN_DISTRIBUTION_TOTAL')}</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {distribution.map((item, idx) => (
                <li key={idx} style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '1rem', 
                  paddingTop: item.isPublic ? '10px' : '0',
                  color: item.isPublic ? 'var(--accent-gold)' : 'inherit',
                  fontWeight: item.isPublic ? 'bold' : 'normal'
                }}>
                  <span style={{color: item.isPublic ? 'var(--accent-gold)' : 'var(--accent-cyan)', fontWeight: '600'}}>{item.label}</span> 
                  <span style={{fontWeight: '700'}}>{item.balance.toLocaleString()} ({item.pct})</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
