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
  const [autoStaking, setAutoStaking] = useState(false);

  React.useEffect(() => {
    fetchDashboardStaking().then(data => {
      setStakingData(data);
      setLoading(false);
    });
  }, []);

  if (loading || !stakingData) return <div className="glow-text-cyan">Loading...</div>;

  // Logical Constraints from Backend
  const stakingClosed = stakingData.staking_closed;
  const claimWindowOpen = stakingData.claim_window_open;

  // Date Formatting helper (UTC Precise)
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return t('LOCALE') === 'es' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  };

  // Progress Calculation
  const calculateProgress = (start: string, end: string) => {
    const now = new Date().getTime();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const total = e - s;
    const elapsed = now - s;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const stakingProgress = calculateProgress(stakingData.start_date, stakingData.end_date);

  // Real-time calculations
  const userUnits = frozenBalance / 100;
  const totalUnits = stakingData.global_vip_units;

  const userStakingShare = (stakingData.total_usdc / 1000000) * (frozenBalance / stakingData.total_staked);
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

  const handleToggleAutoStaking = () => {
    setAutoStaking(!autoStaking);
    // In real app: api.updateUserPreference({ auto_restake: !autoStaking })
  };

  const handleClaim = () => {
    if (!claimWindowOpen || hasClaimed) return;
    
    if (autoStaking) {
      // Auto-Freeze the rewards
      const totalReward = userStakingShare + userVipShare;
      setFrozenBalance(prev => prev + totalReward);
      // Conceptually they stay "claimed" but are moved to frozen
    }
    setHasClaimed(true);
  };

  return (
    <div>
      <h2 className="glow-text-cyan" style={{ marginBottom: '30px' }}>{t('STAKING_DIVIDENDS')}</h2>

      <div className="stat-grid" style={{ gap: '20px', marginBottom: '30px' }}>
        {/* Left Panel: Staking & Yield Info */}
        <div className="data-panel" style={{ flex: 1, padding: '25px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="glow-text-cyan" style={{ fontSize: '1.2rem', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('STAKING_INFO')}
          </h3>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{t('CYCLE_STATUS')}</p>
                <p className="glow-text-cyan" style={{ fontWeight: 'bold', fontSize: '1rem' }}>{t('ACTIVE')}</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{t('CYCLE_END')}</p>
                <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>{formatDate(stakingData.end_date)}</p>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold' }}>{t('PAY_DAY')}</p>
                <p style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '1rem' }}>{formatDate(stakingData.payment_date)}</p>
              </div>
            </div>
            <div className="progress-bar-container" style={{ height: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${stakingProgress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Right Panel: Rendimiento Pool VIP */}
        <div className="data-panel" style={{ flex: 1, borderLeft: '2px solid var(--accent-gold)', padding: '25px', display: 'flex', flexDirection: 'column' }}>
           <h3 className="glow-text-gold" style={{ fontSize: '1.2rem', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
             {t('VIP_POOL_YIELD')}
           </h3>
           <div style={{ position: 'relative', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{t('PARTICIPATION_STATUS')}</p>
                <p className={frozenBalance > 0 ? "glow-text-gold" : ""} style={{ fontWeight: 'bold', fontSize: '1rem', color: frozenBalance > 0 ? 'var(--accent-gold)' : '#ff2d78' }}>
                  {frozenBalance > 0 ? t('ACTIVE') : 'INACTIVO'}
                </p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{t('CYCLE_END')}</p>
                <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>{formatDate(stakingData.end_date)}</p>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold' }}>{t('PAY_DAY')}</p>
                <p style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '1rem' }}>{formatDate(stakingData.payment_date)}</p>
              </div>
            </div>
            <div className="progress-bar-container" style={{ height: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${stakingProgress}%`, background: 'linear-gradient(90deg, var(--accent-gold), #fff)' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.6fr) 1fr', gap: '30px', marginTop: '30px', alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 className="glow-text-cyan" style={{ fontSize: '1.3rem', marginBottom: '30px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('ASSET_DISTRIBUTION')}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            {/* Left Column: Balances (Stacked) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="stat-card" style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '20px 22px', 
                height: '110px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start'
              }}>
                <p className="stat-label" style={{ marginBottom: '10px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>{t('FROZEN_BALANCE')}</p>
                <p className="stat-value" style={{fontSize: '1.8rem'}}>{frozenBalance.toLocaleString()} SMDT</p>
              </div>
              <div className="stat-card" style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '20px 22px', 
                height: '110px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start'
              }}>
                <p className="stat-label" style={{ marginBottom: '10px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>{t('PARTICIPATION_UNITS')}</p>
                <p className="stat-value" style={{fontSize: '1.8rem'}}>{userUnits.toLocaleString()} {t('UNITS')}</p>
              </div>
            </div>

            {/* Right Column: Earnings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="stat-card" style={{ 
                background: 'rgba(0,212,255,0.05)', 
                border: '1px solid rgba(0,212,255,0.2)', 
                padding: '20px 22px', 
                height: '110px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start'
              }}>
                <p className="stat-label" style={{ color: 'var(--accent-cyan)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('STAKING_REVENUE')}</p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <p className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--accent-cyan)' }}>
                    {userStakingShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </p>
                </div>
              </div>
              <div className="stat-card" style={{ 
                background: 'rgba(0,212,255,0.05)', 
                border: '1px solid rgba(0,212,255,0.2)', 
                padding: '20px 22px', 
                height: '110px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start'
              }}>
                <p className="stat-label" style={{ color: 'var(--accent-gold)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('VIP_REVENUE')}</p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <p className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--accent-gold)' }}>
                    {userVipShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Auto-Staking Toggle */}
          <div style={{
            marginTop: '10px',
            padding: '20px',
            background: 'rgba(0,212,255,0.03)',
            border: '1px solid rgba(0,212,255,0.1)',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            boxShadow: autoStaking ? '0 0 15px rgba(0,212,255,0.1)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div>
              <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-cyan)', marginBottom: '4px', textTransform: 'uppercase' }}>
                {t('AUTO_STAKING')} 
                {autoStaking && <span className="glow-text-cyan" style={{ marginLeft: '10px', fontSize: '0.7rem' }}>[{t('EARN_REINVEST')}]</span>}
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t('AUTO_STAKING_DESC')}</p>
            </div>
            <div 
              onClick={handleToggleAutoStaking}
              style={{
                width: '60px',
                height: '30px',
                background: autoStaking ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                borderRadius: '15px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: autoStaking ? '0 0 20px var(--accent-cyan)' : 'none'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                background: '#fff',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: autoStaking ? '33px' : '3px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}></div>
            </div>
          </div>

          {liquidBalance > 0 && (
            <div style={{
              padding: '25px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--accent-pink)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {stakingClosed ? t('STAKING_CLOSED') : t('COMMENCE_STAKING')}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#fff', opacity: 0.8 }}>
                  {stakingClosed ? t('STAKING_CUTOFF_DESC') : t('START_STAKING_DESC')}
                </p>
                {!stakingClosed && <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '10px', color: '#fff' }}>{t('LIQUID_BALANCE')}: {liquidBalance.toLocaleString()} SMDT</p>}
              </div>
              {!stakingClosed && (
                <button
                  onClick={handleStartStaking}
                  disabled={isFreezing}
                  className="btn-premium"
                  style={{ padding: '15px 30px', fontSize: '0.85rem', border: '1px solid var(--accent-pink)' }}
                >
                  {isFreezing ? 'FREEZING...' : t('COMMENCE_STAKING')}
                </button>
              )}
            </div>
          )}

          <div style={{ marginTop: '30px' }}>
            <button
              onClick={handleClaim}
              disabled={!claimWindowOpen || hasClaimed}
              className="btn-premium"
              style={{
                width: '100%',
                padding: '22px',
                fontSize: '1.2rem',
                opacity: (!claimWindowOpen || hasClaimed) ? 0.3 : 1,
                cursor: (!claimWindowOpen || hasClaimed) ? 'not-allowed' : 'pointer',
                position: 'relative',
                fontWeight: 'bold'
              }}
            >
              {hasClaimed ? <span className="glow-text-cyan">{t('ALREADY_CLAIMED')}</span> : (!claimWindowOpen ? <span style={{fontSize: '1.15rem'}}>{t('REWARD_WINDOW_CLOSED')}</span> : t('CLAIM_DIVIDENDS'))}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="data-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--accent-cyan)' }}>{t('PROTOCOL_STAKING_STATS')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{t('PUBLIC_CIRCULATION_STAKED')}:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{stakingData.public_staked?.toLocaleString() || '0'} SMDT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{t('COMPANY_FIXED_STAKE')}:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{(stakingData.total_staked - stakingData.public_staked).toLocaleString()} SMDT</span>
              </div>
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{t('TOTAL_USDC_STAKING_POOL')}:</span>
                <span className="glow-text-cyan" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{(stakingData.total_usdc / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{t('TOTAL_USDC_VIP_POOL')}:</span>
                <span className="glow-text-gold" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{(stakingData.vip_pool / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
              </div>
            </div>
          </div>


          <div style={{ padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
             <h4 className="glow-text-gold" style={{fontSize: '1rem', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold'}}>{t('VIP_POOL_ACC')}</h4>
             <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontSize: '0.95rem', color: 'var(--accent-cyan)', fontWeight: '500'}}>{t('GLOBAL_VIP_UNITS')}:</span>
                    <span style={{fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-cyan)'}}>{stakingData.global_vip_units} {t('UNITS')}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontSize: '0.95rem', color: 'var(--accent-gold)', fontWeight: '500'}}>{t('GLOBAL_VIP_POOL_VALUE')}:</span>
                    <span style={{fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-gold)'}}>{(stakingData.vip_pool / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
                </div>
             </div>
            <p style={{fontSize: '0.85rem', color: '#fff', opacity: 0.6, marginTop: '20px', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px'}}>
               {t('VIP_REWARDS_NOTE')}
            </p>
          </div>

          {!claimWindowOpen && !hasClaimed && (
            <div style={{ padding: '15px', background: 'rgba(255,45,120,0.05)', border: '1px solid rgba(255,45,120,0.1)', borderRadius: '8px', marginTop: '10px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-pink)', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.4' }}>
                {t('CLAIM_WINDOW_DESC')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
