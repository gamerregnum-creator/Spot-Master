'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';

interface ContractWallet {
  name: string;
  address: string;
  on_chain_balance: number;
  backend_balance: number;
}

interface RevenueData {
  total_revenue: number;
  bridge_total: number;
  pct_reserved: number;
  pct_public_airdrop: number;
  pct_projects: number;
  pct_donations: number;
  pct_dev_program: number;
  is_paused: boolean;
  wallets: ContractWallet[];
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
const POLL_MS = 30000;

// Percentage maps — fixed by protocol
const SPOT_PCT: Record<string, string> = {
  WALLET_GROUP_2_1: '10%',
  WALLET_GROUP_2_2: '20%',
  WALLET_GROUP_2_3: '5%',
  WALLET_GROUP_2_4: '20%',
  WALLET_GROUP_2_5: '10%',
  WALLET_GROUP_2_6: '30%',
  WALLET_GROUP_2_7: '5%',
};
const BRIDGE_PCT: Record<string, string> = {
  WALLET_GROUP_3_1: '100%',
  WALLET_GROUP_3_2: '25%',
  WALLET_GROUP_3_3: '75%',
};
const STAKING_PCT: Record<string, string> = {
  WALLET_GROUP_1_1: '40%',
  WALLET_GROUP_1_2: '10%',
  WALLET_GROUP_1_3: '10%',
  WALLET_GROUP_1_4: '10%',
  WALLET_GROUP_1_5: '30%',
};

export default function AdminContent({ revenue: initialRevenue }: { revenue: RevenueData }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'monitor'>('overview');

  // Overview state
  const [revenue] = useState<RevenueData>(initialRevenue);
  const [isPaused, setIsPaused] = useState(initialRevenue.is_paused);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Logs state
  const [revenueLogs, setRevenueLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Monitor state
  const [monitorData, setMonitorData] = useState<RevenueData | null>(null);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Change Holder Wallet modal
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletForm, setWalletForm] = useState({ user_id: '', old_wallet: '', new_wallet: '', reason: '' });
  const [walletStatus, setWalletStatus] = useState<{ ok?: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (tabParam === 'overview') setActiveTab('overview');
    else if (tabParam === 'logs') setActiveTab('logs');
    else if (tabParam === 'monitor') setActiveTab('monitor');
  }, [tabParam]);

  useEffect(() => {
    if (activeTab === 'logs' && revenueLogs.length === 0) loadLogs();
  }, [activeTab]);

  // Monitor polling — start when tab is active, stop when leaving
  const fetchMonitor = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dashboard/revenue`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RevenueData = await res.json();
      setMonitorData(json);
      setLastRefresh(new Date());
      setMonitorError(null);
    } catch (e: any) {
      setMonitorError(e.message);
    } finally {
      setMonitorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'monitor') {
      setMonitorLoading(true);
      fetchMonitor();
      pollRef.current = setInterval(fetchMonitor, POLL_MS);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [activeTab, fetchMonitor]);

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API}/admin/revenue-logs?limit=100`);
      const data = await res.json();
      setRevenueLogs(data.logs || []);
    } catch {
      setRevenueLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleTogglePause() {
    try {
      const res = await fetch(`${API}/admin/pause`, { method: 'POST' });
      const data = await res.json();
      setIsPaused(data.is_paused);
      setActionStatus(data.message);
      setTimeout(() => setActionStatus(null), 4000);
    } catch {
      setActionStatus('Error: could not reach backend');
    }
  }

  async function handleDistributeCompany() {
    try {
      const res = await fetch(`${API}/admin/distribute-company`, { method: 'POST' });
      const data = await res.json();
      setActionStatus(data.message);
      setTimeout(() => setActionStatus(null), 4000);
    } catch {
      setActionStatus('Error: could not reach backend');
    }
  }

  async function handleWalletUpdate(e: React.FormEvent) {
    e.preventDefault();
    setWalletStatus(null);
    try {
      const res = await fetch(`${API}/admin/holder/update-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setWalletStatus({ ok: false, msg: data.error || 'Update failed' });
      } else {
        setWalletStatus({ ok: true, msg: data.message });
        setWalletForm({ user_id: '', old_wallet: '', new_wallet: '', reason: '' });
      }
    } catch {
      setWalletStatus({ ok: false, msg: 'Network error' });
    }
  }

  const allocations = [
    { label: t('RESERVED_COMPANY'), value: revenue.pct_reserved || 4000, color: 'var(--accent-cyan)' },
    { label: t('PUBLIC_CIRCULATION'), value: revenue.pct_public_airdrop || 3000, color: 'var(--accent-pink)' },
    { label: t('NEW_PROJECTS'), value: revenue.pct_projects || 1000, color: 'var(--accent-gold)' },
    { label: t('DONATIONS_FUND'), value: revenue.pct_donations || 1000, color: 'var(--accent-pink)' },
    { label: t('DEV_PROGRAMMING'), value: revenue.pct_dev_program || 1000, color: 'var(--accent-cyan)' },
  ];

  const getLabel = (name: string) => {
    if (name === 'WALLET_GROUP_3_1') return t('TOTAL_BRIDGE_INCOME' as any)?.replace(/\s*\(Bridge\)/gi, '') || name;
    if (name.startsWith('WALLET_GROUP_')) return t(name as any) || name;
    const map: Record<string, string> = {
      'Staking Vault': t('STAKING_VAULT' as any) || name,
      'VIP Pool Vault': t('VIP_POOL_VAULT' as any) || name,
      'Referral System': t('REFERRAL_SYSTEM' as any) || name,
      'Torneo Wallet': t('TORNEO_WALLET' as any) || name,
      'National Pool': t('NATIONAL_POOL' as any) || name,
      'Ops Wallet': t('OPS_WALLET' as any) || name,
      'Promotion Fund': t('PROMOTION_FUND' as any) || name,
    };
    return map[name] || name;
  };

  const vipUnitsCount = (revenue.wallets || []).find(w => w.name === 'WALLET_GROUP_2_8')?.on_chain_balance ?? 0;

  const monitorWallets = monitorData?.wallets ?? [];
  const spot    = monitorWallets.filter(w => w.name.startsWith('WALLET_GROUP_2_') && w.name !== 'WALLET_GROUP_2_8');
  const bridge  = monitorWallets.filter(w => w.name.startsWith('WALLET_GROUP_3_'));
  const staking = monitorWallets.filter(w => w.name.startsWith('WALLET_GROUP_1_'));
  const totalMismatches = monitorWallets.filter(w => w.on_chain_balance !== w.backend_balance).length;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none',
  };

  const tabs = [
    { key: 'overview', label: t('REVENUE_ROUTER_CONTROLLER') || 'Overview' },
    { key: 'logs',     label: 'Revenue Logs' },
    { key: 'monitor',  label: 'Monitor' },
  ];

  return (
    <div className="admin-content">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
            padding: '8px 20px', borderRadius: '8px',
            border: activeTab === tab.key ? '1px solid rgba(255,45,120,0.5)' : '1px solid rgba(255,255,255,0.1)',
            background: activeTab === tab.key ? 'rgba(255,45,120,0.1)' : 'transparent',
            color: activeTab === tab.key ? 'var(--accent-pink)' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontWeight: activeTab === tab.key ? 'bold' : 'normal',
            fontSize: '0.85rem', textTransform: 'uppercase',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Action status banner */}
      {actionStatus && (
        <div style={{ marginBottom: '20px', padding: '12px 20px', borderRadius: '8px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
          {actionStatus}
        </div>
      )}

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <StatCard label={t('ACCRUED_REVENUE')} value={`${(revenue.total_revenue / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`} />
            <StatCard label={t('BRIDGE_REVENUE')} value={`${(revenue.bridge_total / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`} />
            <StatCard label={t('CONTRACT_STATUS')} value={isPaused ? t('CRITICAL_PAUSE') : t('OPERATIONAL')} valueColor={isPaused ? 'var(--accent-pink)' : 'var(--success)'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px' }}>
            <div style={{ padding: '25px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px' }}>
              <h3 style={{ marginBottom: '25px', fontSize: '1.1rem' }}>{t('CURRENT_ALLOCATION')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {allocations.map((item) => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.7 }}>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: 'bold' }}>{item.value / 100}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.value / 100}%`, background: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{t('WALLET_GROUP_2_8' as any)}</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '1.2rem' }}>{vipUnitsCount.toLocaleString()} UNITS</span>
              </div>
            </div>

            {/* Admin Actions */}
            <div style={{ padding: '25px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-pink)', marginBottom: '6px' }}>{t('ADMIN_ACTIONS')}</h3>

              <AdminButton
                label={isPaused ? '▶ RESUME CONTRACT' : '❄ FREEZE CONTRACT'}
                desc={isPaused ? 'Contract is FROZEN — all operations halted' : 'Emergency stop — freezes all contract operations'}
                gradient={isPaused ? 'linear-gradient(45deg, #00d4ff, #00ffa3)' : 'linear-gradient(45deg, #ff2d78, #7b2fff)'}
                onClick={handleTogglePause}
              />

              <AdminButton
                label="DISTRIBUTE COMPANY DIVIDENDS"
                desc="4/7 Company · 1/7 Donations · 1/7 Dev · 1/7 Reinvest"
                gradient="linear-gradient(45deg, #00ffa3, #00d4ff)"
                textColor="#0a0a1a"
                onClick={handleDistributeCompany}
              />

              <AdminButton
                label="CHANGE HOLDER WALLET"
                desc="Emergency wallet replacement (lost / hacked)"
                border="1px solid rgba(255,184,0,0.4)"
                textColor="var(--accent-gold)"
                onClick={() => setShowWalletModal(true)}
              />

              <AdminButton
                label="UPDATE PERCENTAGES (ON-CHAIN)"
                desc="Timelock 24h · Requires 2/2 admin multisig"
                disabled
              />

              <button onClick={() => setActiveTab('monitor')} style={{ padding: '11px', background: 'transparent', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '8px', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                VIEW MONITOR →
              </button>

              <button onClick={() => setActiveTab('logs')} style={{ padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                VIEW REVENUE LOGS →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── LOGS TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div style={{ padding: '25px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Revenue Distribution Logs</h3>
            <button onClick={loadLogs} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.8rem' }}>
              REFRESH
            </button>
          </div>
          {logsLoading ? (
            <p style={{ opacity: 0.5 }}>Loading...</p>
          ) : revenueLogs.length === 0 ? (
            <p style={{ opacity: 0.4, fontSize: '0.9rem' }}>No distribution events yet. They appear here after sales are processed via <code>/api/v1/revenue/distribute/:id</code>.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '520px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 15px', opacity: 0.6 }}>Reference ID</th>
                    <th style={{ padding: '12px 15px', opacity: 0.6 }}>Type</th>
                    <th style={{ padding: '12px 15px', opacity: 0.6, textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 15px', opacity: 0.6, textAlign: 'right' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueLogs.map((log: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 15px', fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.7 }}>{log.reference_id}</td>
                      <td style={{ padding: '12px 15px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.15)' }}>
                          {log.entry_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 15px', textAlign: 'right', color: '#00ffa3', fontWeight: 'bold' }}>${log.amount?.toFixed(4)}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right', opacity: 0.5, fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MONITOR TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'monitor' && (
        <div>
          {/* Monitor header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <h2 className="glow-text-cyan" style={{ margin: 0, fontSize: 'clamp(1rem, 3vw, 1.4rem)' }}>
              CONTRACT WALLET MONITOR
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
              {monitorError && (
                <span style={badge('rgba(255,45,120,0.15)', 'var(--accent-pink)', 'rgba(255,45,120,0.3)')}>
                  ✕ BACKEND OFFLINE
                </span>
              )}
              {!monitorError && totalMismatches > 0 && (
                <span style={badge('rgba(255,184,0,0.12)', 'var(--accent-gold)', 'rgba(255,184,0,0.3)')}>
                  ⚠ {totalMismatches} MISMATCH{totalMismatches > 1 ? 'ES' : ''}
                </span>
              )}
              {!monitorError && totalMismatches === 0 && (
                <span style={badge('rgba(0,255,163,0.08)', '#00ffa3', 'rgba(0,255,163,0.2)')}>
                  ✓ ALL SYNCED
                </span>
              )}
              <span style={{ fontSize: '0.72rem', opacity: 0.4 }}>
                {lastRefresh ? `↺ ${lastRefresh.toLocaleTimeString()}` : '...'}
              </span>
              <button onClick={fetchMonitor} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.78rem' }}>
                REFRESH
              </button>
              <LiveDot />
            </div>
          </div>

          {monitorLoading && !monitorData ? (
            <p style={{ color: 'var(--accent-cyan)', opacity: 0.6, fontSize: '0.9rem' }}>Loading Monitor...</p>
          ) : (
            <>
              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
                <MiniStat label="Total Revenue" value={`${((monitorData?.total_revenue ?? 0) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`} color="var(--accent-cyan)" />
                <MiniStat label="Bridge Total" value={`${((monitorData?.bridge_total ?? 0) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`} color="var(--accent-pink)" />
                <MiniStat label="Contract Status" value={monitorData?.is_paused ? 'FROZEN' : 'OPERATIONAL'} color={monitorData?.is_paused ? 'var(--accent-pink)' : 'var(--success)'} />
                <MiniStat label="Refresh Rate" value="30s" color="rgba(255,255,255,0.4)" />
              </div>

              <WalletSection
                title="Ecosistema Spot Master"
                subtitle="Distribución de Venta Directa — Mode 0 (100%)"
                wallets={spot}
                pctMap={SPOT_PCT}
                highlightVIP="WALLET_GROUP_2_7"
                getLabel={getLabel}
                t={t}
                accentColor="var(--accent-cyan)"
              />

              <WalletSection
                title="Bridge SECTOR"
                subtitle="Comisiones de Stores Afiliados → 75% Staking · 25% Promociones"
                wallets={bridge}
                pctMap={BRIDGE_PCT}
                getLabel={getLabel}
                t={t}
                accentColor="var(--accent-pink)"
              />

              <WalletSection
                title="Ecosistema Staking"
                subtitle="Distribución por proporción de tokens (40% · 10% · 10% · 10% · 30%)"
                wallets={staking}
                pctMap={STAKING_PCT}
                getLabel={getLabel}
                t={t}
                accentColor="var(--accent-gold)"
              />
            </>
          )}
        </div>
      )}

      {/* ── CHANGE WALLET MODAL ──────────────────────────────────────────────── */}
      {showWalletModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0e0e1a', border: '1px solid rgba(255,184,0,0.3)', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '520px', margin: '0 16px' }}>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '6px' }}>Change Holder Wallet</h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '24px' }}>
              Emergency operation. All balances and positions transfer to the new address. On-chain guardian action required to finalize.
            </p>
            <form onSubmit={handleWalletUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'user_id',    label: 'User ID',               placeholder: 'UUID of the holder' },
                { key: 'old_wallet', label: 'Current Wallet Address', placeholder: 'Current (lost / compromised) wallet' },
                { key: 'new_wallet', label: 'New Wallet Address',     placeholder: 'New wallet address' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase' }}>{label}</label>
                  <input style={inputStyle} placeholder={placeholder} value={(walletForm as any)[key]}
                    onChange={e => setWalletForm(f => ({ ...f, [key]: e.target.value }))} required />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase' }}>Reason / Justification</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
                  placeholder="e.g. Holder reported wallet compromised on 2026-03-20, identity verified via KYC"
                  value={walletForm.reason}
                  onChange={e => setWalletForm(f => ({ ...f, reason: e.target.value }))} required />
              </div>
              {walletStatus && (
                <p style={{ fontSize: '0.85rem', color: walletStatus.ok ? '#00ffa3' : 'var(--accent-pink)' }}>{walletStatus.msg}</p>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" style={{ flex: 1, padding: '13px', background: 'linear-gradient(45deg, #ffb800, #ff8c00)', border: 'none', borderRadius: '8px', color: '#0a0a1a', fontWeight: 'bold', cursor: 'pointer' }}>
                  CONFIRM WALLET CHANGE
                </button>
                <button type="button" onClick={() => { setShowWalletModal(false); setWalletStatus(null); }}
                  style={{ padding: '13px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #00ffa3; }
          50%       { opacity: 0.3; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function badge(bg: string, color: string, border: string): React.CSSProperties {
  return { padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', background: bg, color, border: `1px solid ${border}` };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
      <p style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '10px' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: valueColor }}>{value}</p>
    </div>
  );
}

function AdminButton({ label, desc, gradient, textColor, border, onClick, disabled }: {
  label: string; desc?: string; gradient?: string; textColor?: string;
  border?: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <div>
      {desc && <p style={{ fontSize: '0.72rem', opacity: 0.45, marginBottom: '6px', textTransform: 'uppercase' }}>{desc}</p>}
      <button onClick={onClick} disabled={disabled} style={{
        width: '100%', padding: '13px',
        background: gradient || 'transparent',
        border: border || 'none',
        borderRadius: '8px',
        color: textColor || '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 'bold', fontSize: '0.88rem', textTransform: 'uppercase',
        opacity: disabled ? 0.35 : 1,
      }}>
        {label}
      </button>
    </div>
  );
}

function LiveDot() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '6px', background: 'rgba(0,255,163,0.07)', border: '1px solid rgba(0,255,163,0.18)', fontSize: '0.78rem', color: '#00ffa3', fontWeight: 'bold' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ffa3', display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite' }} />
      LIVE
    </span>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>
      <p style={{ fontSize: '0.68rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '1rem', fontWeight: 'bold', color }}>{value}</p>
    </div>
  );
}

function WalletSection({ title, subtitle, wallets, pctMap, highlightVIP, getLabel, t, accentColor }: {
  title: string; subtitle: string;
  wallets: ContractWallet[]; pctMap: Record<string, string>;
  highlightVIP?: string; getLabel: (n: string) => string; t: any; accentColor: string;
}) {
  const fmt = (v: number) => (v / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = wallets.reduce((a, w) => ({ onChain: a.onChain + w.on_chain_balance, backend: a.backend + w.backend_balance }), { onChain: 0, backend: 0 });
  const allMatch = wallets.every(w => w.on_chain_balance === w.backend_balance);
  const mismatches = wallets.filter(w => w.on_chain_balance !== w.backend_balance).length;

  return (
    <div style={{ marginBottom: '28px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h3 style={{ margin: 0, fontSize: 'clamp(0.85rem, 2vw, 1rem)', color: accentColor }}>{title}</h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.72rem', opacity: 0.45 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={allMatch
            ? badge('rgba(0,255,163,0.08)', '#00ffa3', 'rgba(0,255,163,0.2)')
            : badge('rgba(255,45,120,0.1)', 'var(--accent-pink)', 'rgba(255,45,120,0.25)')
          }>
            {allMatch ? `✓ SYNCED (${wallets.length})` : `⚠ ${mismatches} MISMATCH`}
          </span>
          <span style={{ fontSize: '0.8rem', color: accentColor, fontWeight: 'bold', opacity: 0.8 }}>
            {fmt(total.onChain)} USDC
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(0.75rem, 1.5vw, 0.92rem)', minWidth: '580px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['WALLET', 'DIRECCIÓN', 'QUOTA %', 'ON-CHAIN', 'BACKEND', 'ESTADO'].map((h, i) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: i >= 2 ? 'center' : 'left', opacity: 0.5, fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wallets.map((w, i) => {
              const matched = w.on_chain_balance === w.backend_balance;
              const isVIP = w.name === highlightVIP;
              const rowColor = isVIP ? 'var(--accent-gold)' : 'inherit';
              return (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 14px', fontWeight: isVIP ? 'bold' : 500, color: rowColor, whiteSpace: 'nowrap' }}>
                    {getLabel(w.name)}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.45, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.address}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold', color: isVIP ? 'var(--accent-gold)' : accentColor }}>
                    {pctMap[w.name] ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold', color: isVIP ? 'var(--accent-gold)' : 'var(--accent-cyan)', whiteSpace: 'nowrap' }}>
                    {fmt(w.on_chain_balance)} USDC
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {fmt(w.backend_balance)} USDC
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold', whiteSpace: 'nowrap',
                      background: matched ? (isVIP ? 'rgba(255,184,0,0.1)' : 'rgba(0,212,255,0.1)') : 'rgba(255,45,120,0.1)',
                      color: matched ? (isVIP ? 'var(--accent-gold)' : 'var(--accent-cyan)') : 'var(--accent-pink)',
                      border: `1px solid ${matched ? (isVIP ? 'rgba(255,184,0,0.25)' : 'rgba(0,212,255,0.25)') : 'rgba(255,45,120,0.25)'}`,
                    }}>
                      {matched ? t('MATCHED') : t('MISMATCH')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <td colSpan={2} style={{ padding: '12px 14px', fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase' }}>TOTALES</td>
              <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.75rem', color: accentColor, fontWeight: 'bold' }}>100%</td>
              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold', color: '#00ffa3', whiteSpace: 'nowrap' }}>{fmt(total.onChain)} USDC</td>
              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold', color: '#00ffa3', whiteSpace: 'nowrap' }}>{fmt(total.backend)} USDC</td>
              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                <span style={allMatch
                  ? badge('rgba(0,255,163,0.08)', '#00ffa3', 'rgba(0,255,163,0.2)')
                  : badge('rgba(255,45,120,0.1)', 'var(--accent-pink)', 'rgba(255,45,120,0.25)')}>
                  {allMatch ? t('MATCHED') : t('MISMATCH')}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
