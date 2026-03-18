'use client';

import React, { useState } from 'react';
import { fetchDashboardStaking } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/context';

export default function StakingDashboardPage() {
  const { t } = useLanguage();
  const [stakingData, setStakingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liquidBalance, setLiquidBalance] = useState(2500); // Simulated liquid tokens
  const [frozenBalance, setFrozenBalance] = useState(5000); // Simulated frozen
  const [isFreezing, setIsFreezing] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);

  // Logical Constraints Simulation
  const stakingClosed = true; 
  const claimWindowOpen = false;

  React.useEffect(() => {
    fetchDashboardStaking().then(data => {
      setStakingData(data);
      setLoading(false);
    });
  }, []);

  if (loading || !stakingData) return <div className="glow-text-cyan">Loading...</div>;

  // Real-time calculations
  const totalStaked = 50000; 
  const userUnits = frozenBalance / 100;
  const totalUnits = 150; 

  const userStakingShare = (stakingData.staking_pool / 1000000) * (frozenBalance / totalStaked);
  const userVipShare = (stakingData.vip_pool / 1000000) * (userUnits / totalUnits);

  const handleStartStaking = () => {
    if (stakingClosed) return;
    setIsFreezing(true);
    setTimeout(() => {
        setFrozenBalance(prev => prev + liquidBalance);
        setLiquidBalance(0);
        setIsFreezing(false);
    }, 2000);
  };

  const handleClaim = () => {
    if (!claimWindowOpen || hasClaimed) return;
    setHasClaimed(true);
  };

  return (
    <div>
      <h2 className="glow-text-cyan" style={{ marginBottom: '30px' }}>{t('STAKING_DIVIDENDS')}</h2>

      <div className="stat-grid">
        <div className="data-panel" style={{ flex: 1.5 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>{t('STAKING_INFO')}</h3>
          <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{t('CYCLE_STATUS')}</p>
              <p className="glow-text-cyan" style={{ fontWeight: 'bold' }}>{t('ACTIVE')}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{t('CYCLE_END')}</p>
              <p style={{ fontWeight: 'bold' }}>30/09/2026</p>
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 'bold' }}>{t('PERIOD_PAYMENT')}</p>
              <p style={{ fontWeight: 'bold', color: 'var(--success)' }}>01/10/2026</p>
            </div>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: '75%' }}></div>
          </div>
        </div>
        <div className="data-panel" style={{ flex: 1, borderLeft: '2px solid var(--accent-gold)' }}>
           <p style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{t('NEXT_VIP_PAYMENT')}</p>
           <p className="glow-text-gold" style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '5px' }}>
             01/09/2026
           </p>
           <p style={{ fontSize: '0.6rem', color: 'var(--accent-gold)', opacity: 0.8, marginTop: '2px' }}>{t('MONTHLY_REBALANCE')}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.5fr) 1fr', gap: '30px', marginTop: '30px' }}>
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '25px' }}>{t('ASSET_DISTRIBUTION')}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            {/* Left Column: Balances (Stacked) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="stat-card" style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '35px 25px', 
                height: '160px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <p className="stat-label" style={{ marginBottom: '15px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('FROZEN_BALANCE')}</p>
                <p className="stat-value" style={{fontSize: '1.8rem'}}>{frozenBalance.toLocaleString()} SMDT</p>
              </div>
              <div className="stat-card" style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '35px 25px', 
                height: '160px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <p className="stat-label" style={{ marginBottom: '15px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('PARTICIPATION_UNITS')}</p>
                <p className="stat-value" style={{fontSize: '1.8rem'}}>{userUnits.toLocaleString()} UNITS</p>
              </div>
            </div>

            {/* Right Column: Earnings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="stat-card" style={{ 
                background: 'rgba(0,212,255,0.05)', 
                border: '1px solid rgba(0,212,255,0.2)', 
                padding: '35px 25px', 
                height: '160px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <p className="stat-label" style={{ color: 'var(--accent-cyan)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{t('STAKING_REVENUE')}</p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <p className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--accent-cyan)' }}>
                    {userStakingShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', opacity: 0.8, marginTop: '8px', textTransform: 'uppercase' }}>{t('QUARTERLY_POOL_SHARE')}</p>
                </div>
              </div>
              <div className="stat-card" style={{ 
                background: 'rgba(0,212,255,0.05)', 
                border: '1px solid rgba(0,212,255,0.2)', 
                padding: '35px 25px', 
                height: '160px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <p className="stat-label" style={{ color: 'var(--accent-gold)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{t('VIP_REVENUE')}</p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <p className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--accent-gold)' }}>
                    {userVipShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', opacity: 0.8, marginTop: '8px', textTransform: 'uppercase' }}>{t('MONTHLY_VIP_POOL_SHARE')}</p>
                </div>
              </div>
            </div>
          </div>

          {liquidBalance > 0 && (
            <div style={{ 
                padding: '20px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '8px', 
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h4 style={{fontSize: '0.9rem', color: stakingClosed ? 'var(--accent-pink)' : 'var(--accent-pink)', marginBottom: '5px', fontWeight: 'bold'}}>
                        {stakingClosed ? t('STAKING_CLOSED') : t('COMMENCE_STAKING')}
                    </h4>
                    <p style={{fontSize: '0.7rem', color: '#fff', opacity: 0.8}}>
                        {stakingClosed ? t('STAKING_CUTOFF_DESC') : t('START_STAKING_DESC')}
                    </p>
                    {!stakingClosed && <p style={{fontSize: '0.8rem', fontWeight: 'bold', marginTop: '5px', color: '#fff'}}>{t('LIQUID_BALANCE')}: {liquidBalance.toLocaleString()} SMDT</p>}
                </div>
                {!stakingClosed && (
                    <button 
                      onClick={handleStartStaking} 
                      disabled={isFreezing}
                      className="btn-premium" 
                      style={{ padding: '12px 25px', fontSize: '0.7rem', border: '1px solid var(--accent-pink)' }}
                    >
                      {isFreezing ? 'FREEZING...' : t('COMMENCE_STAKING')}
                    </button>
                )}
            </div>
          )}

          <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
             <h4 className="glow-text-gold" style={{fontSize: '0.8rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px'}}>VIP Pool Participation (5%)</h4>
             <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                <span style={{fontSize: '0.75rem', color: 'var(--accent-cyan)'}}>Global VIP Units (Circulation/100):</span>
                <span style={{fontWeight: 'bold', color: 'var(--accent-cyan)'}}>150 Units</span>
             </div>
             <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                <span style={{fontSize: '0.75rem', color: 'var(--accent-gold)'}}>Global VIP Pool Value:</span>
                <span style={{fontWeight: 'bold', color: 'var(--accent-gold)'}}>{(stakingData.vip_pool / 1000000).toLocaleString()} USDC</span>
             </div>
             <p style={{fontSize: '0.65rem', color: '#fff', opacity: 0.5, marginTop: '10px', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px'}}>
                *VIP rewards = (Your Units / Total VIP Units) * VIP Pool. Paid 12 times per year.
             </p>
          </div>

          <div style={{ marginTop: '25px' }}>
            <button 
                onClick={handleClaim}
                disabled={!claimWindowOpen || hasClaimed}
                className="btn-premium" 
                style={{ 
                    width: '100%', 
                    padding: '18px', 
                    fontSize: '1rem',
                    opacity: (!claimWindowOpen || hasClaimed) ? 0.3 : 1,
                    cursor: (!claimWindowOpen || hasClaimed) ? 'not-allowed' : 'pointer',
                    position: 'relative'
                }}
            >
                {hasClaimed ? <span className="glow-text-cyan">{t('ALREADY_CLAIMED')}</span> : (!claimWindowOpen ? <span>{t('REWARD_WINDOW_CLOSED')}</span> : t('CLAIM_DIVIDENDS'))}
            </button>
            {!claimWindowOpen && !hasClaimed && (
                <p style={{ fontSize: '0.65rem', color: 'var(--accent-pink)', textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>
                    {t('CLAIM_WINDOW_DESC')}
                </p>
            )}
          </div>
        </div>

        <div className="data-panel">
          <h3 style={{ fontSize: '1rem', marginBottom: '20px' }}>Protocol Staking Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Public Circulation Staked:</span>
              <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>15,000 SMDT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>Company Fixed Stake:</span>
              <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>35,000 SMDT</span>
            </div>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Total USDC in Staking Pool:</span>
              <span className="glow-text-cyan" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{(stakingData.staking_pool / 1000000).toLocaleString()} USDC</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>Total USDC in VIP Pool:</span>
              <span className="glow-text-gold" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{(stakingData.vip_pool / 1000000).toLocaleString()} USDC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
